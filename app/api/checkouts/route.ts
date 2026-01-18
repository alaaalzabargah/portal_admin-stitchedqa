/**
 * Checkouts API Endpoint
 * 
 * GET /api/checkouts - List checkouts with filtering
 * 
 * Query params:
 * - status: Filter by completion status (pending, completed)
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - q: Search by email or customer name
 * - limit: Max results (default 50, max 100)
 * - offset: Pagination offset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Parse query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const q = searchParams.get('q');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build query
        let query = supabase
            .from('shopify_checkouts')
            .select(`
                id,
                shopify_checkout_id,
                email,
                full_name,
                phone,
                currency,
                subtotal_minor,
                total_tax_minor,
                total_shipping_minor,
                total_price_minor,
                abandoned_checkout_url,
                completed_at,
                created_at,
                updated_at,
                customers (
                    id,
                    full_name,
                    email,
                    phone
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (status === 'completed') {
            query = query.not('completed_at', 'is', null);
        } else if (status === 'pending' || status === 'abandoned') {
            query = query.is('completed_at', null);
        }

        if (from) {
            query = query.gte('created_at', from);
        }

        if (to) {
            query = query.lte('created_at', to);
        }

        if (q) {
            query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Checkouts API error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform data for API response
        const checkouts = (data || []).map((checkout: any) => ({
            id: checkout.id,
            shopifyCheckoutId: checkout.shopify_checkout_id,
            email: checkout.email,
            fullName: checkout.full_name,
            phone: checkout.phone,
            currency: checkout.currency,
            subtotal: (checkout.subtotal_minor || 0) / 100,
            totalTax: (checkout.total_tax_minor || 0) / 100,
            totalShipping: (checkout.total_shipping_minor || 0) / 100,
            totalPrice: (checkout.total_price_minor || 0) / 100,
            abandonedCheckoutUrl: checkout.abandoned_checkout_url,
            status: checkout.completed_at ? 'completed' : 'abandoned',
            completedAt: checkout.completed_at,
            createdAt: checkout.created_at,
            updatedAt: checkout.updated_at,
            customer: checkout.customers ? {
                id: checkout.customers.id,
                fullName: checkout.customers.full_name,
                email: checkout.customers.email,
                phone: checkout.customers.phone,
            } : null,
        }));

        return NextResponse.json({
            checkouts,
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        });

    } catch (err) {
        console.error('Checkouts API exception:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
