'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Customer } from '@/lib/types/customer'
import { LoyaltyTier } from '@/lib/settings/types'
import { formatCurrency, cn, getContrastColor } from '@/lib/utils'
import { Copy, Check, Phone, Mail, DollarSign, ShoppingBag } from 'lucide-react'

interface CustomerCardGridProps {
    customers: Customer[]
    tiers: LoyaltyTier[]
    isSelectionMode?: boolean
    selectedIds?: Set<string>
    onToggleSelect?: (id: string) => void
}

export function CustomerCardGrid({
    customers,
    tiers,
    isSelectionMode,
    selectedIds,
    onToggleSelect
}: CustomerCardGridProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const getTierForCustomer = (customer: Customer) => {
        // Use status_tier field (same as list view)
        if (customer.status_tier) {
            const tier = tiers.find(t => t.name === customer.status_tier)
            if (tier) return tier
        }
        // Fallback: compute from spend
        const totalSpend = customer.total_spend_minor ?? 0
        return tiers
            .slice()
            .reverse()
            .find(t => totalSpend >= t.min_spend_minor) || tiers[0]
    }

    const copyValue = async (e: React.MouseEvent, value: string, fieldId: string) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            await navigator.clipboard.writeText(value)
            setCopiedField(fieldId)
            setTimeout(() => setCopiedField(null), 1500)
        } catch { }
    }

    if (customers.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                No customers found
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-6">
            {customers.map((customer) => {
                const tier = getTierForCustomer(customer)
                const tierColor = tier?.color || '#6B7280'
                const tierTextColor = getContrastColor(tierColor)
                const initial = customer.full_name?.charAt(0).toUpperCase() || '?'
                const isSelected = selectedIds?.has(customer.id)
                // Use total_spend_minor (same as list view)
                const totalSpend = customer.total_spend_minor ?? 0

                return (
                    <div
                        key={customer.id}
                        onClick={(e) => {
                            // If clicking checkbox or its container, don't trigger this (handled by checkbox click)
                            // But actually checkbox stopPropagation handles that.

                            // If in selection mode, toggle select
                            if (isSelectionMode) {
                                onToggleSelect?.(customer.id)
                            } else {
                                // Navigate
                                window.location.href = `/customers/${customer.id}`
                            }
                        }}
                        className={cn(
                            "block overflow-hidden group cursor-pointer relative transition-all",
                            "luxury-gradient-card rounded-3xl",
                            "hover:luxury-gradient-card-hover",
                            isSelected && "ring-2 ring-white shadow-2xl"
                        )}
                    >
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                            <div
                                className="absolute top-3 ltr:right-3 rtl:left-3 z-10 p-2 -mr-2 -mt-2"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    // Let the click pass to the card handler OR handle it here
                                    // If we handle here, we toggle.
                                    // Card handler also toggles in selection mode.
                                    // Best to just toggle here and stop prop.
                                    onToggleSelect?.(customer.id)
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => { }} // Controlled by parent
                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>
                        )}

                        {/* Card Header - Avatar + Name + Tier */}
                        <div className="p-4 pb-3 border-b border-sand-100">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm flex-shrink-0"
                                    style={{
                                        backgroundColor: tierColor,
                                        color: tierTextColor
                                    }}
                                >
                                    {initial}
                                </div>

                                {/* Name + Tier */}
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-primary truncate group-hover:text-accent transition-colors">
                                        {customer.full_name || 'Unnamed'}
                                    </h3>
                                    {tier && (
                                        <span
                                            className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                            style={{ backgroundColor: tierColor, color: tierTextColor }}
                                        >
                                            {tier.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card Body - Info Grid */}
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {/* Phone */}
                            <InfoField
                                icon={<Phone className="w-3 h-3" />}
                                label="Phone"
                                value={customer.phone || '-'}
                                copyable={!!customer.phone}
                                isCopied={copiedField === `phone-${customer.id}`}
                                onCopy={(e) => copyValue(e, customer.phone || '', `phone-${customer.id}`)}
                            />

                            {/* Email */}
                            <InfoField
                                icon={<Mail className="w-3 h-3" />}
                                label="Email"
                                value={customer.email || '-'}
                                copyable={!!customer.email}
                                isCopied={copiedField === `email-${customer.id}`}
                                onCopy={(e) => copyValue(e, customer.email || '', `email-${customer.id}`)}
                            />

                            {/* Total Spend */}
                            <InfoField
                                icon={<DollarSign className="w-3 h-3" />}
                                label="Total Spend"
                                value={formatCurrency(totalSpend)}
                                highlight="emerald"
                            />

                            {/* Orders */}
                            <InfoField
                                icon={<ShoppingBag className="w-3 h-3" />}
                                label="Orders"
                                value={String(customer.order_count ?? 0)}
                                highlight="amber"
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// Info Field Component
function InfoField({
    icon,
    label,
    value,
    copyable = false,
    isCopied = false,
    onCopy,
    highlight
}: {
    icon: React.ReactNode
    label: string
    value: string
    copyable?: boolean
    isCopied?: boolean
    onCopy?: (e: React.MouseEvent) => void
    highlight?: 'emerald' | 'amber'
}) {
    const highlightStyles = {
        emerald: 'text-emerald-600',
        amber: 'text-amber-600'
    }

    return (
        <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                {icon}
                {label}
            </p>
            <div className="flex items-center gap-1">
                <p className={cn(
                    "text-sm font-medium truncate",
                    highlight ? highlightStyles[highlight] : "text-primary"
                )}>
                    {value}
                </p>
                {copyable && (
                    <button
                        onClick={onCopy}
                        className="flex-shrink-0 p-1 rounded hover:bg-sand-100 transition-colors"
                        title="Copy"
                    >
                        {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <Copy className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
