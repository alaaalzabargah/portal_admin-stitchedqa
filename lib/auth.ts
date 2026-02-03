'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAuthUser() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function loadUser() {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    // Create profile from auth user (no users table needed)
                    setProfile({
                        id: user.id,
                        email: user.email,
                        role: 'owner', // Default to owner - update this when you have a users table
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
                    })
                }
            } catch (err) {
                console.error('Error loading user:', err)
            }
            setLoading(false)
        }

        loadUser()
    }, [])

    return { profile, loading }
}
