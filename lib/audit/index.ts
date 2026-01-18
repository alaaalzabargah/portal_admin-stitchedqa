/**
 * Audit Logging Library
 * Functions for logging user actions and retrieving audit history
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Action types for type safety
export type AuditAction =
    // User management
    | 'user.invite'
    | 'user.update'
    | 'user.role_change'
    | 'user.enable'
    | 'user.disable'
    | 'user.delete'
    | 'user.login'
    | 'user.logout'
    // Customer actions
    | 'customer.create'
    | 'customer.update'
    | 'customer.delete'
    | 'customer.bulk_delete'
    // Order actions
    | 'order.create'
    | 'order.update'
    | 'order.status_change'
    // Settings
    | 'settings.update'
    | 'settings.tier_update'
    // Finance
    | 'finance.export'
    | 'expense.create'
    | 'expense.update'
    | 'expense.delete'

export type ActionCategory =
    | 'user_management'
    | 'customer'
    | 'order'
    | 'settings'
    | 'finance'
    | 'general'

export interface AuditLogEntry {
    id: string
    created_at: string
    user_id: string | null
    user_email: string | null
    user_role: string | null
    action: AuditAction
    action_category: ActionCategory
    entity_type: string
    entity_id: string | null
    entity_name: string | null
    old_values: Record<string, any> | null
    new_values: Record<string, any> | null
    changes_summary: string | null
    metadata: Record<string, any> | null
    ip_address: string | null
    user_agent: string | null
}

export interface LogAuditEventParams {
    supabase: SupabaseClient
    userId: string
    userEmail: string
    userRole?: string
    action: AuditAction
    entityType: string
    entityId?: string
    entityName?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
}

/**
 * Map action to its category
 */
function getActionCategory(action: AuditAction): ActionCategory {
    if (action.startsWith('user.')) return 'user_management'
    if (action.startsWith('customer.')) return 'customer'
    if (action.startsWith('order.')) return 'order'
    if (action.startsWith('settings.')) return 'settings'
    if (action.startsWith('finance.') || action.startsWith('expense.')) return 'finance'
    return 'general'
}

/**
 * Generate a human-readable summary of changes
 */
function generateChangesSummary(
    action: AuditAction,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
): string {
    if (!oldValues && !newValues) {
        return action.replace('.', ': ').replace('_', ' ')
    }

    const changes: string[] = []

    if (oldValues && newValues) {
        for (const key of Object.keys(newValues)) {
            if (oldValues[key] !== newValues[key]) {
                changes.push(`${key}: ${oldValues[key]} → ${newValues[key]}`)
            }
        }
    } else if (newValues) {
        for (const [key, value] of Object.entries(newValues)) {
            if (value !== undefined && value !== null) {
                changes.push(`${key}: ${value}`)
            }
        }
    }

    return changes.length > 0 ? changes.join(', ') : action.replace('.', ': ')
}

/**
 * Log an audit event
 */
export async function logAuditEvent({
    supabase,
    userId,
    userEmail,
    userRole,
    action,
    entityType,
    entityId,
    entityName,
    oldValues,
    newValues,
    metadata,
    ipAddress,
    userAgent
}: LogAuditEventParams): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.from('audit_logs').insert({
            user_id: userId,
            user_email: userEmail,
            user_role: userRole || null,
            action,
            action_category: getActionCategory(action),
            entity_type: entityType,
            entity_id: entityId || null,
            entity_name: entityName || null,
            old_values: oldValues || null,
            new_values: newValues || null,
            changes_summary: generateChangesSummary(action, oldValues, newValues),
            metadata: metadata || null,
            ip_address: ipAddress || null,
            user_agent: userAgent || null
        })

        if (error) {
            console.error('[Audit] Failed to log event:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[Audit] Unexpected error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Get audit logs with pagination and filtering
 */
export async function getAuditLogs(
    supabase: SupabaseClient,
    options: {
        limit?: number
        offset?: number
        category?: ActionCategory
        action?: AuditAction
        userId?: string
        entityType?: string
        entityId?: string
        startDate?: string
        endDate?: string
    } = {}
): Promise<{ logs: AuditLogEntry[]; count: number; error?: string }> {
    try {
        const {
            limit = 50,
            offset = 0,
            category,
            action,
            userId,
            entityType,
            entityId,
            startDate,
            endDate
        } = options

        let query = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (category) query = query.eq('action_category', category)
        if (action) query = query.eq('action', action)
        if (userId) query = query.eq('user_id', userId)
        if (entityType) query = query.eq('entity_type', entityType)
        if (entityId) query = query.eq('entity_id', entityId)
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)

        const { data, count, error } = await query

        if (error) {
            console.error('[Audit] Failed to fetch logs:', error)
            return { logs: [], count: 0, error: error.message }
        }

        return { logs: data || [], count: count || 0 }
    } catch (err: any) {
        console.error('[Audit] Unexpected error:', err)
        return { logs: [], count: 0, error: err.message }
    }
}

/**
 * Get action label for display
 */
export function getActionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
        'user.invite': 'Invited User',
        'user.update': 'Updated User',
        'user.role_change': 'Changed Role',
        'user.enable': 'Enabled User',
        'user.disable': 'Disabled User',
        'user.delete': 'Deleted User',
        'user.login': 'Logged In',
        'user.logout': 'Logged Out',
        'customer.create': 'Created Customer',
        'customer.update': 'Updated Customer',
        'customer.delete': 'Deleted Customer',
        'customer.bulk_delete': 'Bulk Deleted Customers',
        'order.create': 'Created Order',
        'order.update': 'Updated Order',
        'order.status_change': 'Changed Order Status',
        'settings.update': 'Updated Settings',
        'settings.tier_update': 'Updated Loyalty Tier',
        'finance.export': 'Exported Report',
        'expense.create': 'Created Expense',
        'expense.update': 'Updated Expense',
        'expense.delete': 'Deleted Expense'
    }
    return labels[action] || action
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: ActionCategory): string {
    const labels: Record<ActionCategory, string> = {
        user_management: 'User Management',
        customer: 'Customers',
        order: 'Orders',
        settings: 'Settings',
        finance: 'Finance',
        general: 'General'
    }
    return labels[category] || category
}
