/**
 * Messaging Abstraction Layer
 * 
 * Unified messaging API that delegates to Telegram or WhatsApp
 * based on the MESSAGING_CHANNEL environment variable.
 * 
 * Usage:
 *   import { sendMessage, sendAdminMessage } from '@/lib/messaging'
 *   await sendMessage('chat_id_or_phone', 'Hello!')
 * 
 * To switch channels: set MESSAGING_CHANNEL=whatsapp in .env.local
 */

import { sendTelegramMessage } from '@/lib/telegram'
import { sendSimpleText } from '@/lib/whatsapp/api'

// =====================================================
// CHANNEL CONFIG
// =====================================================

export type MessagingChannel = 'telegram' | 'whatsapp'

/**
 * Get the currently active messaging channel.
 * Defaults to 'telegram' if not configured.
 */
export function getActiveChannel(): MessagingChannel {
    const channel = process.env.MESSAGING_CHANNEL as MessagingChannel
    return channel === 'whatsapp' ? 'whatsapp' : 'telegram'
}

/**
 * Get the display name of the active channel
 */
export function getChannelDisplayName(): string {
    return getActiveChannel() === 'telegram' ? 'Telegram' : 'WhatsApp'
}

/**
 * Get the label for the recipient field based on active channel
 */
export function getRecipientFieldLabel(): string {
    return getActiveChannel() === 'telegram'
        ? 'Telegram Chat ID'
        : 'WhatsApp Phone Number'
}

/**
 * Get the placeholder text for the recipient field
 */
export function getRecipientFieldPlaceholder(): string {
    return getActiveChannel() === 'telegram'
        ? '123456789 (Telegram Chat ID)'
        : '+974XXXXXXXX (WhatsApp Number)'
}

// =====================================================
// UNIFIED SEND FUNCTIONS
// =====================================================

export interface SendResult {
    success: boolean
    channel: MessagingChannel
    error?: string
}

/**
 * Send a message to a specific recipient via the active channel.
 * 
 * @param recipient - Telegram chat ID or WhatsApp phone number
 * @param message - Plain text message to send
 * @returns SendResult with success status
 */
export async function sendMessage(
    recipient: string,
    message: string
): Promise<SendResult> {
    const channel = getActiveChannel()

    if (!recipient) {
        return { success: false, channel, error: 'No recipient provided' }
    }

    try {
        if (channel === 'telegram') {
            const success = await sendTelegramMessage(recipient, message)
            return { success, channel }
        } else {
            const result = await sendSimpleText(recipient, message)
            return { success: !!result, channel }
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Messaging] Failed to send via ${channel}:`, errorMsg)
        return { success: false, channel, error: errorMsg }
    }
}

/**
 * Send a message to the admin.
 * Uses TELEGRAM_ADMIN_CHAT_ID for Telegram or WHATSAPP_ADMIN_PHONE for WhatsApp.
 */
export async function sendAdminMessage(message: string): Promise<SendResult> {
    const channel = getActiveChannel()

    const adminRecipient = channel === 'telegram'
        ? process.env.TELEGRAM_ADMIN_CHAT_ID
        : process.env.WHATSAPP_ADMIN_PHONE

    if (!adminRecipient) {
        console.warn(`[Messaging] Admin recipient not configured for ${channel}`)
        return { success: false, channel, error: 'Admin recipient not configured' }
    }

    return sendMessage(adminRecipient, message)
}

/**
 * Send a message to multiple recipients.
 * Continues sending even if individual messages fail.
 */
export async function sendBulkMessage(
    recipients: string[],
    message: string
): Promise<{ sent: number; failed: number; results: SendResult[] }> {
    const results: SendResult[] = []
    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
        const result = await sendMessage(recipient, message)
        results.push(result)
        if (result.success) {
            sent++
        } else {
            failed++
        }
    }

    return { sent, failed, results }
}

/**
 * Check if messaging is properly configured for the active channel
 */
export function isMessagingConfigured(): boolean {
    const channel = getActiveChannel()

    if (channel === 'telegram') {
        return !!process.env.TELEGRAM_BOT_TOKEN
    } else {
        // WhatsApp API uses META_ACCESS_TOKEN / META_PHONE_ID 
        // or WHATSAPP_API_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID
        return !!(process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_API_ACCESS_TOKEN)
    }
}
