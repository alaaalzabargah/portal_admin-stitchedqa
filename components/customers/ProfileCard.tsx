'use client'

import { useState } from 'react'
import { Phone, Mail, Copy, Check } from 'lucide-react'
import { QuickActions } from './QuickActions'
import { getContrastColor } from '@/lib/utils'

interface ProfileCardProps {
    customer: {
        full_name: string
        phone: string
        email?: string
        created_at: string
    }
    tier?: {
        name: string
        color: string
    }
    locale: 'ar' | 'en'
}

export function ProfileCard({ customer, tier, locale }: ProfileCardProps) {
    const tierColor = tier?.color || '#6B7280'
    const tierTextColor = getContrastColor(tierColor)
    const initial = customer.full_name?.charAt(0).toUpperCase() || '?'

    return (
        <div className="luxury-gradient-card p-6 sm:p-8 mx-4 lg:mx-0 mb-6">
            {/* Avatar - Floating Token */}
            <div className="flex flex-col items-center text-center">
                <div className="relative">
                    <div
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-serif font-bold shadow-lg ring-4 ring-white"
                        style={{
                            background: `linear-gradient(135deg, ${tierColor} 0%, ${tierColor}dd 100%)`,
                            color: tierTextColor,
                            boxShadow: `0 10px 25px ${tierColor}40, 0 6px 12px rgba(0, 0, 0, 0.15)`
                        }}
                    >
                        {initial}
                    </div>
                </div>

                {/* Name - Serif Font for Premium Feel */}
                <h1 className="mt-5 text-xl sm:text-2xl font-serif font-semibold text-primary">
                    {customer.full_name}
                </h1>

                {/* Tier Badge - Dynamic Glass Effect */}
                {tier && (
                    <span
                        className="mt-3 text-[10px] sm:text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-wider border"
                        style={{
                            backgroundColor: `${tierColor}e6`, // 90% opacity
                            color: tierTextColor,
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            boxShadow: `0 4px 12px ${tierColor}60, 0 0 20px ${tierColor}30`
                        }}
                    >
                        {tier.name}
                    </span>
                )}

                {/* Joined date */}
                <p className="mt-2 text-xs text-muted-foreground">
                    {locale === 'en' ? 'Member since' : 'عضو منذ'}{' '}
                    {new Date(customer.created_at).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-US',
                        { month: 'short', year: 'numeric' }
                    )}
                </p>

                {/* Contact Info - Copyable */}
                <div className="mt-5 w-full space-y-2">
                    <CopyableContactItem
                        icon={<Phone className="w-4 h-4" />}
                        value={customer.phone}
                        label="Phone"
                    />
                    {customer.email && (
                        <CopyableContactItem
                            icon={<Mail className="w-4 h-4" />}
                            value={customer.email}
                            label="Email"
                        />
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-5">
                    <QuickActions phone={customer.phone} email={customer.email} />
                </div>
            </div>
        </div>
    )
}

function CopyableContactItem({
    icon,
    value,
    label
}: {
    icon: React.ReactNode
    value: string
    label: string
}) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch { }
    }

    return (
        <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] touch-manipulation group border"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderColor: 'rgba(255, 255, 255, 0.6)'
            }}
            title={`Copy ${label}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-muted-foreground flex-shrink-0">
                    {icon}
                </span>
                <span className="text-sm font-mono text-primary truncate">
                    {value}
                </span>
            </div>
            <span className="flex-shrink-0">
                {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                    <Copy className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                )}
            </span>
        </button>
    )
}
