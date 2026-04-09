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
        //    Keep was_deposit=true so historical deposit tracking is preserved
        const { error: updateOrderError } = await supabase
            .from('orders')
            .update({
                financial_status: 'paid',
                status: 'paid',
                paid_amount_minor: order.total_amount_minor, // Now fully paid
                was_deposit: true, // Ensure flag is preserved
                deposit_paid_at: new Date().toISOString(), // Track when deposit was collected
            })
            .eq('id', orderId)

        if (updateOrderError) {
            console.error('Error updating order:', updateOrderError)
            return { success: false, error: 'Failed to update order status' }
        }

        // 3. Recalculate the Customer's Total Spend using the single source of truth
        if (customerId) {
            const { updateCustomerStats } = await import('@/lib/webhooks/shopify/data-layer');
            // Passing a dummy logger since it's currently used for webhooks, but we don't need one here
            const dummyLogger = {
                info: console.log,
                warn: console.warn,
                error: console.error,
                validationFailed: console.error
            };
            await updateCustomerStats(customerId, dummyLogger as any);
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

