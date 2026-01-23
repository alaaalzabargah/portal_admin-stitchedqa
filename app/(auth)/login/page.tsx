'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { login } from './actions'

import { IMAGES } from '@/lib/constants/images'

// ============================================
// CONFIGURABLE ASSETS - Easy to swap
// ============================================
const ASSETS = {
    backgroundImage: '/images/login-bg.jpg', // Replace with your background image
    logoImage: IMAGES.LOGO,                  // Use the constant
}

// Fallback SVG icons
const AppleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
)

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
)

const LinkedInIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
)

const EyeIcon = ({ open }: { open: boolean }) => (
    open ? (
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ) : (
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    )
)

const initialState = {
    error: '',
}

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${ASSETS.backgroundImage})` }}
            />

            {/* Fallback gradient if no image - uses theme colors */}
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
                    <img
                        src={ASSETS.logoImage}
                        alt="Logo"
                        className="h-16 w-auto object-contain invert dark:invert-0"
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                        Welcome back
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Sign in to continue to your account
                    </p>
                </div>

                {/* Login Form - Using Server Action */}
                <form action={formAction} className="space-y-5">
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            className="w-full px-4 py-3 bg-white/70 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 pr-12 bg-white/70 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                style={{ borderRadius: '12px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <EyeIcon open={showPassword} />
                            </button>
                        </div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600">Remember me</span>
                        </label>
                        <a
                            href="/forgot-password"
                            className="text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                        >
                            Forgot password?
                        </a>
                    </div>

                    {/* Error Message */}
                    {state?.error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center border border-red-100">
                            {state.error}
                        </div>
                    )}

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ borderRadius: '12px' }}
                    >
                        {isPending ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Signing in...
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    Restricted Access. Authorized Personnel Only.
                </p>
            </div>
        </div>
    )
}
