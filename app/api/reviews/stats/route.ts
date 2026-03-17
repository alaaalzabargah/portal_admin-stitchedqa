/**
 * GET /api/reviews/stats
 *
 * Returns per-product rating stats computed from PUBLISHED reviews only.
 * Used by the admin dashboard (/marketing/reviews) to show rating badges
 * next to each Shopify product.
 *
 * Response shape:
 *   {
 *     stats: {
 *       [productHandle]: {
 *         product_title: string
 *         avg: number        // e.g. 4.3
 *         count: number      // total published reviews for this product
 *         distribution: {    // count per star level
 *           "1": number, "2": number, "3": number, "4": number, "5": number
 *         }
 *       }
 *     }
 *   }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        const supabase = getServiceClient()

        // Fetch only the columns we need — no customer PII
        const { data, error } = await supabase
            .from('reviews')
            .select('product_handle, product_title, rating')
            .eq('status', 'PUBLISHED')

        if (error) {
            console.error('[GET /api/reviews/stats] DB error:', error.message)
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
        }

        // O(N) single-pass aggregation — no re-scanning per product
        const statsMap: Record<string, {
            product_title: string
            sum: number
            count: number
            distribution: Record<string, number>
        }> = {}

        for (const r of (data ?? [])) {
            if (!statsMap[r.product_handle]) {
                statsMap[r.product_handle] = {
                    product_title: r.product_title,
                    sum: 0,
                    count: 0,
                    distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
                }
            }
            statsMap[r.product_handle].sum += r.rating
            statsMap[r.product_handle].count++
            statsMap[r.product_handle].distribution[String(r.rating)]++
        }

        // Derive avg from sum/count, then strip internal sum field
        const stats: Record<string, {
            product_title: string
            avg: number
            count: number
            distribution: Record<string, number>
        }> = {}

        for (const [handle, s] of Object.entries(statsMap)) {
            stats[handle] = {
                product_title: s.product_title,
                avg: parseFloat((s.sum / s.count).toFixed(1)),
                count: s.count,
                distribution: s.distribution,
            }
        }

        return NextResponse.json({ stats })
    } catch (err) {
        console.error('[GET /api/reviews/stats] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
