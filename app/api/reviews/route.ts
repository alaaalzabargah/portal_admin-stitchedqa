/**
 * POST /api/reviews
 * 
 * Accepts a customer review submission from the public review page.
 * Implements automatic triage based on the rating:
 *   - Rating 4-5 → status: PUBLISHED (auto-approved for storefront)
 *   - Rating 1-3 → status: NEEDS_ATTENTION (requires admin moderation)
 * 
 * Expected payload:
 *   {
 *     productHandle:    string    (Shopify product handle)
 *     productTitle:     string    (product name for admin display)
 *     customerName:     string?   (optional customer name)
 *     customerWhatsapp: string?   (optional WhatsApp number for triage)
 *     rating:           number    (1-5 integer from semantic Heart Scale)
 *     reviewText:       string?   (optional customer feedback)
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── GET Handler — fetch all non-archived reviews (for moderation dashboard) ─

export async function GET() {
    try {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .neq('status', 'ARCHIVED')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[GET /api/reviews] Database error:', error.message);
            return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
        }

        return NextResponse.json({ reviews: data ?? [] });
    } catch (err) {
        console.error('[GET /api/reviews] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ── DELETE Handler — clear all reviews (admin use only, clears test data) ───

export async function DELETE() {
    try {
        const supabase = getServiceClient();

        const { error } = await supabase
            .from('reviews')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // match-all trick

        if (error) {
            console.error('[DELETE /api/reviews] Database error:', error.message);
            return NextResponse.json({ error: 'Failed to delete reviews' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/reviews] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ── Supabase Service Client ────────────────────────────────────────────────

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

// ── Rating-to-Label Map (for reference) ────────────────────────────────────
//
// 1 = "Not This Time"
// 2 = "Wanted To Love It"
// 3 = "It's Lovely"
// 4 = "I Adore It"
// 5 = "Stole My Heart ♡"

// ── Triage Logic ───────────────────────────────────────────────────────────

function determineReviewStatus(rating: number): 'NEEDS_ATTENTION' | 'PUBLISHED' {
    // High ratings (4-5) are auto-approved for the storefront
    if (rating >= 4) return 'PUBLISHED';

    // Lower ratings (1-3) are flagged for admin review / triage
    return 'NEEDS_ATTENTION';
}

// ── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // 1. Parse and validate the incoming payload
        const body = await request.json();
        const { productHandle, productTitle, customerName, customerWhatsapp, rating, reviewText } = body;

        // Validate required fields
        if (!productHandle || typeof productHandle !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid productHandle' },
                { status: 400 }
            );
        }

        if (!productTitle || typeof productTitle !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid productTitle' },
                { status: 400 }
            );
        }

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'Rating must be an integer between 1 and 5' },
                { status: 400 }
            );
        }

        // 2. Determine status via triage logic
        const status = determineReviewStatus(rating);

        // 3. Insert the review into the database
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
            console.error('[POST /api/reviews] Database error:', error.message, error.details, error.hint);
            return NextResponse.json(
                { error: 'Failed to save review', detail: error.message, hint: error.hint },
                { status: 500 }
            );
        }

        // 4. Return success response
        console.log(
            `[POST /api/reviews] Review saved: id=${data.id}, ` +
            `product="${productTitle}", rating=${rating}, status=${status}`
        );

        return NextResponse.json({
            success: true,
            review: {
                id: data.id,
                status: data.status,
            },
            message: status === 'PUBLISHED'
                ? 'Review auto-approved and published to storefront.'
                : 'Review flagged for admin moderation.',
        }, { status: 201 });

    } catch (err) {
        console.error('[POST /api/reviews] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
