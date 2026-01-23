'use client'

import { UserPlus, MessageCircle, DollarSign } from 'lucide-react'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'

export function DashboardFAB() {
    return (
        <div className="block sm:hidden">
            <FloatingActionButton
                actions={[
                    { label: 'Add Customer', href: '/customers/new', icon: UserPlus, variant: 'theme' },
                    { label: 'Campaign', href: '/marketing', icon: MessageCircle, variant: 'green' },
                    { label: 'Finance', href: '/finance', icon: DollarSign, variant: 'white' }
                ]}
            />
        </div>
    )
}
