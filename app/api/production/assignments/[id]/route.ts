/**
 * Production Assignment API
 * Handles CRUD operations and stage transitions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
            .select()
            .single()

        if (error) {
            console.error('[PATCH] Supabase error:', error)
            return NextResponse.json({ error: error.message, details: error }, { status: 400 })
        }

        console.log('[PATCH] Success:', data)
        return NextResponse.json(data)
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
