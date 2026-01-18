/**
 * Admin Users API - List All Users
 * GET /api/admin/users
 * Owner only - returns all portal users
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

        // Check if user is owner
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

        if (profile.role !== 'owner' || !profile.is_active) {
            return NextResponse.json(
                { error: 'Forbidden - Owner access required' },
                { status: 403 }
            )
        }

        // Fetch all portal users
        const { data: users, error: usersError } = await supabase
            .from('portal_users')
            .select('*')
            .order('created_at', { ascending: false })

        if (usersError) {
            console.error('[API] Error fetching users:', usersError)
            return NextResponse.json(
                { error: 'Failed to fetch users' },
                { status: 500 }
            )
        }

        return NextResponse.json({ users })

    } catch (error: any) {
        console.error('[API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
