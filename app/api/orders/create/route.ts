/**
 * Create Manual Order API
 * Creates an order and updates customer stats (total_spend, order_count, tier)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CreateOrderRequest {
    customer_id: string
    total_amount_minor: number
    currency?: string
    status?: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'returned'
    notes?: string
    items?: Array<{
        product_name: string
        variant_title?: string
        size?: string
        color?: string
        quantity: number
        price_minor: number
    }>
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body: CreateOrderRequest = await request.json()

        if (!body.customer_id) {
            return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
        }

        if (!body.total_amount_minor || body.total_amount_minor <= 0) {
            return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
        }

        // 1. Create the order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_id: body.customer_id,
                source: 'walk_in',
                status: body.status || 'paid',
                currency: body.currency || 'QAR',
                total_amount_minor: body.total_amount_minor,
                notes: body.notes || null
            })
            .select('id')
            .single()

        if (orderError) {
            console.error('[Orders] Failed to create order:', orderError)
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
        }

        // 2. Insert order items if provided
        if (body.items && body.items.length > 0) {
            const orderItems = body.items.map(item => ({
                order_id: order.id,
                product_name: item.product_name,
                variant_title: item.variant_title || null,
                size: item.size || null,
                color: item.color || null,
                quantity: item.quantity,
                unit_price_minor: item.price_minor
            }))

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
            if (itemsError) {
                console.error('[Orders] Failed to insert order items:', itemsError)
            }
        }

        // 3. Update customer stats
        // Fetch current stats
        const { data: customer } = await supabase
            .from('customers')
            .select('total_spend_minor, order_count')
            .eq('id', body.customer_id)
            .single()

        if (customer) {
            const newTotalSpend = (customer.total_spend_minor || 0) + body.total_amount_minor
            const newOrderCount = (customer.order_count || 0) + 1

            // Calculate new tier based on spend
            const { data: tiers } = await supabase
                .from('loyalty_tiers')
                .select('name, min_spend_minor')
                .order('min_spend_minor', { ascending: false })

            let newTier = 'Bronze'
            if (tiers) {
                for (const tier of tiers) {
                    if (newTotalSpend >= tier.min_spend_minor) {
                        newTier = tier.name
                        break
                    }
                }
            }

            // Update customer
            await supabase
                .from('customers')
                .update({
                    total_spend_minor: newTotalSpend,
                    order_count: newOrderCount,
                    status_tier: newTier
                })
                .eq('id', body.customer_id)
        }

        return NextResponse.json({
            success: true,
            order_id: order.id,
            message: 'Order created successfully'
        })

    } catch (error) {
        console.error('[Orders] Error creating order:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
