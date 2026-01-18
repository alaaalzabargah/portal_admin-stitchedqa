'use client'

/**
 * Auth Context
 * Provides logged-in user data throughout the app
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthContextValue, AuthUser, PortalUserProfile } from './types'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [profile, setProfile] = useState<PortalUserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    const supabase = createClient()

    // Prevent hydration mismatch by only rendering user data after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    const loadUserData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Get auth user
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

            if (authError) {
                console.error('[Auth] Error fetching user:', authError.message)
                setError(authError.message)
                setUser(null)
                setProfile(null)
                setLoading(false)
                return
            }

            if (!authUser) {
                setUser(null)
                setProfile(null)
                setLoading(false)
                return
            }

            // Set auth user
            setUser({
                id: authUser.id,
                email: authUser.email || ''
            })

            // Guard against undefined user ID before fetching profile
            if (!authUser.id) {
                console.warn('[Auth] authUser found but ID is missing. Cannot fetch profile.')
                setProfile(null)
                setLoading(false)
                return
            }

            // Fetch portal user profile
            const { data: portalUser, error: profileError } = await supabase
                .from('portal_users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (profileError) {
                console.error('[Auth] Error fetching profile:', profileError.message)
                setError(profileError.message)
            } else if (portalUser) {
                setProfile(portalUser as PortalUserProfile)
            }

        } catch (err: any) {
            console.error('[Auth] Unexpected error:', err)
            setError(err.message || 'Failed to load user data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Only load user data after mount to prevent SSR issues
        if (mounted) {
            loadUserData()
        }
    }, [mounted])

    useEffect(() => {
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || ''
                })
                loadUserData()
            } else {
                setUser(null)
                setProfile(null)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const refreshProfile = async () => {
        await loadUserData()
    }

    // During SSR or before mount, return loading state to prevent hydration mismatch
    const contextValue = mounted
        ? { user, profile, loading, error, refreshProfile }
        : { user: null, profile: null, loading: true, error: null, refreshProfile }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuthUser() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuthUser must be used within an AuthProvider')
    }
    return context
}
