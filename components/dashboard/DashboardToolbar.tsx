'use client'

import Link from 'next/link'
import { UserPlus, MessageCircle, DollarSign, Plus } from 'lucide-react'
import { GlassButton } from '@/components/ui/GlassButton'

export function DashboardToolbar() {
    return (
        <div className="hidden sm:flex items-center gap-3">
            <Link href="/marketing">
                <button
                    className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-xl border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 transition-all"
                >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span className="ms-2">Campaign</span>
                </button>
            </Link>

            <Link href="/finance">
                <button
                    className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all"
                >
                    <DollarSign className="w-4 h-4" />
                    <span className="ms-2">Finance</span>
                </button>
            </Link>

            <Link href="/customers/new">
                <GlassButton
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus className="w-4 h-4" strokeWidth={2.5} />}
                >
                    Add Customer
                </GlassButton>
            </Link>
        </div>
    )
}
