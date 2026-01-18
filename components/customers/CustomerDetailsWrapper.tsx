'use client'

import { useThemeSystem } from '@/lib/themes/context'

interface CustomerDetailsWrapperProps {
    children: React.ReactNode
}

export function CustomerDetailsWrapper({ children }: CustomerDetailsWrapperProps) {
    const { themeConfig } = useThemeSystem()

    return (
        <div
            className="min-h-screen p-4 sm:p-6 lg:p-8"
            style={{
                background: `linear-gradient(135deg, ${themeConfig.colors.gradientFrom}30 0%, ${themeConfig.colors.gradientVia}20 40%, transparent 70%, ${themeConfig.colors.gradientTo}25 100%)`
            }}
        >
            {/* Main Container Card */}
            <div className="max-w-7xl mx-auto bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm rounded-3xl shadow-xl border border-white/60 dark:border-white/20 overflow-hidden">
                {children}
            </div>
        </div>
    )
}
