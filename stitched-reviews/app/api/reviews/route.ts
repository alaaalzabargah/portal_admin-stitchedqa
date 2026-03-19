/**
 * POST /api/reviews
 *
 * Accepts a customer review submission.
 * Automatic triage: rating 4-5 → PUBLISHED, rating 1-3 → NEEDS_ATTENTION
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase credentials');
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

function determineReviewStatus(rating: number): 'NEEDS_ATTENTION' | 'PUBLISHED' {
    return rating >= 4 ? 'PUBLISHED' : 'NEEDS_ATTENTION';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productHandle, productTitle, customerName, customerWhatsapp, rating, reviewText } = body;

        if (!productHandle || typeof productHandle !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid productHandle' }, { status: 400 });
        }
        if (!productTitle || typeof productTitle !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid productTitle' }, { status: 400 });
        }
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
        }

        const status = determineReviewStatus(rating);
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('reviews')
            .insert({
                product_handle: productHandle.trim(),
                product_title: productTitle.trim(),
                customer_name: customerName?.trim().split(' ')[0] || null,
                customer_whatsapp: customerWhatsapp?.trim() || null,
                rating: Math.round(rating),
                review_text: reviewText?.trim() || null,
                status,
            })
            .select('id, status')
            .single();

        if (error) {
            console.error('[POST /api/reviews] Database error:', error.message);
            return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            review: { id: data.id, status: data.status },
        }, { status: 201 });

    } catch (err) {
        console.error('[POST /api/reviews] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
