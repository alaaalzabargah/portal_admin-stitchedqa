'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markDepositAsPaid(orderId: string, customerId: string) {
    try {
        const supabase = await createClient()

        // 1. Fetch current order to get amounts
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, total_amount_minor, paid_amount_minor, financial_status')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            console.error('Error fetching order:', orderError)
            return { success: false, error: 'Failed to fetch order details' }
        }

        if (order.financial_status === 'paid') {
            return { success: false, error: 'Order is already marked as fully paid' }
        }

        // 2. Update the Order — mark as fully paid with the full order amount
        const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
                financial_status: 'paid',
                status: 'paid',
                paid_amount_minor: order.total_amount_minor // Now fully paid
            })
            .eq('id', orderId)

        if (updateOrderError) {
            console.error('Error updating order:', updateOrderError)
            return { success: false, error: 'Failed to update order status' }
        }

        // 3. Recalculate the Customer's Total Spend from ALL paid orders
        // Instead of adding just the remaining delta (which was only the shipping amount),
        // we recalculate the total from scratch by summing all paid orders.
        if (customerId) {
            const { data: allPaidOrders } = await supabase
                .from('orders')
                .select('total_amount_minor')
                .eq('customer_id', customerId)
                .eq('financial_status', 'paid')

            let totalFromOrders = 0
            if (allPaidOrders) {
                for (const o of allPaidOrders) {
                    totalFromOrders += (o.total_amount_minor || 0)
                }
            }

            // Get the Shopify-reported spend (may be higher due to historical orders not in our DB)
            const { data: customer } = await supabase
                .from('customers')
                .select('shopify_total_spend_minor')
                .eq('id', customerId)
                .single()

            const shopifySpend = customer?.shopify_total_spend_minor || 0
            const finalSpend = Math.max(totalFromOrders, shopifySpend)

            // Determine tier based on spend
            const { data: tiers } = await supabase
                .from('loyalty_tiers')
                .select('name, min_spend_minor')
                .order('min_spend_minor', { ascending: false })

            let newTier = 'Guest'
            if (tiers && tiers.length > 0) {
                for (const tier of tiers) {
                    if (finalSpend >= tier.min_spend_minor) {
                        newTier = tier.name
                        break
                    }
                }
                // If below all tiers, use the lowest
                if (newTier === 'Guest') {
                    newTier = tiers[tiers.length - 1].name
                }
            }

            // Update customer with recalculated spend and tier
            const { error: updateCustomerError } = await supabase
                .from('customers')
                .update({
                    total_spend_minor: finalSpend,
                    status_tier: newTier,
                })
                .eq('id', customerId)

            if (updateCustomerError) {
                console.error('Error updating customer spend:', updateCustomerError)
            }
        }

        // Revalidate the customer details page so the new status shows up immediately
        revalidatePath(`/customers/${customerId}`)
        revalidatePath('/customers') // And the main list

        return { success: true }

    } catch (error) {
        console.error('Error in markDepositAsPaid:', error)
        return { success: false, error: 'Internal server error' }
    }
}

