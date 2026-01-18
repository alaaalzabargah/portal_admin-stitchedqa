/**
 * Admin Users API - Update User
 * PATCH /api/admin/users/[id]
 * Owner/Admin only - update user display_name, role, or is_active
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateUserSchema } from '@/lib/api/validation'
import { logAuditEvent, AuditAction } from '@/lib/audit'
import { USER_ROLE_LEVELS } from '@/lib/settings/types'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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

        // Get target user's current data
        const { data: targetUser, error: targetError } = await supabase
            .from('portal_users')
            .select('*')
            .eq('id', id)
            .single()

        if (targetError || !targetUser) {
            return NextResponse.json(
                { error: 'Target user not found' },
                { status: 404 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        const validation = UpdateUserSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            )
        }

        const updates = validation.data

        // Permission checks for role changes
        if (updates.role) {
            const currentUserLevel = USER_ROLE_LEVELS[profile.role as keyof typeof USER_ROLE_LEVELS] || 0
            const targetCurrentLevel = USER_ROLE_LEVELS[targetUser.role as keyof typeof USER_ROLE_LEVELS] || 0
            const targetNewLevel = USER_ROLE_LEVELS[updates.role as keyof typeof USER_ROLE_LEVELS] || 0

            // Can't modify users at same or higher level (unless owner)
            if (profile.role !== 'owner' && targetCurrentLevel >= currentUserLevel) {
                return NextResponse.json(
                    { error: 'Cannot modify users at same or higher permission level' },
                    { status: 403 }
                )
            }

            // Can't promote users to same or higher level than yourself (unless owner)
            if (profile.role !== 'owner' && targetNewLevel >= currentUserLevel) {
                return NextResponse.json(
                    { error: 'Cannot promote users to your level or higher' },
                    { status: 403 }
                )
            }

            // Owners cannot demote themselves
            if (targetUser.id === user.id && profile.role === 'owner' && updates.role !== 'owner') {
                return NextResponse.json(
                    { error: 'Owners cannot demote themselves' },
                    { status: 403 }
                )
            }
        }

        // Prevent disabling self
        if (updates.is_active === false && targetUser.id === user.id) {
            return NextResponse.json(
                { error: 'Cannot disable your own account' },
                { status: 403 }
            )
        }

        // Update user
        const { data: updatedUser, error: updateError } = await supabase
            .from('portal_users')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('[API] Error updating user:', updateError)
            return NextResponse.json(
                { error: 'Failed to update user' },
                { status: 500 }
            )
        }

        // Determine audit action
        let action: AuditAction = 'user.update'
        if (updates.role && updates.role !== targetUser.role) {
            action = 'user.role_change'
        } else if (updates.is_active !== undefined && updates.is_active !== targetUser.is_active) {
            action = updates.is_active ? 'user.enable' : 'user.disable'
        }

        // Log audit event (don't fail if audit log fails)
        try {
            await logAuditEvent({
                supabase,
                userId: user.id,
                userEmail: profile.email,
                userRole: profile.role,
                action,
                entityType: 'portal_user',
                entityId: id,
                entityName: targetUser.display_name || targetUser.email,
                oldValues: {
                    display_name: targetUser.display_name,
                    role: targetUser.role,
                    is_active: targetUser.is_active
                },
                newValues: updates,
                metadata: { updated_by: profile.email }
            })
        } catch (auditError) {
            console.warn('[API] Failed to log audit event:', auditError)
        }

        return NextResponse.json({ user: updatedUser })

    } catch (error: any) {
        console.error('[API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/users/[id]
 * Owner/Admin only - delete a user
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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

        // Get target user
        const { data: targetUser, error: targetError } = await supabase
            .from('portal_users')
            .select('*')
            .eq('id', id)
            .single()

        if (targetError || !targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Permission checks
        const myLevel = USER_ROLE_LEVELS[profile.role as keyof typeof USER_ROLE_LEVELS] || 0
        const targetLevel = USER_ROLE_LEVELS[targetUser.role as keyof typeof USER_ROLE_LEVELS] || 0

        // Cannot delete self
        if (targetUser.id === user.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 403 }
            )
        }

        // Cannot delete users at same or higher level (unless owner)
        if (profile.role !== 'owner' && targetLevel >= myLevel) {
            return NextResponse.json(
                { error: 'Cannot delete users at same or higher permission level' },
                { status: 403 }
            )
        }

        // Cannot delete owners
        if (targetUser.role === 'owner') {
            return NextResponse.json(
                { error: 'Cannot delete owner accounts' },
                { status: 403 }
            )
        }

        // Delete from portal_users (auth.users deletion requires admin client)
        const { error: deleteError } = await supabase
            .from('portal_users')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('[API] Error deleting user:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete user' },
                { status: 500 }
            )
        }

        // Log audit event (don't fail if audit log fails)
        try {
            await logAuditEvent({
                supabase,
                userId: user.id,
                userEmail: profile.email,
                userRole: profile.role,
                action: 'user.delete',
                entityType: 'portal_user',
                entityId: id,
                entityName: targetUser.display_name || targetUser.email,
                oldValues: {
                    email: targetUser.email,
                    display_name: targetUser.display_name,
                    role: targetUser.role
                },
                metadata: { deleted_by: profile.email }
            })
        } catch (auditError) {
            console.warn('[API] Failed to log audit event:', auditError)
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' })

    } catch (error: any) {
        console.error('[API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
