'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server Action to recalculate all customer tiers and refresh pages
 */
export async function recalculateCustomerTiersAction() {
    const supabase = await createClient()

    const { error } = await supabase.rpc('recalculate_all_customer_tiers')

    if (error) {
        console.error('[Settings] Error recalculating tiers:', error.message)
        return { success: false, error: error.message }
    }

    // Revalidate customer pages
    revalidatePath('/customers')
    revalidatePath('/customers/[id]', 'page')

    return { success: true }
}
