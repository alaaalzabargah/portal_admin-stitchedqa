/**
 * Admin Audit Logs API
 * GET /api/admin/audit
 * Owner/Admin only - retrieve audit logs with pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuditLogs, ActionCategory } from '@/lib/audit'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if user is owner or admin
        const { data: profile, error: profileError } = await supabase
            .from('portal_users')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'User profile not found' },
                { status: 403 }
            )
        }

        if (!['owner', 'admin'].includes(profile.role) || !profile.is_active) {
            return NextResponse.json(
                { error: 'Forbidden - Owner or Admin access required' },
                { status: 403 }
            )
        }

        // Parse query params
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const category = searchParams.get('category') as ActionCategory | null
        const entityType = searchParams.get('entityType')
        const entityId = searchParams.get('entityId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Fetch audit logs
        const { logs, count, error } = await getAuditLogs(supabase, {
            limit,
            offset,
            category: category || undefined,
            entityType: entityType || undefined,
            entityId: entityId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        })

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch audit logs', details: error },
                { status: 500 }
            )
        }

        return NextResponse.json({
            logs,
            count,
            limit,
            offset
        })

    } catch (error: any) {
        console.error('[API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
