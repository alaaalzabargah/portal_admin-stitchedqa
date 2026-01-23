/**
 * Admin Invite API - Invite New User
 * POST /api/admin/invite
 * Owner only - invite new user to portal
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InviteUserSchema } from '@/lib/api/validation'
import { logAuditEvent } from '@/lib/audit'

export async function POST(request: NextRequest) {
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
            .select('role, is_active, email')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'User profile not found' },
                { status: 403 }
            )
        }

        // Only owners and managers can invite users
        if (!['owner', 'manager'].includes(profile.role) || !profile.is_active) {
            return NextResponse.json(
                { error: 'Forbidden - Owner or Manager access required' },
                { status: 403 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        const validation = InviteUserSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { email, role, display_name } = validation.data

        // Managers cannot invite owners or other managers
        if (profile.role === 'manager' && ['owner', 'manager'].includes(role)) {
            return NextResponse.json(
                { error: 'Managers cannot invite owners or other managers' },
                { status: 403 }
            )
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('portal_users')
            .select('id')
            .eq('email', email)
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            )
        }

        // Create admin client for invite (requires service role)
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[API] Missing Supabase credentials for admin operations')
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Send invite using admin client
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
                role,
                display_name: display_name || email.split('@')[0],
            },
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?type=invite`
        })

        if (inviteError) {
            console.error('[API] Error sending invite:', inviteError)
            return NextResponse.json(
                { error: 'Failed to send invite', details: inviteError.message },
                { status: 500 }
            )
        }

        // Create portal_users record using admin client to bypass RLS
        const { error: portalUserError } = await adminClient
            .from('portal_users')
            .insert({
                id: inviteData.user.id,
                email,
                display_name: display_name || email.split('@')[0],
                role,
                is_active: true
            })

        if (portalUserError) {
            console.error('[API] Error creating portal user record:', portalUserError)
            // Don't fail - user was invited successfully, they just won't have a portal record yet
        }

        // Log audit event (don't fail if audit log fails)
        try {
            await logAuditEvent({
                supabase,
                userId: user.id,
                userEmail: profile.email,
                userRole: profile.role,
                action: 'user.invite',
                entityType: 'portal_user',
                entityId: inviteData.user.id,
                entityName: display_name || email,
                newValues: { email, role, display_name },
                metadata: { invited_by: profile.email }
            })
        } catch (auditError) {
            console.warn('[API] Failed to log audit event:', auditError)
            // Continue anyway - invite was successful
        }

        return NextResponse.json({
            success: true,
            message: 'Invite sent successfully',
            user: inviteData.user
        })

    } catch (error: any) {
        console.error('[API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}

