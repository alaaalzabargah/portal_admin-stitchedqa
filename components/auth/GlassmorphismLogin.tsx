'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n/context'

// ============================================
// CONFIGURABLE ASSETS - Easy to swap
// ============================================
const ASSETS = {
    backgroundImage: '/images/login-bg.jpg', // Replace with your background image
    logoImage: '/images/logo.png',           // Replace with your logo

}


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

// ============================================
// GLASSMORPHISM LOGIN COMPONENT
// ============================================
export function GlassmorphismLogin() {
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useLanguage()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Add your authentication logic here
        console.log({ email, password, rememberMe })
        setTimeout(() => setIsLoading(false), 1500)
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${ASSETS.backgroundImage})` }}
            />

            {/* Fallback gradient if no image */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800" />

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
                        {/* Replace with your logo image */}
                        <span className="text-white text-2xl font-bold">S</span>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                        {t('auth.welcome_back')}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {t('auth.sign_in_subtitle')}
                    </p>
                </div>

                {/* OR Separator */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="text-gray-400 text-sm font-medium">{t('auth.or')}</span>
                    <div className="flex-1 h-px bg-gray-300" />
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('auth.email')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('auth.email_placeholder')}
                            required
                            className="w-full px-4 py-3 bg-white/70 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            {t('auth.password')}
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('auth.password_placeholder')}
                                required
                                className="w-full px-4 py-3 pr-12 bg-white/70 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
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
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600">{t('auth.remember_me')}</span>
                        </label>
                        <a
                            href="#"
                            className="text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                        >
                            {t('auth.forgot_password')}
                        </a>
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ borderRadius: '12px' }}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                {t('auth.signing_in')}
                            </>
                        ) : (
                            t('auth.sign_in')
                        )}
                    </button>
                </form>

                {/* Sign Up Link */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    {t('auth.no_account')}{' '}
                    <a href="#" className="text-gray-900 font-semibold hover:underline">
                        {t('auth.sign_up')}
                    </a>
                </p>
            </div>
        </div>
    )
}

export default GlassmorphismLogin
