/**
 * GET /r/[code]
 *
 * Resolves a short review link and redirects to the full personalized review URL.
 * Keeps base64-encoded customer params server-side so the WhatsApp message stays clean.
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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('review_short_links')
            .select('product_handle, customer_name, customer_whatsapp')
            .eq('code', code)
            .maybeSingle();

        if (error || !data) {
            const base = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com';
            return NextResponse.redirect(new URL('/', base));
        }

        // Build the full review URL on the reviews subdomain
        const reviewsBase = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com';
        const reviewUrl = new URL(`${reviewsBase}/${data.product_handle}`);

        if (data.customer_name) {
            reviewUrl.searchParams.set('n', btoa(encodeURIComponent(data.customer_name)));
        }
        if (data.customer_whatsapp) {
            reviewUrl.searchParams.set('p', btoa(encodeURIComponent(data.customer_whatsapp)));
        }

        return NextResponse.redirect(reviewUrl, { status: 302 });
    } catch (err) {
        console.error('[GET /r/[code]] Unexpected error:', err);
        const fallback = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com';
        return NextResponse.redirect(new URL('/', fallback));
    }
}
