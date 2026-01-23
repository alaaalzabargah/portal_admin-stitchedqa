'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Auth Callback Page (Client-Side)
 * Handles Supabase auth callbacks with tokens in URL hash fragments.
 * This is needed because hash fragments are not sent to the server.
 */
export default function AuthCallbackPage() {
    const router = useRouter()
    const [status, setStatus] = useState('Processing...')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const supabase = createClient()

                // Get the hash fragment (everything after #)
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')
                const type = hashParams.get('type')

                // Also check URL search params
                const searchParams = new URLSearchParams(window.location.search)
                const code = searchParams.get('code')
                const urlType = searchParams.get('type') || type

                console.log('[Auth Callback] Processing:', {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    hasCode: !!code,
                    type: urlType
                })

                // Handle PKCE code flow (newer)
                if (code) {
                    setStatus('Exchanging code...')
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                    if (exchangeError) {
                        console.error('[Auth Callback] Code exchange error:', exchangeError)
                        setError('Authentication failed. Please try again.')
                        return
                    }
                }
                // Handle implicit flow with tokens in hash
                else if (accessToken && refreshToken) {
                    setStatus('Setting session...')
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })
                    if (sessionError) {
                        console.error('[Auth Callback] Session error:', sessionError)
                        setError('Failed to set session. Please try again.')
                        return
                    }
                }
                else {
                    // No tokens - check if we already have a session
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) {
                        setError('No authentication token found.')
                        return
                    }
                }

                // Redirect based on type
                if (urlType === 'invite' || urlType === 'signup') {
                    setStatus('Redirecting to set password...')
                    router.replace('/reset-password?type=invite')
                } else if (urlType === 'recovery') {
                    setStatus('Redirecting to reset password...')
                    router.replace('/reset-password?type=recovery')
                } else {
                    setStatus('Redirecting to dashboard...')
                    router.replace('/dashboard')
                }
            } catch (err) {
                console.error('[Auth Callback] Error:', err)
                setError('An unexpected error occurred.')
            }
        }

        handleCallback()
    }, [router])

    // Show loading state
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
                {error ? (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <a
                            href="/login"
                            className="inline-block px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Go to Login
                        </a>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-600 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Authenticating</h2>
                        <p className="text-gray-600">{status}</p>
                    </>
                )}
            </div>
        </div>
    )
}
