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
