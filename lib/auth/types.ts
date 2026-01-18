/**
 * Auth Types
 * TypeScript definitions for authentication and user data
 */

import { UserRole } from '@/lib/settings/types'

export interface AuthUser {
    id: string
    email: string
}

export interface PortalUserProfile {
    id: string
    email: string
    display_name?: string
    full_name?: string
    role: UserRole
    avatar_url?: string
    is_active: boolean
    last_login?: string
    created_at: string
    updated_at: string
}

export interface AuthContextValue {
    user: AuthUser | null
    profile: PortalUserProfile | null
    loading: boolean
    error: string | null
    refreshProfile: () => Promise<void>
}

