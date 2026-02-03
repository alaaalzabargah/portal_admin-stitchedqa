/**
 * Production Settings API
 * GET: Fetch settings (public)
 * PATCH: Update settings (admin/owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const getSupabaseClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// GET /api/production/settings - Fetch production settings
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('production_settings')
            .select('*')
            .single()

        if (error) {
            console.error('[Settings GET] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('[Settings GET] Caught error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

// PATCH /api/production/settings - Update production settings (admin/owner only)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = getSupabaseClient()
        const body = await request.json()

        console.log('[Settings PATCH] Received update:', body)

        // Validate fields
        const allowedFields = [
            'stage_labels',
            'stage_durations',
            'stage_colors',
            'alert_thresholds',
            'telegram_enabled',
            'whatsapp_enabled',
            'email_enabled',
            'telegram_alert_template',
            'working_hours_start',
            'working_hours_end',
            'working_days',
            'use_business_days',
            'auto_assignment_enabled',
            'quality_check_required'
        ]

        const updateData: any = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            )
        }

        // Update settings (RLS will enforce admin/owner check)
        const { data, error } = await supabase
            .from('production_settings')
            .update(updateData)
            .eq('id', (await supabase.from('production_settings').select('id').single()).data?.id)
            .select()
            .single()

        if (error) {
            console.error('[Settings PATCH] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        console.log('[Settings PATCH] Success:', data)
        return NextResponse.json(data)
    } catch (error) {
        console.error('[Settings PATCH] Caught error:', error)
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        )
    }
}
