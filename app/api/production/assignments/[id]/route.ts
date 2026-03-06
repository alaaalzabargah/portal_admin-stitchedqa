/**
 * Production Assignment API
 * Handles CRUD operations and stage transitions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAssignmentCreated, notifyPaymentRecorded } from '@/lib/messaging/tailor-notifications'
import { sendAdminMessage } from '@/lib/messaging'
import { assignmentStatusChangedMessage } from '@/lib/messaging/templates'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/production/assignments/:id - Get single assignment with full details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const { data, error } = await supabase
            .from('production_assignments')
            .select(`
                *,
                order_items (
                    *,
                    orders (
                        *,
                        customers (
                            id,
                            full_name,
                            phone,
                            email
                        )
                    )
                ),
                tailors (
                    *
                ),
                production_status_history (
                    *,
                    tailors (
                        full_name
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch assignment' },
            { status: 500 }
        )
    }
}

// PATCH /api/production/assignments/:id - Update assignment
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        console.log('[PATCH] Assignment ID:', id)
        console.log('[PATCH] Received body:', body)

        const { stage, tailor_id, target_due_at, notes, is_paid, cost_price_minor } = body

        // Fetch current assignment state BEFORE updating (for old stage comparison)
        let oldStage: string | null = null
        if (stage !== undefined) {
            const { data: current } = await supabase
                .from('production_assignments')
                .select('stage')
                .eq('id', id)
                .single()
            oldStage = current?.stage || null
        }

        const updateData: any = {}

        if (stage !== undefined) {
            updateData.stage = stage
            if (stage === 'ready' || stage === 'delivered') {
                updateData.completed_at = new Date().toISOString()
            }
        }
        if (tailor_id !== undefined) updateData.tailor_id = tailor_id
        if (target_due_at !== undefined) updateData.target_due_at = target_due_at
        if (notes !== undefined) updateData.notes = notes
        if (is_paid !== undefined) updateData.is_paid = is_paid
        if (cost_price_minor !== undefined) updateData.cost_price_minor = cost_price_minor

        console.log('[PATCH] Update data:', updateData)

        const { data, error } = await supabase
            .from('production_assignments')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                tailors (
                    id, full_name, phone, telegram_chat_id
                ),
                order_items (
                    product_name
                )
            `)
            .single()

        if (error) {
            console.error('[PATCH] Supabase error:', error)
            return NextResponse.json({ error: error.message, details: error }, { status: 400 })
        }

        console.log('[PATCH] Success:', data)

        // =====================================================
        // FIRE NOTIFICATIONS (non-blocking)
        // =====================================================
        let notificationSent = false
        let notificationError: string | null = null

        try {
            const tailor = data.tailors
            const itemType = data.order_items?.product_name || data.item_type || 'Assignment'

            // Stage change → notify ADMIN (not tailor)
            if (stage !== undefined && oldStage && stage !== oldStage) {
                console.log(`[Notifications] Stage changed: ${oldStage} → ${stage} — notifying admin`)
                const adminMsg = assignmentStatusChangedMessage({
                    itemType,
                    oldStatus: oldStage,
                    newStatus: stage,
                    notes,
                })
                const result = await sendAdminMessage(adminMsg)
                notificationSent = result?.success || false
                if (!notificationSent) {
                    notificationError = 'Admin notification delivery failed'
                }
            }

            // Tailor assigned → notify TAILOR
            if (tailor_id !== undefined && tailor) {
                console.log(`[Notifications] Tailor assigned: ${tailor.full_name} — notifying tailor`)
                const results = await notifyAssignmentCreated(
                    tailor,
                    {
                        item_type: itemType,
                        quantity: data.quantity || 1,
                        due_date: data.target_due_at || new Date().toISOString(),
                        total_amount_minor: data.cost_price_minor || 0,
                    }
                )
                notificationSent = results.some((r: any) => r?.success)
                if (!notificationSent) {
                    notificationError = 'Tailor assignment notification failed'
                }
            }

            // Payment marked → notify TAILOR
            if (is_paid === true && tailor) {
                console.log('[Notifications] Payment marked — notifying tailor')
                const results = await notifyPaymentRecorded(
                    tailor,
                    {
                        amount_minor: data.cost_price_minor || 0,
                        payment_method: 'Bank Transfer',
                        assignment_ids: [id],
                        transaction_id: null,
                    }
                )
                notificationSent = results.some((r: any) => r?.success)
                if (!notificationSent) {
                    notificationError = 'Payment notification delivery failed'
                }
            }
        } catch (notifErr) {
            console.error('[Notifications] Error sending notification:', notifErr)
            notificationError = notifErr instanceof Error ? notifErr.message : 'Unknown notification error'
        }

        return NextResponse.json({
            ...data,
            notification_sent: notificationSent,
            notification_error: notificationError
        })
    } catch (error) {
        console.error('[PATCH] Caught error:', error)
        return NextResponse.json(
            { error: 'Failed to update assignment', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}

// DELETE /api/production/assignments/:id - Delete assignment
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const { error } = await supabase
            .from('production_assignments')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to delete assignment' },
            { status: 500 }
        )
    }
}
