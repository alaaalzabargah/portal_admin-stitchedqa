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

        // Calculate the remaining amount that the customer just paid
        const remainingAmountMinor = (order.total_amount_minor || 0) - (order.paid_amount_minor || 0)

        if (remainingAmountMinor <= 0) {
            console.warn('Remaining amount is 0, but order is not marked paid.')
            // We'll still mark it paid, just won't add to spend
        }

        // 2. Update the Order
        const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
                financial_status: 'paid',
                paid_amount_minor: order.total_amount_minor // Now fully paid
            })
            .eq('id', orderId)

        if (updateOrderError) {
            console.error('Error updating order:', updateOrderError)
            return { success: false, error: 'Failed to update order status' }
        }

        // 3. Update the Customer's Total Spend
        // Note: The database has a trigger `trigger_recalculate_tiers` on loyalty_tiers
        // but we need to run an RPC or just let an external cron do it, OR the logic is simple enough here:
        // Actually, the trigger might recalculate *ALL* tiers when loyalty_tiers is modified.
        // It does NOT auto-recalculate when total_spend_minor changes unless we call it.
        // But updating `total_spend_minor` is the required first step.
        if (remainingAmountMinor > 0 && customerId) {
            // Fetch current customer spend
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('total_spend_minor')
                .eq('id', customerId)
                .single()

            if (!customerError && customer) {
                const newSpend = (customer.total_spend_minor || 0) + remainingAmountMinor

                // Update spend
                const { error: updateCustomerError } = await supabase
                    .from('customers')
                    .update({ total_spend_minor: newSpend })
                    .eq('id', customerId)

                if (updateCustomerError) {
                    console.error('Error updating customer spend:', updateCustomerError)
                } else {
                    // Call the RPC to recalculate tier for JUST this customer if possible, 
                    // or call the global recalculator. 
                    // Looking at `007_rpc_recalc.sql` and `005_auto...` there is `recalculate_all_customer_tiers`.
                    // We can just rely on the frontend fetching the new tier dynamically (which it already does!)
                    // `currentTier = tiers.find(t => lifetimeValue >= t.min_spend_minor)`
                }
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
