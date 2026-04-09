/**
 * WhatsApp Direct Message API
 *
 * Sends free-form text messages to selected customers via Meta Cloud API.
 * Note: Free-form messages only work within the 24-hour customer service window.
 * Outside that window, use template messages instead (send-campaign endpoint).
 *
 * All messages are persisted to whatsapp_messages table via the unified SDK.
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendSimpleText } from '@/lib/whatsapp/api'

interface SendMessageRequest {
    customers: Array<{
        id: string
        name: string
        phone: string
    }>
    message: string
}

interface SendResult {
    phone: string
    status: 'success' | 'error'
    message: string
    waMessageId?: string
}

export async function POST(request: NextRequest) {
    const META_PHONE_ID = process.env.META_PHONE_ID
    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN

    if (!META_PHONE_ID || !META_ACCESS_TOKEN) {
        return NextResponse.json(
            { error: 'Meta API credentials not configured' },
            { status: 500 }
        )
    }

    try {
        const body: SendMessageRequest = await request.json()
        const { customers, message } = body

        if (!customers?.length) {
            return NextResponse.json({ error: 'No customers selected' }, { status: 400 })
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
        }

        console.log(`[Direct Message] Sending to ${customers.length} customers`)

        const results: SendResult[] = []

        for (const customer of customers) {
            try {
                // Format phone number
                let phone = customer.phone.replace(/\D/g, '')
                if (!phone.startsWith('974') && phone.length === 8) {
                    phone = '974' + phone
                }

                // Send via unified API (persists to whatsapp_messages automatically)
                const result = await sendSimpleText(phone, message.trim())

                if (result) {
                    results.push({
                        phone: customer.phone,
                        status: 'success',
                        message: `Sent to ${customer.name}`,
                        waMessageId: result.messages?.[0]?.id
                    })
                } else {
                    results.push({
                        phone: customer.phone,
                        status: 'error',
                        message: 'Failed to send — may be outside 24h service window'
                    })
                }
            } catch (err) {
                results.push({
                    phone: customer.phone,
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Failed to send'
                })
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        const successCount = results.filter(r => r.status === 'success').length
        const errorCount = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            summary: { total: customers.length, sent: successCount, failed: errorCount },
            results
        })

    } catch (error) {
        console.error('[Direct Message] Send error:', error)
        return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
    }
}
