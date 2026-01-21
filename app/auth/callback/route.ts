import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth Callback Route
 * Handles Supabase auth callbacks for:
 * - Email confirmations
 * - Password reset tokens
 * - Invite acceptance tokens
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)

    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/dashboard'

    const supabase = await createClient()

    // Handle PKCE code exchange (newer flow)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
            console.error('[Auth Callback] Code exchange error:', error)
            return NextResponse.redirect(`${origin}/login?error=auth_error`)
        }

        // For invite flow, redirect to set password
        if (type === 'invite' || type === 'signup') {
            return NextResponse.redirect(`${origin}/reset-password?type=invite`)
        }

        return NextResponse.redirect(`${origin}${next}`)
    }

    // Handle token hash (older flow - recovery, invite)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any
        })

        if (error) {
            console.error('[Auth Callback] OTP verification error:', error)
            return NextResponse.redirect(`${origin}/login?error=invalid_token`)
        }

        // Redirect based on type
        switch (type) {
            case 'recovery':
                // Password reset - go to reset password page
                return NextResponse.redirect(`${origin}/reset-password?type=recovery`)
            case 'invite':
            case 'signup':
                // New user invite - go to set password page
                return NextResponse.redirect(`${origin}/reset-password?type=invite`)
            case 'email':
                // Email confirmation - go to dashboard
                return NextResponse.redirect(`${origin}/dashboard`)
            default:
                return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // If no code or token_hash, something went wrong
    console.error('[Auth Callback] No code or token_hash provided')
    return NextResponse.redirect(`${origin}/login?error=missing_params`)
}
