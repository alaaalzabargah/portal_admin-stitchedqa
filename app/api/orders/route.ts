/**
 * Orders API Endpoint
 * 
 * GET /api/orders - List orders with filtering
 * 
 * Query params:
 * - status: Filter by order status (pending, paid, shipped, completed, cancelled, returned)
 * - q: Search by order number or customer email
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - source: Filter by source (shopify, whatsapp, website, walk_in)
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
        const q = searchParams.get('q');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const source = searchParams.get('source');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build query
        let query = supabase
            .from('orders')
            .select(`
                id,
                external_id,
                shopify_order_id,
                shopify_order_number,
                source,
                status,
                financial_status,
                fulfillment_status,
                currency,
                total_amount_minor,
                subtotal_minor,
                total_tax_minor,
                total_shipping_minor,
                paid_amount_minor,
                notes,
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
        if (status) {
            query = query.eq('status', status);
        }

        if (source) {
            query = query.eq('source', source);
        }

        if (from) {
            query = query.gte('created_at', from);
        }

        if (to) {
            query = query.lte('created_at', to);
        }

        if (q) {
            // Search by shopify order number or customer email
            query = query.or(`shopify_order_number.ilike.%${q}%,customers.email.ilike.%${q}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Orders API error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform data for API response
        const orders = (data || []).map((order: any) => ({
            id: order.id,
            externalId: order.external_id,
            shopifyOrderId: order.shopify_order_id,
            orderNumber: order.shopify_order_number,
            source: order.source,
            status: order.status,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            currency: order.currency,
            totalAmount: (order.total_amount_minor || 0) / 100,
            subtotal: (order.subtotal_minor || 0) / 100,
            totalTax: (order.total_tax_minor || 0) / 100,
            totalShipping: (order.total_shipping_minor || 0) / 100,
            paidAmount: (order.paid_amount_minor || 0) / 100,
            notes: order.notes,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            customer: order.customers ? {
                id: order.customers.id,
                fullName: order.customers.full_name,
                email: order.customers.email,
                phone: order.customers.phone,
            } : null,
        }));

        return NextResponse.json({
            orders,
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        });

    } catch (err) {
        console.error('Orders API exception:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
