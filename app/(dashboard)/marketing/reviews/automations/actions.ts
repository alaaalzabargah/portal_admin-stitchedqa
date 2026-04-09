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

/**
 * Get eligible orders that haven't been sent a review request yet.
 * These are fulfilled orders with customers that have phone numbers.
 */
export async function getEligibleOrders() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            shopify_order_number,
            customer_id,
            wa_review_status,
            fulfillment_status,
            created_at,
            customers!inner(full_name, phone)
        `)
        .eq('wa_review_status', 'none')
        .eq('fulfillment_status', 'fulfilled')
        .not('customers.phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)

    if (error) {
        console.error('Failed to fetch eligible orders:', error)
        return []
    }

    // Filter out customers with empty/short phone numbers
    return (data || []).filter(o => {
        const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers
        return customer?.phone && customer.phone.length > 4
    })
}

/**
 * Bulk schedule review requests for selected order IDs.
 * Sets wa_review_status = 'scheduled' with wa_scheduled_for = now (send immediately on next cron tick).
 */
export async function bulkScheduleReviewRequests(orderIds: string[]) {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Session expired. Please refresh and log in again.' }
    }

    const { data: userData } = await supabase
        .from('portal_users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!userData || !['owner', 'admin', 'moderator'].includes(userData.role)) {
        return { success: false, error: 'You do not have permission to send review requests.' }
    }

    if (!orderIds.length) {
        return { success: false, error: 'No orders selected.' }
    }

    // Schedule them for immediate sending (next cron tick)
    const now = new Date().toISOString()
    const { error, count } = await supabase
        .from('orders')
        .update({
            wa_review_status: 'scheduled',
            wa_scheduled_for: now,
        })
        .in('id', orderIds)
        .eq('wa_review_status', 'none') // Guard: only schedule if not already scheduled

    if (error) {
        console.error('Failed to schedule review requests:', error)
        return { success: false, error: `Failed to schedule: ${error.message}` }
    }

    revalidatePath('/marketing/reviews/automations')
    return { success: true, scheduled: count || orderIds.length }
}

/**
 * Send review requests immediately (bypasses cron — calls the API directly).
 */
export async function sendReviewRequestsNow(orderIds: string[]) {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Session expired. Please refresh and log in again.' }
    }

    const { data: userData } = await supabase
        .from('portal_users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!userData || !['owner', 'admin', 'moderator'].includes(userData.role)) {
        return { success: false, error: 'You do not have permission to send review requests.' }
    }

    if (!orderIds.length) {
        return { success: false, error: 'No orders selected.' }
    }

    // Call the cron endpoint internally to process these specific orders
    // First schedule them, then trigger the cron
    const now = new Date().toISOString()
    await supabase
        .from('orders')
        .update({ wa_review_status: 'scheduled', wa_scheduled_for: now })
        .in('id', orderIds)
        .eq('wa_review_status', 'none')

    // Trigger cron endpoint
    const cronSecret = process.env.CRON_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

    try {
        const res = await fetch(`${baseUrl}/api/marketing/automations/cron`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
        })

        const result = await res.json()
        revalidatePath('/marketing/reviews/automations')

        if (result.success) {
            return { success: true, sent: result.processed }
        } else {
            return { success: false, error: result.error || 'Cron endpoint failed' }
        }
    } catch (err) {
        console.error('Failed to trigger cron:', err)
        return { success: false, error: 'Failed to trigger sending. Check server logs.' }
    }
}
