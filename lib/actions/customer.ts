'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteCustomer(customerId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId)

        if (error) {
            console.error('Error deleting customer:', error)
            return { success: false, error: 'Failed to delete customer' }
        }

        revalidatePath('/customers')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function deleteCustomers(customerIds: string[]) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .in('id', customerIds)

        if (error) {
            console.error('Error deleting customers:', error)
            return { success: false, error: 'Failed to delete customers' }
        }

        revalidatePath('/customers')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function searchCustomers(query: string) {
    const supabase = await createClient()

    try {
        const customersMap = new Map()

        // 1. Search by name or phone
        let dbQuery = supabase
            .from('customers')
            .select('id, full_name, phone')
            .order('created_at', { ascending: false })
            .limit(10)

        if (query) {
            dbQuery = dbQuery.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        }

        const { data: nameData, error: nameError } = await dbQuery

        if (nameError) {
            console.error('Error searching customers by name/phone:', nameError)
        } else if (nameData) {
            nameData.forEach(c => customersMap.set(c.id, c))
        }

        // 2. Search by order number
        if (query && customersMap.size < 10) {
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('customer_id')
                .ilike('shopify_order_number', `%${query}%`)
                .limit(10)

            if (orderError) {
                console.error('Error searching orders by order_number:', orderError)
            } else if (orderData && orderData.length > 0) {
                const customerIdsToFetch = orderData
                    .map(o => o.customer_id)
                    .filter(id => id && !customersMap.has(id))

                if (customerIdsToFetch.length > 0) {
                    const { data: extraCustomers, error: extraError } = await supabase
                        .from('customers')
                        .select('id, full_name, phone')
                        .in('id', customerIdsToFetch)
                        .limit(10 - customersMap.size)

                    if (extraError) {
                        console.error('Error fetching extra customers:', extraError)
                    } else if (extraCustomers) {
                        extraCustomers.forEach(c => customersMap.set(c.id, c))
                    }
                }
            }
        }

        return { success: true, data: Array.from(customersMap.values()) }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'An unexpected error occurred', data: [] }
    }
}
