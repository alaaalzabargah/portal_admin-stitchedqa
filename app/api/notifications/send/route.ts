/**
 * Notification API Endpoint
 * 
 * Sends notifications via the messaging abstraction layer.
 * Called from client-side after tailor management actions.
 * 
 * POST /api/notifications/send
 * Body: { event: string, tailorId: string, data: object }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessage, sendAdminMessage, getActiveChannel, isMessagingConfigured } from '@/lib/messaging'
import { testMessage } from '@/lib/messaging/templates'
import {
    notifyAssignmentCreated,
    notifyStatusUpdate,
    notifyPaymentRecorded,
    notifyQCResult,
} from '@/lib/messaging/tailor-notifications'

// Valid event types
type NotificationEvent =
    | 'test'
    | 'assignment_created'
    | 'status_changed'
    | 'payment_recorded'
    | 'qc_result'

export async function POST(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const body = await request.json()
        const { event, tailorId, data } = body as {
            event: NotificationEvent
            tailorId?: string
            data?: any
        }

        if (!event) {
            return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
        }

        // Check if messaging is configured
        if (!isMessagingConfigured()) {
            return NextResponse.json({
                error: 'Messaging not configured',
                channel: getActiveChannel(),
                hint: getActiveChannel() === 'telegram'
                    ? 'Set TELEGRAM_BOT_TOKEN in .env.local'
                    : 'Set WHATSAPP_API_ACCESS_TOKEN in .env.local'
            }, { status: 503 })
        }

        // Handle test event
        if (event === 'test') {
            const channel = getActiveChannel()

            // If tailorId is provided, send test to tailor
            if (tailorId) {
                const { data: tailor } = await supabase
                    .from('tailors')
                    .select('phone, telegram_chat_id, full_name')
                    .eq('id', tailorId)
                    .single()

                // Use telegram_chat_id for Telegram, phone for WhatsApp
                const recipient = channel === 'telegram'
                    ? tailor?.telegram_chat_id
                    : tailor?.phone

                if (!recipient) {
                    return NextResponse.json({
                        error: channel === 'telegram'
                            ? 'Tailor has no Telegram Chat ID configured'
                            : 'Tailor has no phone number configured'
                    }, { status: 400 })
                }

                const result = await sendMessage(recipient, testMessage(channel))
                return NextResponse.json({ success: result.success, channel, recipient: 'tailor' })
            }

            // Otherwise send to admin
            const result = await sendAdminMessage(testMessage(channel))
            return NextResponse.json({ success: result.success, channel, recipient: 'admin' })
        }

        // For all other events, we need a tailorId
        if (!tailorId) {
            return NextResponse.json({ error: 'Missing tailorId' }, { status: 400 })
        }

        // Fetch tailor info
        const { data: tailor, error: tailorError } = await supabase
            .from('tailors')
            .select('id, full_name, phone, telegram_chat_id')
            .eq('id', tailorId)
            .single()

        if (tailorError || !tailor) {
            return NextResponse.json({ error: 'Tailor not found' }, { status: 404 })
        }

        let results: any[] = []

        switch (event) {
            case 'assignment_created':
                results = await notifyAssignmentCreated(tailor, {
                    item_type: data.item_type,
                    quantity: data.quantity || 1,
                    due_date: data.due_date,
                    total_amount_minor: data.total_amount_minor || 0,
                })
                break

            case 'status_changed':
                results = await notifyStatusUpdate(
                    tailor,
                    { item_type: data.item_type },
                    data.old_status,
                    data.new_status,
                    data.notes
                )
                break

            case 'payment_recorded':
                results = await notifyPaymentRecorded(tailor, {
                    amount_minor: data.amount_minor,
                    payment_method: data.payment_method || 'Bank Transfer',
                    assignment_ids: data.assignment_ids || [],
                    transaction_id: data.transaction_id,
                })
                break

            case 'qc_result':
                results = await notifyQCResult(
                    tailor,
                    { item_type: data.item_type },
                    data.passed,
                    data.notes,
                    data.issues
                )
                break

            default:
                return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 })
        }

        const successCount = results.filter(r => r?.success).length
        return NextResponse.json({
            success: successCount > 0,
            channel: getActiveChannel(),
            sent: successCount,
            total: results.length,
        })

    } catch (error) {
        console.error('[Notifications API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to send notification' },
            { status: 500 }
        )
    }
}
