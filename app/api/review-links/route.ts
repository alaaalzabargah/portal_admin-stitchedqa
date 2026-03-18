/**
 * POST /api/review-links
 *
 * Creates a short link for a personalized review URL.
 * Returns a short code that redirects to /review/[handle]?n=...&p=...
 * This avoids sending long base64 URLs in WhatsApp messages.
 *
 * Body: { productHandle, customerName?, customerWhatsapp? }
 * Returns: { code }  — client constructs the full short URL as `${origin}/r/${code}`
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Missing Supabase credentials');
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function generateCode(length = 7): string {
    // lowercase alphanumeric — easy to read, hard to guess
    const chars = '0123456789abcdefghjkmnpqrstuvwxyz'; // removed ambiguous i, l, o
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productHandle, customerName, customerWhatsapp } = body;

        if (!productHandle || typeof productHandle !== 'string') {
            return NextResponse.json({ error: 'productHandle is required' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // Generate a unique code (retry up to 5 times on collision — astronomically rare)
        let code = generateCode();
        for (let i = 0; i < 5; i++) {
            const { data: existing } = await supabase
                .from('review_short_links')
                .select('code')
                .eq('code', code)
                .maybeSingle();
            if (!existing) break;
            code = generateCode();
        }

        const { error } = await supabase
            .from('review_short_links')
            .insert({
                code,
                product_handle: productHandle,
                customer_name: customerName?.trim() || null,
                customer_whatsapp: customerWhatsapp?.trim() || null,
            });

        if (error) {
            console.error('[POST /api/review-links] DB error:', error.message);
            return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
        }

        return NextResponse.json({ code });
    } catch (err) {
        console.error('[POST /api/review-links] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
