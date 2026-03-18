/**
 * Admin Users API - Create User Directly
 * POST /api/admin/users/create
 * Owner/Admin only - creates a user with email+password (no invitation email sent)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit'
import { USER_ROLE_LEVELS } from '@/lib/settings/types'
import { z } from 'zod'

const UserRoleEnum = z.enum(['owner', 'admin', 'manager', 'moderator', 'viewer'])

const CreateUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: UserRoleEnum.default('viewer'),
    display_name: z.string().min(1).max(100).optional(),
})

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

        if (!['owner', 'admin'].includes(profile.role) || !profile.is_active) {
            return NextResponse.json(
                { error: 'Forbidden - Owner or Admin access required' },
                { status: 403 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        const validation = CreateUserSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            )
        }

        const { email, password, role, display_name } = validation.data

        // Admins cannot create owners or other admins
        if (profile.role === 'admin' && ['owner', 'admin'].includes(role)) {
            return NextResponse.json(
                { error: 'Admins cannot create owners or other admins' },
                { status: 403 }
            )
        }

        // Check if user already exists in portal_users
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

        // Create admin client for user creation (requires service role)
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

        // Create auth user directly with confirmed email (no invite email sent)
        const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Mark email as confirmed immediately
            user_metadata: {
                role,
                display_name: display_name || email.split('@')[0],
            }
        })

        if (createError) {
            console.error('[API] Error creating auth user:', createError)
            return NextResponse.json(
                { error: 'Failed to create user', details: createError.message },
                { status: 500 }
            )
        }

        // Create portal_users record
        const { error: portalUserError } = await adminClient
            .from('portal_users')
            .insert({
                id: newAuthUser.user.id,
                email,
                display_name: display_name || email.split('@')[0],
                role,
                is_active: true
            })

        if (portalUserError) {
            console.error('[API] Error creating portal user record:', portalUserError)
            // Roll back: delete the auth user
            try {
                await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
            } catch (rollbackErr) {
                console.error('[API] Failed to roll back auth user:', rollbackErr)
            }
            return NextResponse.json(
                { error: 'Failed to create user record. The user was not created.' },
                { status: 500 }
            )
        }

        // Log audit event
        try {
            await logAuditEvent({
                supabase,
                userId: user.id,
                userEmail: profile.email,
                userRole: profile.role,
                action: 'user.invite',
                entityType: 'portal_user',
                entityId: newAuthUser.user.id,
                entityName: display_name || email,
                newValues: { email, role, display_name, method: 'direct_create' },
                metadata: { created_by: profile.email }
            })
        } catch (auditError) {
            console.warn('[API] Failed to log audit event:', auditError)
        }

        return NextResponse.json({
            success: true,
            message: 'User created successfully',
            user: newAuthUser.user
        })

    } catch (error: any) {
        console.error('[API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
