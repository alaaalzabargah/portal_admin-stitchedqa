'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStoreSettings() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single()
        
    if (error) {
        console.error('Failed to get store settings:', error)
        return null
    }
    
    return data
}

export async function updateStoreSettings(delayMinutes: number, enabled: boolean) {
    const supabase = await createClient()

    // Authorization check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Your session has expired. Please refresh the page and log in again.' }
    }

    const { data: userData, error: userError } = await supabase
        .from('portal_users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userError || !userData) {
        return { success: false, error: 'Your account was not found in the portal. Contact your administrator to ensure your user profile exists.' }
    }

    if (!['owner', 'admin', 'moderator'].includes(userData.role)) {
        return { success: false, error: `Your role "${userData.role}" does not have permission to change automation settings. Only Owner, Admin, and Moderator roles can update this.` }
    }

    // Fetch the actual row ID to target the correct settings row
    const { data: existing, error: fetchError } = await supabase
        .from('store_settings')
        .select('id')
        .limit(1)
        .single()

    if (fetchError || !existing) {
        return { success: false, error: 'Store settings have not been initialized. Run the database migration to create the default settings row.' }
    }

    const { error } = await supabase
        .from('store_settings')
        .update({
            whatsapp_review_delay_minutes: delayMinutes,
            whatsapp_automation_enabled: enabled,
            updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

    if (error) {
        console.error('Failed to update store settings:', error)
        if (error.code === '42501' || error.message?.includes('policy')) {
            return { success: false, error: 'Database permission denied. Your role must be added to the Row Level Security policy on the store_settings table. Ask your database admin to update the RLS policy.' }
        }
        return { success: false, error: `Failed to save: ${error.message}` }
    }
    
    revalidatePath('/marketing/reviews/automations')
    return { success: true }
}

export async function getAutomationQueue() {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id, 
            shopify_order_number, 
            customer_id, 
            wa_review_status, 
            wa_scheduled_for,
            customers!inner(full_name, phone)
        `)
        .neq('wa_review_status', 'none')
        .order('wa_scheduled_for', { ascending: false })
        .limit(100)
        
    if (error) {
        console.error('Failed to fetch automation queue:', error)
        return []
    }
    
    return data || []
}
