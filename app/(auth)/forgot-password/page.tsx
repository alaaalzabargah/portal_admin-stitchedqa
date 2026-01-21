'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { sendPasswordResetEmail } from './actions'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

const initialState: { error?: string; success?: boolean; message?: string } = {}

export default function ForgotPasswordPage() {
    const [state, formAction, isPending] = useActionState(sendPasswordResetEmail, initialState)

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
                {/* Back to Login */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                </Link>

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-lg">
                        <span className="text-white text-2xl font-bold tracking-wide">S</span>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                        Forgot Password?
                    </h1>
                    <p className="text-gray-500 text-sm">
                        No worries, we'll send you reset instructions.
                    </p>
                </div>

                {state?.success ? (
                    /* Success State */
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-gray-700 text-sm">
                            {state.message}
                        </p>
                        <p className="text-gray-500 text-xs">
                            Check your spam folder if you don't see it.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block mt-4 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
                        >
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    /* Form */
                    <form action={formAction} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-white/70 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                    style={{ borderRadius: '12px' }}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {state?.error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center border border-red-100">
                                {state.error}
                            </div>
                        )}

                        {/* Submit Button */}
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
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    Remember your password?{' '}
                    <Link href="/login" className="text-gray-600 hover:text-gray-900 hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
