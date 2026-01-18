'use client'

import { Customer } from '@/lib/types/customer'
import { LoyaltyTier } from '@/lib/settings/types'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerStatsCardsProps {
    customers: Customer[]
    tiers: LoyaltyTier[]
}

export function CustomerStatsCards({ customers, tiers }: CustomerStatsCardsProps) {
    // Count customers by tier
    const tierCounts = tiers.reduce((acc, tier) => {
        acc[tier.name] = customers.filter(c => c.status_tier === tier.name).length
        return acc
    }, {} as Record<string, number>)

    return (
        <>
            {/* Mobile: Horizontal scroll with smaller cards */}
            <div className="flex flex-col gap-3 sm:hidden">
                {/* Total Customers Card - Full width, reduced height */}
                <div
                    className={cn(
                        "relative overflow-hidden",
                        "p-3 h-16",
                        "rounded-xl"
                    )}
                    style={{
                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                >
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/20 to-transparent" />
                    <div className="relative z-10 flex items-center justify-between h-full">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Users className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
                            </div>
                            <span
                                className="text-xs uppercase tracking-wide font-semibold"
                                style={{ color: 'var(--theme-text-secondary)' }}
                            >
                                Total
                            </span>
                        </div>
                        <p
                            className="text-2xl font-bold font-mono"
                            style={{ color: 'var(--theme-text-primary)' }}
                        >
                            {customers.length}
                        </p>
                    </div>
                </div>

                {/* Per-Tier Cards - Grid layout (5 per row, wraps) */}
                <div className="grid grid-cols-5 gap-2">
                    {tiers.map((tier) => {
                        const count = tierCounts[tier.name] || 0

                        return (
                            <div
                                key={tier.id}
                                className={cn(
                                    "relative overflow-hidden",
                                    "p-2 aspect-square",
                                    "rounded-lg",
                                    "bg-white border-2 border-gray-200",
                                    "flex flex-col justify-between"
                                )}
                            >
                                {/* Colored top border */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-1"
                                    style={{ backgroundColor: tier.color }}
                                />

                                {/* Tier indicator dot and label */}
                                <div className="flex items-center gap-0.5 mt-0.5">
                                    <div
                                        className="w-1 h-1 rounded-full"
                                        style={{ backgroundColor: tier.color }}
                                    />
                                    <span className="text-[8px] uppercase tracking-wide text-gray-500 font-medium truncate">
                                        {tier.name}
                                    </span>
                                </div>

                                {/* Large colored number */}
                                <p
                                    className="text-xl font-bold font-mono self-end leading-none"
                                    style={{ color: tier.color }}
                                >
                                    {count}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Desktop: Horizontal Row Layout */}
            <div className="hidden sm:flex flex-row gap-4 overflow-x-auto pb-4 hide-scrollbar">
                {/* Total Customers Card - Premium Hero Card */}
                <div
                    className={cn(
                        "relative overflow-hidden",
                        "p-6",
                        "min-w-[160px]",
                        "flex-shrink-0",
                        "rounded-2xl"
                    )}
                    style={{
                        background: 'linear-gradient(145deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                        boxShadow: '0 8px 24px -4px var(--theme-primary)30'
                    }}
                >
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Users className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
                            </div>
                            <span
                                className="text-xs uppercase tracking-widest font-semibold"
                                style={{ color: 'var(--theme-text-secondary)' }}
                            >
                                Total
                            </span>
                        </div>
                        <p
                            className="text-4xl font-bold font-mono tracking-tight"
                            style={{ color: 'var(--theme-text-primary)' }}
                        >
                            {customers.length}
                        </p>
                    </div>
                </div>

                {/* Per-Tier Cards */}
                {tiers.map((tier) => {
                    const count = tierCounts[tier.name] || 0

                    return (
                        <div
                            key={tier.id}
                            className={cn(
                                "relative overflow-hidden",
                                "p-6",
                                "min-w-[160px]",
                                "flex-shrink-0",
                                "rounded-2xl",
                                "bg-white/80 backdrop-blur-xl",
                                "border border-gray-100",
                                "shadow-sm hover:shadow-lg",
                                "transition-all duration-300",
                                "group hover:scale-[1.02]"
                            )}
                        >
                            <div
                                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                                style={{ backgroundColor: tier.color }}
                            />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: `${tier.color}15` }}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: tier.color }}
                                        />
                                    </div>
                                    <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold truncate">
                                        {tier.name}
                                    </span>
                                </div>
                                <p
                                    className="text-4xl font-bold font-mono tracking-tight"
                                    style={{ color: tier.color }}
                                >
                                    {count}
                                </p>
                            </div>

                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                style={{
                                    background: `radial-gradient(circle at center, ${tier.color}08 0%, transparent 70%)`
                                }}
                            />
                        </div>
                    )
                })}
            </div>
        </>
    )
}
