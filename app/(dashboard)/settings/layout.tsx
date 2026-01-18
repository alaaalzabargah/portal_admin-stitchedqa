'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    Settings,
    Store,
    Users,
    Globe,
    Sliders
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { PageHeader } from '@/components/ui/PageHeader'

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { t } = useLanguage()

    const tabs = [
        { href: '/settings/general', label: t('settings.nav.general'), icon: Settings },
        { href: '/settings/team', label: t('settings.nav.team'), icon: Users },
    ]

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">

            {/* Page Header */}
            <PageHeader
                label="SETTINGS"
                title={t('common.settings')}
                subtitle={t('settings.header_subtitle')}
            />

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = pathname.startsWith(tab.href)
                    const Icon = tab.icon
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
                                isActive
                                    ? "bg-white dark:bg-white/10 text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-primary hover:bg-white/50"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </Link>
                    )
                })}
            </div>

            <div className="glass-panel p-6 md:p-10 rounded-2xl min-h-[400px]">
                {children}
            </div>
        </div>
    )
}
