import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

export type ConversationState = 'idle' | 'collecting_info' | 'measurements' | 'marketing_flow'

export interface WhatsAppSession {
    id: string
    customer_id: string
    state: ConversationState
    context_data: any
    last_interaction_at: string
}

/**
 * Retrieves the Supabase client. 
 * Note: In route handlers we use createClient() but we need to pass it or create a service client 
 * if we want to bypass RLS or strictly control context. 
 * For webhooks, we usually want the Service Role key if we are acting as the system, 
 * but since we are using the Next.js Supabase helper, it uses cookies for auth.
 * For webhooks, there is NO user session. We MUST use the Service Role Key.
 */
function getServiceSupabase() {
    return createClient() // This defaults to cookie-based... wait.
    // We cannot use standard createClient() for webhooks because there are no cookies.
    // We must use a direct keys construction for the Service Worker.
}

// Actually, we should use a standard valid client. 
// For now, let's assume we use the standard one but we might hit RLS issues if we don't have a user.
// The Schema has policies for "Managers manage ..." but for webhooks we are "System".
// We should probably instantiate a direct client if possible, or use the cookie one but ensure we have permissions.
// Let's stick to the server helper for now, but if it fails RLS we might need SUPABASE_SERVICE_ROLE_KEY.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    return createSupabaseClient(url, key)
}

export async function getOrCreateSession(waId: string, profileName: string): Promise<WhatsAppSession> {
    const supabase = getAdminClient()

    // 1. Find Customer by wa_id
    let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('wa_id', waId)
        .single()

    // 2. If no customer, find by phone (fallback) or create
    if (!customer) {
        // Try finding by phone (assuming waId is the phone number without + or with it, normalizing needed?)
        // WhatsApp IDs usually are E.164 without +, but let's assume raw match for now.
        const { data: existingByPhone } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', waId) // Simple check
            .single()

        if (existingByPhone) {
            customer = existingByPhone
            // Link wa_id
            await supabase.from('customers').update({ wa_id: waId }).eq('id', customer.id)
        } else {
            // Create new customer
            const { data: newCustomer, error } = await supabase.from('customers').insert({
                phone: waId,
                wa_id: waId,
                full_name: profileName,
                status_tier: 'Normal'
            }).select('id').single()

            if (error) throw new Error(`Failed to create customer: ${error.message}`)
            customer = newCustomer
        }
    }

    // 3. Get Session
    let { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('customer_id', customer.id)
        .single()

    // 4. Create Session if missing
    if (!session) {
        const { data: newSession, error } = await supabase.from('whatsapp_sessions').insert({
            customer_id: customer.id,
            state: 'idle',
            context_data: {}
        }).select('*').single()

        if (error) throw new Error(`Failed to create session: ${error.message}`)
        session = newSession
    } else {
        // Update last interaction
        await supabase.from('whatsapp_sessions').update({
            last_interaction_at: new Date().toISOString()
        }).eq('id', session.id)
    }

    return session
}

export async function updateSessionState(sessionId: string, newState: ConversationState, contextUpdate?: any) {
    const supabase = getAdminClient()

    // If contextUpdate provides, merge it? Or replace? 
    // Postgres jsonb_set is complex, let's just read and write or assume strict updates.
    // For simplicity, we will merge in application layer if needed, but here we expect a full patch or we use SQL.
    // Let's just update for now.

    const updates: any = { state: newState }
    if (contextUpdate) {
        updates.context_data = contextUpdate
    }

    await supabase.from('whatsapp_sessions').update(updates).eq('id', sessionId)
}
