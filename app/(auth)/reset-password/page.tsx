'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const type = searchParams.get('type') // 'recovery' or 'invite'

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const isInvite = type === 'invite'
    const title = isInvite ? 'Set Your Password' : 'Reset Password'
    const subtitle = isInvite
        ? 'Create a password to complete your account setup.'
        : 'Enter your new password below.'

    // Check if user has a valid session
    useEffect(() => {
        const checkSession = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                // No session - token might be expired
                setError('Your session has expired. Please request a new link.')
            }
        }
        checkSession()
    }, [])

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters'
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain at least one uppercase letter'
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password must contain at least one lowercase letter'
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain at least one number'
        }
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        // Validate password strength
        const passwordError = validatePassword(password)
        if (passwordError) {
            setError(passwordError)
            return
        }

        setLoading(true)

        try {
            const supabase = createClient()

            const { error: updateError } = await supabase.auth.updateUser({
                password
            })

            if (updateError) {
                console.error('[Reset Password] Error:', updateError)
                throw updateError
            }

            setSuccess(true)

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)

        } catch (err: any) {
            setError(err.message || 'Failed to update password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
            {/* Background gradient using theme colors */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(135deg, var(--theme-gradient-from, #667eea) 0%, var(--theme-gradient-via, #764ba2) 50%, var(--theme-gradient-to, #8B5CF6) 100%)`
                }}
            />

            {/* Concentric Circle Vectors Overlay */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 opacity-20" viewBox="0 0 1000 1000">
                    {[...Array(12)].map((_, i) => (
                        <circle
                            key={i}
                            cx="500"
                            cy="500"
                            r={100 + i * 60}
                            fill="none"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth="0.5"
                        />
                    ))}
                </svg>
            </div>

            {/* Glassmorphism Card */}
            <div
                className="relative z-10 w-[92%] max-w-[450px] mx-auto p-8 sm:p-10"
                style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
            >
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-lg">
                        <span className="text-white text-2xl font-bold tracking-wide">S</span>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                        {title}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {subtitle}
                    </p>
                </div>

                {success ? (
                    /* Success State */
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-gray-700 font-medium">
                            Password updated successfully!
                        </p>
                        <p className="text-gray-500 text-sm">
                            Redirecting to dashboard...
                        </p>
                    </div>
                ) : error && !password ? (
                    /* Session Error State */
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-gray-700">
                            {error}
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-block mt-4 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
                        >
                            Request New Link
                        </Link>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    className="w-full pl-12 pr-12 py-3 bg-white/70 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                    style={{ borderRadius: '12px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    className="w-full pl-12 pr-12 py-3 bg-white/70 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                    style={{ borderRadius: '12px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="text-xs text-gray-500 space-y-1">
                            <p className={password.length >= 8 ? 'text-green-600' : ''}>
                                • At least 8 characters
                            </p>
                            <p className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                                • One uppercase letter
                            </p>
                            <p className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                                • One lowercase letter
                            </p>
                            <p className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                                • One number
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ borderRadius: '12px' }}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Updating...
                                </>
                            ) : (
                                isInvite ? 'Create Password' : 'Reset Password'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
