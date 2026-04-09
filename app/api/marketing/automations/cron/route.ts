/**
 * WhatsApp Review Request Automation — Cron Endpoint
 *
 * Triggered externally (Vercel Cron, EasyCron, etc.) with Bearer CRON_SECRET.
 * Finds orders due for review requests and sends WhatsApp template messages.
 * Now uses the unified lib/whatsapp/api.ts for sending + message persistence.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTemplate } from '@/lib/whatsapp/api'

export const runtime = 'nodejs'

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) throw new Error('Missing Supabase credentials')
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

function generateCode(length = 7): string {
    const chars = '0123456789abcdefghjkmnpqrstuvwxyz'
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authorize
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) {
            console.error('[CRON] CRON_SECRET env var is not set')
            return NextResponse.json({ error: 'Not configured' }, { status: 500 })
        }

        const authHeader = request.headers.get('Authorization')
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = getServiceClient()

        // 2. Query pending review requests
        const { data: pendingOrders, error: queryError } = await supabase
            .from('orders')
            .select(`
                id, shopify_order_number, customer_id, wa_review_status, wa_scheduled_for,
                customers!inner(full_name, phone, email),
                order_items(product_name, shopify_line_item_id)
            `)
            .eq('wa_review_status', 'scheduled')
            .lte('wa_scheduled_for', new Date().toISOString())
            .limit(50)

        if (queryError) {
            console.error('[CRON] Failed to fetch pending orders', queryError)
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
        }

        if (!pendingOrders || pendingOrders.length === 0) {
            return NextResponse.json({ success: true, processed: 0, message: 'No pending automations found.' })
        }

        console.log(`[CRON] Found ${pendingOrders.length} pending review requests to send.`)

        const hasMetaApi = !!(process.env.META_PHONE_ID && process.env.META_ACCESS_TOKEN)
        let processedCount = 0

        for (const order of pendingOrders) {
            try {
                const phone = order.customers?.[0]?.phone
                const name = order.customers?.[0]?.full_name?.split(' ')[0] || 'there'

                if (!phone) {
                    await supabase.from('orders').update({ wa_review_status: 'failed' }).eq('id', order.id)
                    continue
                }

                // Derive product handle from first item
                const firstItemTitle = order.order_items?.[0]?.product_name || ''
                const baseHandle = firstItemTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

                // Generate unique short link code
                let code = generateCode()
                for (let i = 0; i < 5; i++) {
                    const { data: existing } = await supabase
                        .from('review_short_links')
                        .select('code')
                        .eq('code', code)
                        .maybeSingle()
                    if (!existing) break
                    code = generateCode()
                }

                await supabase.from('review_short_links').insert({
                    code,
                    product_handle: baseHandle,
                    customer_name: name,
                    customer_whatsapp: phone,
                })

                let waMessageId = null
                let finalStatus = 'sent'

                if (hasMetaApi) {
                    // Send via unified API — also persists to whatsapp_messages
                    const formattedPhone = phone.replace(/[^0-9]/g, '')
                    const result = await sendTemplate(formattedPhone, 'review_request', 'en', [
                        {
                            type: 'body',
                            parameters: [{ type: 'text', text: name }]
                        },
                        {
                            type: 'button',
                            sub_type: 'url',
                            index: '0',
                            parameters: [{ type: 'text', text: code }]
                        }
                    ])

                    if (result) {
                        waMessageId = result.messages?.[0]?.id || null
                    } else {
                        finalStatus = 'failed'
                    }
                } else {
                    console.log(`[CRON] Simulation Mode: Would send WA to ${phone} with code ${code}`)
                }

                await supabase.from('orders')
                    .update({
                        wa_review_status: finalStatus,
                        wa_message_id: waMessageId
                    })
                    .eq('id', order.id)

                processedCount++
            } catch (itemErr) {
                console.error(`[CRON] Failed processing order ${order.id}`, itemErr)
                await supabase.from('orders').update({ wa_review_status: 'failed' }).eq('id', order.id)
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedCount,
            meta_api_configured: hasMetaApi
        })

    } catch (err) {
        console.error('[CRON] Top-level error', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
