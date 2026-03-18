'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Mail, UserPlus, Shield, Eye, ShieldCheck, Users, Crown, Sparkles, Lock, KeyRound } from 'lucide-react'
import { UserRole, USER_ROLE_DESCRIPTIONS } from '@/lib/settings/types'
import { GlassButton } from '@/components/ui/GlassButton'

interface InviteUserModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type AddMode = 'invite' | 'direct'

const ROLE_CONFIG: Record<UserRole, {
    icon: React.ElementType
    gradient: string
    bgColor: string
    borderColor: string
    iconBg: string
}> = {
    owner: {
        icon: Crown,
        gradient: 'from-purple-500/20 to-violet-500/10',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600'
    },
    admin: {
        icon: Shield,
        gradient: 'from-emerald-500/20 to-teal-500/10',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-300',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600'
    },
    manager: {
        icon: Users,
        gradient: 'from-blue-500/20 to-sky-500/10',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        iconBg: 'bg-gradient-to-br from-blue-500 to-sky-600'
    },
    moderator: {
        icon: ShieldCheck,
        gradient: 'from-amber-500/20 to-orange-500/10',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600'
    },
    viewer: {
        icon: Eye,
        gradient: 'from-gray-500/20 to-slate-500/10',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        iconBg: 'bg-gradient-to-br from-gray-500 to-slate-600'
    }
}

const ROLE_ORDER: UserRole[] = ['viewer', 'moderator', 'manager', 'admin', 'owner']

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
    const [mode, setMode] = useState<AddMode>('invite')
    const [email, setEmail] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [role, setRole] = useState<UserRole>('viewer')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('invite')
            setEmail('')
            setDisplayName('')
            setPassword('')
            setShowPassword(false)
            setRole('viewer')
            setError(null)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (mode === 'direct') {
                // Validate password client-side
                if (password.length < 8) {
                    throw new Error('Password must be at least 8 characters')
                }
                if (!/[A-Z]/.test(password)) {
                    throw new Error('Password must contain at least one uppercase letter')
                }
                if (!/[a-z]/.test(password)) {
                    throw new Error('Password must contain at least one lowercase letter')
                }
                if (!/[0-9]/.test(password)) {
                    throw new Error('Password must contain at least one number')
                }

                const response = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        display_name: displayName || undefined,
                        role
                    })
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to create user')
                }
            } else {
                const response = await fetch('/api/admin/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        display_name: displayName || undefined,
                        role
                    })
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to send invite')
                }
            }

            onSuccess()
            onClose()

        } catch (err: any) {
            setError(err.message || 'Operation failed')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const isDirectMode = mode === 'direct'
    const canSubmit = isDirectMode
        ? email && password.length >= 8
        : email

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
                {/* Glass card effect */}
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/95 via-white/90 to-white/85 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.5)_inset]">

                    {/* Decorative gradient orb */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-accent/30 to-purple-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 rounded-full blur-3xl" />

                    {/* Header */}
                    <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-sand-200/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/25">
                                    <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-primary">
                                    {isDirectMode ? 'Add Team Member' : 'Invite Team Member'}
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                                    {isDirectMode ? 'Create account with email & password' : 'Send an invitation email'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-sand-100 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="relative px-4 sm:px-6 pt-4 sm:pt-5">
                        <div className="flex items-center gap-1 p-1 bg-black/[0.04] rounded-xl w-full">
                            <button
                                type="button"
                                onClick={() => { setMode('invite'); setError(null) }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                                    !isDirectMode
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-primary'
                                }`}
                            >
                                <Mail className="w-3.5 h-3.5" />
                                Send Invite
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('direct'); setError(null) }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                                    isDirectMode
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-primary'
                                }`}
                            >
                                <KeyRound className="w-3.5 h-3.5" />
                                Add Directly
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 px-1">
                            {isDirectMode
                                ? 'User can log in immediately — no email verification needed.'
                                : 'User receives an email with a link to set their password.'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="relative p-4 sm:p-6 space-y-4 sm:space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label htmlFor="email" className="block text-sm font-semibold text-secondary">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="absolute start-3 sm:start-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full ps-10 sm:ps-12 pe-4 py-3 sm:py-3.5 rounded-xl border-2 border-sand-200 bg-white/50 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-muted-foreground/60 text-sm sm:text-base"
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>

                        {/* Password — only for direct mode */}
                        {isDirectMode && (
                            <div className="space-y-1.5 sm:space-y-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-secondary">
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute start-3 sm:start-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full ps-10 sm:ps-12 pe-12 py-3 sm:py-3.5 rounded-xl border-2 border-sand-200 bg-white/50 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-muted-foreground/60 text-sm sm:text-base"
                                        placeholder="Min 8 characters"
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute end-3 sm:end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {showPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-40" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-[11px] px-1">
                                        <span className={password.length >= 8 ? 'text-emerald-600' : 'text-muted-foreground'}>8+ chars</span>
                                        <span className={/[A-Z]/.test(password) ? 'text-emerald-600' : 'text-muted-foreground'}>Uppercase</span>
                                        <span className={/[a-z]/.test(password) ? 'text-emerald-600' : 'text-muted-foreground'}>Lowercase</span>
                                        <span className={/[0-9]/.test(password) ? 'text-emerald-600' : 'text-muted-foreground'}>Number</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Display Name */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label htmlFor="displayName" className="block text-sm font-semibold text-secondary">
                                Display Name <span className="font-normal text-muted-foreground text-xs">(Optional)</span>
                            </label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-3 sm:py-3.5 rounded-xl border-2 border-sand-200 bg-white/50 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-muted-foreground/60 text-sm sm:text-base"
                                placeholder="John Doe"
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2 sm:space-y-3">
                            <label className="block text-sm font-semibold text-secondary">
                                Select Role
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {ROLE_ORDER.map((r) => {
                                    const config = ROLE_CONFIG[r]
                                    const Icon = config.icon
                                    const isSelected = role === r

                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all text-left overflow-hidden group ${isSelected
                                                ? `${config.borderColor} bg-gradient-to-r ${config.gradient}`
                                                : 'border-sand-200 hover:border-sand-300 bg-white/50'
                                                }`}
                                        >
                                            {/* Icon */}
                                            <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105 ${isSelected ? config.iconBg : 'bg-sand-200'
                                                }`}>
                                                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold capitalize text-sm sm:text-base ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                                                    {r}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {USER_ROLE_DESCRIPTIONS[r]}
                                                </p>
                                            </div>

                                            {/* Selection indicator */}
                                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                ? `${config.borderColor} ${config.bgColor}`
                                                : 'border-sand-300'
                                                }`}>
                                                {isSelected && (
                                                    <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${config.iconBg}`} />
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                                <span className="text-xs sm:text-sm">{error}</span>
                            </div>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="relative p-4 sm:p-6 pt-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <GlassButton
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="flex-1 order-2 sm:order-1"
                        >
                            Cancel
                        </GlassButton>
                        <GlassButton
                            variant="accent"
                            size="sm"
                            onClick={handleSubmit}
                            disabled={loading || !canSubmit}
                            isLoading={loading}
                            leftIcon={isDirectMode ? <UserPlus className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                            className="flex-1 order-1 sm:order-2"
                        >
                            {isDirectMode ? 'Create User' : 'Send Invite'}
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
