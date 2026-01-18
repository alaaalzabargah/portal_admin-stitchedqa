/**
 * Settings Types
 * TypeScript definitions for system and general settings
 */

export interface Currency {
    code: string
    symbol: string
    name: string
    decimal_places: number
}

export interface MeasurementUnits {
    system: 'metric' | 'imperial'
    unit: 'cm' | 'in'
}

export interface LoyaltyTier {
    id: string
    name: string
    min_spend_minor: number
    color: string
}

export interface SystemSetting {
    id: string
    key: string
    value: any
    category: string
    description?: string
    updated_at: string
    updated_by?: string
}

export interface GeneralSettings {
    id: string
    store_name: string
    store_description?: string
    contact_email?: string
    phone?: string
    address?: string
    logo_url?: string
    updated_at: string
    updated_by?: string
}

// User role type - ordered by permission level (highest to lowest)
export type UserRole = 'owner' | 'admin' | 'manager' | 'editor' | 'viewer'

export const USER_ROLE_LEVELS: Record<UserRole, number> = {
    owner: 5,
    admin: 4,
    manager: 3,
    editor: 2,
    viewer: 1
}

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    owner: 'Full access including team management and all settings',
    admin: 'Manage users (except owners) and all features',
    manager: 'Manage customers, orders, and view finance',
    editor: 'Create and edit customers and orders',
    viewer: 'Read-only access to view data'
}

export interface PortalUser {
    id: string
    email: string
    display_name?: string
    full_name?: string
    role: UserRole
    avatar_url?: string
    last_login?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export type SystemSettingKey =
    | 'currency.default'
    | 'units.measurement'
    | 'loyalty.gold_threshold'
    | 'loyalty.vip_threshold'
