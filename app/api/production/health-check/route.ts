/**
 * Production Health Check API
 * Monitors production assignments and sends alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateProductionHealth } from '@/lib/telegram'
import { sendMessage, sendAdminMessage, getActiveChannel } from '@/lib/messaging'
import { productionAlertMessage } from '@/lib/messaging/templates'

export async function GET(request: NextRequest) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Fetch active production assignments (not yet ready or delivered)
        const { data, error } = await supabase
            .from('production_assignments')
            .select(`
                id,
                stage,
                assigned_at,
                target_due_at,
                alert_50_sent,
                alert_80_sent,
                cost_price_minor,
                order_items (
                    id,
                    product_name,
                    orders (
                        id,
                        external_id,
                        customers (
                            full_name
                        )
                    )
                ),
                tailors (
                    id,
                    full_name,
                    phone,
                    telegram_chat_id
                )
            `)
            .not('stage', 'in', '(ready,delivered)')
            .not('target_due_at', 'is', null)
            .not('assigned_at', 'is', null)

        if (error) {
            console.error('[Health Check] Query error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const assignments: any[] = data || []
        const alerts: any[] = []
        const updates: any[] = []

        for (const assignment of assignments) {
            if (!assignment.assigned_at || !assignment.target_due_at) continue

            const health = calculateProductionHealth(
                new Date(assignment.assigned_at),
                new Date(assignment.target_due_at)
            )

            // Check if we need to send 50% alert
            if (health.percentElapsed >= 50 && !assignment.alert_50_sent) {
                const message = productionAlertMessage({
                    itemName: assignment.order_items?.product_name || 'Unknown',
                    orderNumber: assignment.order_items?.orders?.external_id || assignment.order_items?.orders?.id || 'N/A',
                    stage: assignment.stage,
                    tailorName: assignment.tailors?.full_name || 'Unassigned',
                    percentElapsed: health.percentElapsed,
                    targetDue: new Date(assignment.target_due_at).toLocaleDateString('en-GB')
                })

                // Send to tailor via correct channel
                const channel = getActiveChannel()
                const tailorRecipient = channel === 'telegram'
                    ? assignment.tailors?.telegram_chat_id
                    : assignment.tailors?.phone
                if (tailorRecipient) {
                    await sendMessage(tailorRecipient, message)
                }

                // Send to admin
                await sendAdminMessage(message)

                alerts.push({ assignment_id: assignment.id, threshold: '50%' })
                updates.push({
                    id: assignment.id,
                    alert_50_sent: true
                })
            }

            // Check if we need to send 80% alert
            if (health.percentElapsed >= 80 && !assignment.alert_80_sent) {
                const message = productionAlertMessage({
                    itemName: assignment.order_items?.product_name || 'Unknown',
                    orderNumber: assignment.order_items?.orders?.external_id || assignment.order_items?.orders?.id || 'N/A',
                    stage: assignment.stage,
                    tailorName: assignment.tailors?.full_name || 'Unassigned',
                    percentElapsed: health.percentElapsed,
                    targetDue: new Date(assignment.target_due_at).toLocaleDateString('en-GB')
                })

                const channel80 = getActiveChannel()
                const tailorRecipient80 = channel80 === 'telegram'
                    ? assignment.tailors?.telegram_chat_id
                    : assignment.tailors?.phone
                if (tailorRecipient80) {
                    await sendMessage(tailorRecipient80, message)
                }

                await sendAdminMessage(message)

                alerts.push({ assignment_id: assignment.id, threshold: '80%' })
                updates.push({
                    id: assignment.id,
                    alert_80_sent: true
                })
            }
        }

        // Update alert flags in database
        for (const update of updates) {
            await supabase
                .from('production_assignments')
                .update(update)
                .eq('id', update.id)
        }

        return NextResponse.json({
            success: true,
            checked: assignments?.length || 0,
            alerts_sent: alerts.length,
            alerts
        })

    } catch (error) {
        console.error('[Health Check] Error:', error)
        return NextResponse.json(
            { error: 'Health check failed' },
            { status: 500 }
        )
    }
}
