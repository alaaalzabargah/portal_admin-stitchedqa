'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Mail, UserPlus, Shield, Eye, Edit, Users, Crown, Sparkles } from 'lucide-react'
import { UserRole, USER_ROLE_DESCRIPTIONS } from '@/lib/settings/types'
import { GlassButton } from '@/components/ui/GlassButton'

interface InviteUserModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

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
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-300 dark:border-purple-600',
        iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600'
    },
    admin: {
        icon: Shield,
        gradient: 'from-emerald-500/20 to-teal-500/10',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-300 dark:border-emerald-600',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600'
    },
    manager: {
        icon: Users,
        gradient: 'from-blue-500/20 to-sky-500/10',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-300 dark:border-blue-600',
        iconBg: 'bg-gradient-to-br from-blue-500 to-sky-600'
    },
    editor: {
        icon: Edit,
        gradient: 'from-amber-500/20 to-orange-500/10',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-300 dark:border-amber-600',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600'
    },
    viewer: {
        icon: Eye,
        gradient: 'from-gray-500/20 to-slate-500/10',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-300 dark:border-gray-600',
        iconBg: 'bg-gradient-to-br from-gray-500 to-slate-600'
    }
}

const ROLE_ORDER: UserRole[] = ['viewer', 'editor', 'manager', 'admin', 'owner']

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
    const [email, setEmail] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [role, setRole] = useState<UserRole>('viewer')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setEmail('')
            setDisplayName('')
            setRole('viewer')
            setError(null)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
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

            onSuccess()
            onClose()

        } catch (err: any) {
            setError(err.message || 'Failed to send invite')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

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
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/95 via-white/90 to-white/85 dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-zinc-900/85 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.5)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset]">

                    {/* Decorative gradient orb */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-accent/30 to-purple-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 rounded-full blur-3xl" />

                    {/* Header */}
                    <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-sand-200/50 dark:border-zinc-700/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/25">
                                    <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-primary dark:text-white">Invite Team Member</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Add a new member to your team</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-sand-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="relative p-4 sm:p-6 space-y-4 sm:space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label htmlFor="email" className="block text-sm font-semibold text-secondary dark:text-zinc-300">
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
                                    className="w-full ps-10 sm:ps-12 pe-4 py-3 sm:py-3.5 rounded-xl border-2 border-sand-200 dark:border-zinc-600 bg-white/50 dark:bg-zinc-800/50 dark:text-white focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-muted-foreground/60 text-sm sm:text-base"
                                    placeholder="user@example.com"
                                />
                            </div>
                        </div>

                        {/* Display Name */}
                        <div className="space-y-1.5 sm:space-y-2">
                            <label htmlFor="displayName" className="block text-sm font-semibold text-secondary dark:text-zinc-300">
                                Display Name <span className="font-normal text-muted-foreground text-xs">(Optional)</span>
                            </label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-3 sm:py-3.5 rounded-xl border-2 border-sand-200 dark:border-zinc-600 bg-white/50 dark:bg-zinc-800/50 dark:text-white focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-muted-foreground/60 text-sm sm:text-base"
                                placeholder="John Doe"
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2 sm:space-y-3">
                            <label className="block text-sm font-semibold text-secondary dark:text-zinc-300">
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
                                                : 'border-sand-200 dark:border-zinc-700 hover:border-sand-300 dark:hover:border-zinc-600 bg-white/50 dark:bg-zinc-800/30'
                                                }`}
                                        >
                                            {/* Icon */}
                                            <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105 ${isSelected ? config.iconBg : 'bg-sand-200 dark:bg-zinc-700'
                                                }`}>
                                                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold capitalize text-sm sm:text-base ${isSelected ? 'text-primary dark:text-white' : 'text-secondary dark:text-zinc-300'}`}>
                                                    {r}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {USER_ROLE_DESCRIPTIONS[r]}
                                                </p>
                                            </div>

                                            {/* Selection indicator */}
                                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                ? `${config.borderColor} ${config.bgColor}`
                                                : 'border-sand-300 dark:border-zinc-600'
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
                            <div className="flex items-center gap-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
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
                            disabled={loading || !email}
                            isLoading={loading}
                            leftIcon={<Mail className="w-4 h-4" />}
                            className="flex-1 order-1 sm:order-2"
                        >
                            Send Invite
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
