/**
 * WhatsApp Cloud API Webhook
 *
 * GET  → Meta verification handshake (one-time setup)
 * POST → Receives inbound messages + delivery status updates
 *
 * This endpoint is PUBLIC (no auth) — Meta must be able to reach it.
 * Security is handled via WHATSAPP_VERIFY_TOKEN and payload signature verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppWebhookPayload, WhatsAppMessage, WhatsAppContact, WhatsAppStatus } from '@/lib/whatsapp/types'
import { getOrCreateSession } from '@/lib/whatsapp/session'
import { handleWhatsAppMessage } from '@/lib/whatsapp/handlers'
import { persistInboundMessage, updateMessageStatus, resolveCustomerId } from '@/lib/whatsapp/api'

export const runtime = 'nodejs'

/**
 * GET — Webhook Verification
 *
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
 * We validate the token and echo back the challenge to confirm ownership.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    if (!verifyToken) {
        console.error('[Webhook] WHATSAPP_VERIFY_TOKEN is not set')
        return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('[Webhook] Verification successful')
        // Meta expects the challenge as plain text, not JSON
        return new NextResponse(challenge, { status: 200 })
    }

    console.warn('[Webhook] Verification failed — token mismatch')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * POST — Receive Messages & Status Updates
 *
 * Meta sends webhook events for:
 * 1. Inbound messages (customer → business)
 * 2. Status updates (sent/delivered/read for outbound messages)
 */
export async function POST(request: NextRequest) {
    try {
        // Optional: Verify X-Hub-Signature-256 header for security
        const signature = request.headers.get('x-hub-signature-256')
        const appSecret = process.env.WHATSAPP_APP_SECRET

        if (appSecret && signature) {
            const body = await request.text()
            const isValid = await verifySignature(body, signature, appSecret)
            if (!isValid) {
                console.error('[Webhook] Invalid signature')
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
            }
            // Parse the body we already read
            const payload: WhatsAppWebhookPayload = JSON.parse(body)
            await processPayload(payload)
        } else {
            // No secret configured or no signature — process directly
            const payload: WhatsAppWebhookPayload = await request.json()
            await processPayload(payload)
        }

        // Always return 200 quickly — Meta retries on non-200
        return NextResponse.json({ status: 'ok' }, { status: 200 })

    } catch (error) {
        console.error('[Webhook] Processing error:', error)
        // Still return 200 to prevent Meta from retrying
        return NextResponse.json({ status: 'ok' }, { status: 200 })
    }
}

/**
 * Process the full webhook payload — handles messages and statuses.
 */
async function processPayload(payload: WhatsAppWebhookPayload) {
    if (payload.object !== 'whatsapp_business_account') {
        console.warn('[Webhook] Ignoring non-WhatsApp payload:', payload.object)
        return
    }

    for (const entry of payload.entry) {
        for (const change of entry.changes) {
            if (change.field !== 'messages') continue

            const value = change.value

            // --- Handle inbound messages ---
            if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                    await handleInboundMessage(message, value.contacts)
                }
            }

            // --- Handle delivery status updates ---
            if (value.statuses && value.statuses.length > 0) {
                for (const status of value.statuses) {
                    await handleStatusUpdate(status)
                }
            }
        }
    }
}

/**
 * Process a single inbound message.
 */
async function handleInboundMessage(
    message: WhatsAppMessage,
    contacts?: WhatsAppContact[]
) {
    const from = message.from
    const profileName = contacts?.find(c => c.wa_id === from)?.profile?.name || 'Customer'

    console.log(`[Webhook] Inbound from ${from} (${profileName}): type=${message.type}`)

    // 1. Persist the inbound message
    const customerId = await resolveCustomerId(from)
    await persistInboundMessage({
        waMessageId: message.id,
        customerPhone: from,
        customerId,
        messageType: message.type,
        content: extractMessageContent(message),
    })

    // 2. Route through session state machine
    try {
        const session = await getOrCreateSession(from, profileName)
        await handleWhatsAppMessage(session, message as any)
    } catch (err) {
        console.error(`[Webhook] Session handling error for ${from}:`, err)
    }
}

/**
 * Process a delivery status update (sent → delivered → read).
 */
async function handleStatusUpdate(status: WhatsAppStatus) {
    const validStatuses = ['sent', 'delivered', 'read', 'failed'] as const
    const statusValue = status.status as typeof validStatuses[number]

    if (!validStatuses.includes(statusValue)) return

    console.log(`[Webhook] Status update: ${status.id} → ${statusValue}`)

    await updateMessageStatus(status.id, statusValue)
}

/**
 * Extract readable content from different message types.
 */
function extractMessageContent(message: any): any {
    switch (message.type) {
        case 'text':
            return { body: message.text?.body }
        case 'image':
            return {
                caption: message.image?.caption,
                mime_type: message.image?.mime_type,
                media_id: message.image?.id,
            }
        case 'location':
            return {
                latitude: message.location?.latitude,
                longitude: message.location?.longitude,
                name: message.location?.name,
                address: message.location?.address,
            }
        case 'interactive':
            return {
                type: message.interactive?.type,
                button_reply: message.interactive?.button_reply,
                list_reply: message.interactive?.list_reply,
            }
        case 'button':
            return { text: message.button?.text, payload: message.button?.payload }
        case 'order':
            return message.order
        default:
            return { raw_type: message.type }
    }
}

/**
 * Verify Meta webhook signature (HMAC-SHA256).
 */
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
    try {
        const crypto = await import('crypto')
        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex')

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    } catch {
        return false
    }
}
