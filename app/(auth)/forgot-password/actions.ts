'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendPasswordResetEmail(prevState: any, formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Please enter your email address' }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: 'Please enter a valid email address' }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
    })

    if (error) {
        console.error('[Forgot Password] Error sending reset email:', error)
        // Don't reveal if email exists or not for security
        // Always show success message
    }

    // Always return success for security (don't reveal if email exists)
    return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link shortly.'
    }
}
