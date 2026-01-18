/**
 * Single Order API Endpoint
 * 
 * GET /api/orders/:shopify_order_id - Get order with items, refunds, and timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ shopify_order_id: string }> }
) {
    try {
        const { shopify_order_id } = await params;
        const supabase = await createClient();

        // Get order with customer
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                customers (
                    id,
                    full_name,
                    email,
                    phone,
                    notes,
                    status_tier,
                    tags
                )
            `)
            .or(`external_id.eq.${shopify_order_id},shopify_order_id.eq.${shopify_order_id}`)
            .single();

        if (orderError || !order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Get order items
        const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true });

        // Get refunds
        const { data: refunds } = await supabase
            .from('shopify_refunds')
            .select('*')
            .eq('shopify_order_id', shopify_order_id)
            .order('created_at', { ascending: false });

        // Get timeline events
        const { data: events } = await supabase
            .from('shopify_order_events')
            .select('*')
            .eq('shopify_order_id', shopify_order_id)
            .order('occurred_at', { ascending: false });

        // Calculate totals
        const refundedAmount = (refunds || []).reduce(
            (sum, r) => sum + (r.refund_amount_minor || 0),
            0
        );
        const netPaid = (order.paid_amount_minor || 0) - refundedAmount;

        // Transform response
        const response = {
            order: {
                id: order.id,
                externalId: order.external_id,
                shopifyOrderId: order.shopify_order_id,
                orderNumber: order.shopify_order_number,
                source: order.source,
                status: order.status,
                financialStatus: order.financial_status,
                fulfillmentStatus: order.fulfillment_status,
                currency: order.currency,
                totalAmount: order.total_amount_minor / 100,
                subtotal: (order.subtotal_minor || 0) / 100,
                totalTax: (order.total_tax_minor || 0) / 100,
                totalShipping: (order.total_shipping_minor || 0) / 100,
                paidAmount: (order.paid_amount_minor || 0) / 100,
                refundedAmount: refundedAmount / 100,
                netPaid: netPaid / 100,
                shippingAddress: order.shipping_address,
                notes: order.notes,
                createdAt: order.created_at,
                updatedAt: order.updated_at,
            },
            customer: order.customers ? {
                id: order.customers.id,
                fullName: order.customers.full_name,
                email: order.customers.email,
                phone: order.customers.phone,
                notes: order.customers.notes,
                tier: order.customers.status_tier,
                tags: order.customers.tags,
            } : null,
            items: (items || []).map(item => ({
                id: item.id,
                productName: item.product_name,
                variantTitle: item.variant_title,
                sku: item.sku,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPrice: item.unit_price_minor / 100,
                measurements: item.measurements,
            })),
            refunds: (refunds || []).map(refund => ({
                id: refund.id,
                shopifyRefundId: refund.shopify_refund_id,
                amount: (refund.refund_amount_minor || 0) / 100,
                reason: refund.reason,
                note: refund.note,
                refundedAt: refund.refunded_at,
            })),
            timeline: (events || []).map(event => ({
                id: event.id,
                eventType: event.event_type,
                topic: event.topic,
                metadata: event.metadata,
                occurredAt: event.occurred_at,
            })),
        };

        return NextResponse.json(response);

    } catch (err) {
        console.error('Single order API exception:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
