/**
 * GET /api/reviews/public?handle={productHandle}
 *
 * Public endpoint for the Shopify storefront. Returns published reviews
 * and computed stats for a single product. Safe to call cross-origin
 * from the Shopify theme — no customer PII (no phone numbers) is returned.
 *
 * Response shape:
 *   {
 *     handle: string,
 *     stats: {
 *       avg: number,
 *       count: number,
 *       distribution: { "1": n, "2": n, "3": n, "4": n, "5": n }
 *     } | null,   // null when no published reviews exist
 *     reviews: Array<{
 *       id: string,
 *       customer_name: string | null,
 *       rating: number,
 *       review_text: string | null,
 *       created_at: string,
 *     }>
 *   }
 *
 * Shopify integration:
 *   fetch('https://your-admin-domain.com/api/reviews/public?handle={{ product.handle }}')
 *     .then(r => r.json())
 *     .then(data => { ... render stars + reviews ... })
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allow any origin — Shopify themes are served from *.myshopify.com
// and custom domains. Adjust to your specific storefront domain in production.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning',
    // Cache for 60 seconds on CDN / browser — reviews don't change every second
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
    const handle = request.nextUrl.searchParams.get('handle')?.trim()

    if (!handle) {
        return NextResponse.json(
            { error: 'Missing required query param: handle' },
            { status: 400, headers: CORS_HEADERS }
        )
    }

    try {
        const supabase = getServiceClient()

        // Select only public-safe fields — deliberately omit customer_whatsapp
        const { data, error } = await supabase
            .from('reviews')
            .select('id, customer_name, rating, review_text, created_at')
            .eq('product_handle', handle)
            .eq('status', 'PUBLISHED')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[GET /api/reviews/public] DB error:', error.message)
            return NextResponse.json(
                { error: 'Failed to fetch reviews' },
                { status: 500, headers: CORS_HEADERS }
            )
        }

        const reviews = data ?? []

        // Compute stats in a single pass
        let sum = 0
        const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        for (const r of reviews) {
            sum += r.rating
            distribution[String(r.rating)]++
        }

        const stats = reviews.length > 0
            ? {
                avg: parseFloat((sum / reviews.length).toFixed(1)),
                count: reviews.length,
                distribution,
            }
            : null

        // Strip to first name only for customer privacy
        const safeReviews = reviews.map(r => ({
            ...r,
            customer_name: r.customer_name?.split(' ')[0] ?? null,
        }))

        return NextResponse.json(
            { handle, stats, reviews: safeReviews },
            { headers: CORS_HEADERS }
        )
    } catch (err) {
        console.error('[GET /api/reviews/public] Unexpected error:', err)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: CORS_HEADERS }
        )
    }
}

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) throw new Error('Missing Supabase credentials')
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}
