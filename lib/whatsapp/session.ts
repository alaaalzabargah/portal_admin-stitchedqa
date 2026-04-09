/**
 * WhatsApp Session Manager
 *
 * Manages conversational state per customer using Supabase.
 * Uses service role client (no cookies needed — runs in webhook context).
 */

import { createClient } from '@supabase/supabase-js'

export type ConversationState = 'idle' | 'collecting_info' | 'measurements' | 'marketing_flow'

export interface WhatsAppSession {
    id: string
    customer_id: string
    state: ConversationState
    context_data: any
    last_interaction_at: string
}

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

/**
 * Find or create a customer + session from an inbound WhatsApp message.
 */
export async function getOrCreateSession(waId: string, profileName: string): Promise<WhatsAppSession> {
    const supabase = getAdminClient()

    // 1. Find customer by wa_id
    let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('wa_id', waId)
        .maybeSingle()

    // 2. Fallback: find by phone
    if (!customer) {
        const { data: byPhone } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', waId)
            .maybeSingle()

        if (!byPhone) {
            // Also try with + prefix
            const { data: byPhonePlus } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', `+${waId}`)
                .maybeSingle()

            if (byPhonePlus) {
                customer = byPhonePlus
                await supabase.from('customers').update({ wa_id: waId }).eq('id', customer.id)
            }
        } else {
            customer = byPhone
            await supabase.from('customers').update({ wa_id: waId }).eq('id', customer.id)
        }
    }

    // 3. Create new customer if not found
    if (!customer) {
        const { data: newCustomer, error } = await supabase.from('customers').insert({
            phone: waId,
            wa_id: waId,
            full_name: profileName,
            status_tier: 'Normal'
        }).select('id').single()

        if (error) throw new Error(`Failed to create customer: ${error.message}`)
        customer = newCustomer
    }

    // 4. Get existing session
    let { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('customer_id', customer.id)
        .maybeSingle()

    // 5. Create session if missing
    if (!session) {
        const { data: newSession, error } = await supabase.from('whatsapp_sessions').insert({
            customer_id: customer.id,
            state: 'idle',
            context_data: {}
        }).select('*').single()

        if (error) throw new Error(`Failed to create session: ${error.message}`)
        session = newSession
    } else {
        await supabase.from('whatsapp_sessions').update({
            last_interaction_at: new Date().toISOString()
        }).eq('id', session.id)
    }

    return session
}

export async function updateSessionState(sessionId: string, newState: ConversationState, contextUpdate?: any) {
    const supabase = getAdminClient()

    const updates: any = { state: newState, last_interaction_at: new Date().toISOString() }
    if (contextUpdate !== undefined) {
        updates.context_data = contextUpdate
    }

    await supabase.from('whatsapp_sessions').update(updates).eq('id', sessionId)
}
