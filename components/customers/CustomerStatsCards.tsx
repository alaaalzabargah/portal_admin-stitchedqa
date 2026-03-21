'use client'

import { Customer } from '@/lib/types/customer'
import { LoyaltyTier } from '@/lib/settings/types'
import { Users } from 'lucide-react'
import { StatsCards } from '@/components/ui/StatsCards'

interface CustomerStatsCardsProps {
    customers: Customer[]
    tiers: LoyaltyTier[]
}

export function CustomerStatsCards({ customers, tiers }: CustomerStatsCardsProps) {
    const tierCounts = tiers.reduce((acc, tier) => {
        acc[tier.name] = customers.filter(c => c.status_tier === tier.name).length
        return acc
    }, {} as Record<string, number>)

    return (
        <StatsCards
            hero={{
                label: 'Total',
                value: customers.length,
                icon: Users,
            }}
            cards={tiers.map(tier => ({
                label: tier.name,
                value: tierCounts[tier.name] || 0,
                color: tier.color,
            }))}
        />
    )
}
