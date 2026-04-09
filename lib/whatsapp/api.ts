/**
 * WhatsApp Cloud API — Unified SDK Layer
 *
 * Single credential set: META_PHONE_ID + META_ACCESS_TOKEN
 * All outbound messages are persisted to whatsapp_messages table
 */

import { createClient } from '@supabase/supabase-js'

const GRAPH_API_VERSION = 'v25.0'
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export type MessageType = 'text' | 'template' | 'interactive' | 'image'

function getMetaCredentials() {
    const phoneId = process.env.META_PHONE_ID
    const token = process.env.META_ACCESS_TOKEN
    if (!phoneId || !token) {
        return null
    }
    return { phoneId, token }
}

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

/**
 * Resolve customer_id from a WhatsApp phone number.
 * Looks up by wa_id first, then by phone.
 */
async function resolveCustomerId(phone: string): Promise<string | null> {
    const supabase = getAdminClient()
    const normalized = phone.replace(/\D/g, '')

    const { data: byWaId } = await supabase
        .from('customers')
        .select('id')
        .eq('wa_id', normalized)
        .maybeSingle()

    if (byWaId) return byWaId.id

    const { data: byPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalized)
        .maybeSingle()

    // Also try with + prefix
    if (!byPhone) {
        const { data: byPhonePlus } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', `+${normalized}`)
            .maybeSingle()

        return byPhonePlus?.id || null
    }

    return byPhone?.id || null
}

/**
 * Persist an outbound message to whatsapp_messages table.
 */
async function persistOutboundMessage(params: {
    waMessageId: string | null
    customerId: string | null
    messageType: MessageType
    content: any
    templateName?: string
    status: 'sent' | 'failed'
    errorDetails?: any
}) {
    const supabase = getAdminClient()

    await supabase.from('whatsapp_messages').insert({
        wa_message_id: params.waMessageId,
        customer_id: params.customerId,
        direction: 'outbound',
        status: params.status,
        message_type: params.messageType,
        content: params.content,
        template_name: params.templateName || null,
        error_details: params.errorDetails || null,
    })
}

/**
 * Core send function — sends via Meta Cloud API and persists to DB.
 */
export async function sendWhatsAppMessage(to: string, type: MessageType, content: any) {
    const creds = getMetaCredentials()

    if (!creds) {
        console.warn('[WhatsApp] Missing META_PHONE_ID or META_ACCESS_TOKEN. Message not sent:', { to, type })
        return null
    }

    const payload: any = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: type,
    }

    if (type === 'text') payload.text = content
    if (type === 'template') payload.template = content
    if (type === 'interactive') payload.interactive = content
    if (type === 'image') payload.image = content

    try {
        const res = await fetch(`${GRAPH_API_URL}/${creds.phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${creds.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await res.json()

        const waMessageId = data.messages?.[0]?.id || null
        const customerId = await resolveCustomerId(to)

        if (!res.ok) {
            console.error('[WhatsApp] API Error:', data)
            await persistOutboundMessage({
                waMessageId,
                customerId,
                messageType: type,
                content,
                templateName: type === 'template' ? content.name : undefined,
                status: 'failed',
                errorDetails: data.error,
            })
            return null
        }

        await persistOutboundMessage({
            waMessageId,
            customerId,
            messageType: type,
            content,
            templateName: type === 'template' ? content.name : undefined,
            status: 'sent',
        })

        return data
    } catch (error) {
        console.error('[WhatsApp] Network Error:', error)
        const customerId = await resolveCustomerId(to)
        await persistOutboundMessage({
            waMessageId: null,
            customerId,
            messageType: type,
            content,
            status: 'failed',
            errorDetails: { message: error instanceof Error ? error.message : 'Network error' },
        })
        return null
    }
}

export async function sendSimpleText(to: string, body: string) {
    return sendWhatsAppMessage(to, 'text', { body, preview_url: false })
}

export async function sendTemplate(to: string, templateName: string, languageCode: string, components: any[] = []) {
    const template: any = {
        name: templateName,
        language: { code: languageCode },
    }
    if (components.length > 0) {
        template.components = components
    }
    return sendWhatsAppMessage(to, 'template', template)
}

export async function sendMenu(to: string) {
    return sendWhatsAppMessage(to, 'interactive', {
        type: 'button',
        body: {
            text: "Welcome to Stitched! How can we assist you today?"
        },
        action: {
            buttons: [
                {
                    type: "reply",
                    reply: { id: "new_order", title: "New Order" }
                },
                {
                    type: "reply",
                    reply: { id: "my_measurements", title: "My Measurements" }
                },
                {
                    type: "reply",
                    reply: { id: "track_order", title: "Track Order" }
                }
            ]
        }
    })
}

/**
 * Persist an inbound message received from webhook.
 */
export async function persistInboundMessage(params: {
    waMessageId: string
    customerPhone: string
    customerId: string | null
    messageType: string
    content: any
}) {
    const supabase = getAdminClient()

    await supabase.from('whatsapp_messages').insert({
        wa_message_id: params.waMessageId,
        customer_id: params.customerId,
        direction: 'inbound',
        status: 'delivered',
        message_type: params.messageType,
        content: params.content,
    })
}

/**
 * Update message status from webhook delivery receipts.
 */
export async function updateMessageStatus(waMessageId: string, status: 'sent' | 'delivered' | 'read' | 'failed') {
    const supabase = getAdminClient()

    // Update in whatsapp_messages
    await supabase
        .from('whatsapp_messages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('wa_message_id', waMessageId)

    // Also sync to orders.wa_review_status if applicable
    if (status === 'delivered' || status === 'read') {
        await supabase
            .from('orders')
            .update({ wa_review_status: status })
            .eq('wa_message_id', waMessageId)
    }
}

export { resolveCustomerId }
