/**
 * Settings Queries
 * Database query functions for settings management
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
    LoyaltyTier,
    SystemSetting,
    SystemSettingKey,
    GeneralSettings,
    PortalUser,
    Currency,
    MeasurementUnits
} from './types'

/**
 * Get a single system setting by key
 */
export async function getSystemSetting<T = any>(
    supabase: SupabaseClient,
    key: SystemSettingKey
): Promise<T | null> {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single()

    if (error) {
        console.error(`[Settings] Error fetching ${key}:`, error.message)
        return null
    }

    return data?.value as T
}

/**
 * Update a system setting
 */
export async function updateSystemSetting(
    supabase: SupabaseClient,
    key: SystemSettingKey,
    value: any,
    userId?: string
): Promise<boolean> {
    const updateData: any = { value }
    if (userId) updateData.updated_by = userId

    const { error } = await supabase
        .from('system_settings')
        .update(updateData)
        .eq('key', key)

    if (error) {
        console.error(`[Settings] Error updating ${key}:`, error.message)
        return false
    }

    return true
}

/**
 * Get all system settings
 */
export async function getAllSystemSettings(
    supabase: SupabaseClient
): Promise<SystemSetting[]> {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true })

    if (error) {
        console.error('[Settings] Error fetching all settings:', error.message)
        return []
    }

    return data || []
}

/**
 * Get currency configuration
 */
export async function getCurrency(
    supabase: SupabaseClient
): Promise<Currency> {
    const currency = await getSystemSetting<Currency>(supabase, 'currency.default')

    // Fallback to QAR if not found
    return currency || {
        code: 'QAR',
        symbol: 'ر.ق',
        name: 'Qatari Riyal',
        decimal_places: 2
    }
}

/**
 * Get measurement units configuration
 */
export async function getMeasurementUnits(
    supabase: SupabaseClient
): Promise<MeasurementUnits> {
    const units = await getSystemSetting<MeasurementUnits>(supabase, 'units.measurement')

    return units || {
        system: 'metric',
        unit: 'cm'
    }
}

/**
 * Get all loyalty tiers, sorted by min spend
 */
export async function getLoyaltyTiers(
    supabase: SupabaseClient
): Promise<LoyaltyTier[]> {
    const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('min_spend_minor', { ascending: true })

    if (error) {
        console.error('[Settings] Error fetching loyalty tiers:', error.message)
        return []
    }

    return data || []
}

/**
 * Upsert a loyalty tier
 * Returns null on success, or error message on failure
 */
export async function upsertLoyaltyTier(
    supabase: SupabaseClient,
    tier: Partial<LoyaltyTier>
): Promise<string | null> {
    let error;

    const id = tier.id;

    if (id) {
        // Update existing
        // Remove ID from payload to avoid confusion
        const { id: _, ...updateData } = tier;

        const result = await supabase
            .from('loyalty_tiers')
            .update(updateData)
            .eq('id', id);
        error = result.error;
    } else {
        // Insert new
        // Ensure we don't pass undefined ID
        const { id: _, ...tierData } = tier;
        const result = await supabase
            .from('loyalty_tiers')
            .insert(tierData);
        error = result.error;
    }

    if (error) {
        console.error('[Settings] Error upserting loyalty tier:', error.message)
        return error.message || 'Unknown error occurred'
    }

    return null
}

/**
 * Delete a loyalty tier
 * Returns null on success, or error message on failure
 */
export async function deleteLoyaltyTier(
    supabase: SupabaseClient,
    id: string
): Promise<string | null> {
    const { error } = await supabase
        .from('loyalty_tiers')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[Settings] Error deleting loyalty tier:', error.message)
        return error.message || 'Unknown error occurred'
    }

    return null
}

/**
 * Get general settings
 */
export async function getGeneralSettings(
    supabase: SupabaseClient
): Promise<GeneralSettings | null> {
    const { data, error } = await supabase
        .from('general_settings')
        .select('*')
        .limit(1)
        .single()

    if (error) {
        console.error('[Settings] Error fetching general settings:', error.message)
        return null
    }

    return data
}

/**
 * Update general settings
 */
export async function updateGeneralSettings(
    supabase: SupabaseClient,
    settings: Partial<GeneralSettings>,
    userId?: string
): Promise<boolean> {
    const updateData: any = { ...settings }
    if (userId) updateData.updated_by = userId
    delete updateData.id
    delete updateData.created_at
    delete updateData.updated_at

    const { error } = await supabase
        .from('general_settings')
        .update(updateData)
        .eq('id', settings.id || '')

    if (error) {
        console.error('[Settings] Error updating general settings:', error.message)
        return false
    }

    return true
}

/**
 * Get all portal users
 */
export async function getPortalUsers(
    supabase: SupabaseClient,
    includeInactive = false
): Promise<PortalUser[]> {
    let query = supabase
        .from('portal_users')
        .select('*')
        .order('created_at', { ascending: false })

    if (!includeInactive) {
        query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
        console.error('[Settings] Error fetching portal users:', error.message)
        return []
    }

    return data || []
}

/**
 * Update portal user
 */
export async function updatePortalUser(
    supabase: SupabaseClient,
    userId: string,
    updates: Partial<PortalUser>
): Promise<boolean> {
    const { error } = await supabase
        .from('portal_users')
        .update(updates)
        .eq('id', userId)

    if (error) {
        console.error('[Settings] Error updating portal user:', error.message)
        return false
    }

    return true
}

/**
 * Deactivate portal user (soft delete)
 */
export async function deactivatePortalUser(
    supabase: SupabaseClient,
    userId: string
): Promise<boolean> {
    return updatePortalUser(supabase, userId, { is_active: false })
}

/**
 * Trigger recalculation of all customer tiers (client-side helper)
 * Note: This only calls the RPC. Revalidation happens in the Server Action.
 */
export async function recalculateCustomerTiers(
    supabase: SupabaseClient
): Promise<void> {
    const { error } = await supabase.rpc('recalculate_all_customer_tiers')

    if (error) {
        console.error('[Settings] Error recalculating tiers:', error.message)
    }
}
