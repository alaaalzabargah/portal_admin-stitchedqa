'use client'

import { useThemeSystem } from '@/lib/themes/context'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
    label?: string
    title: string
    subtitle?: string
    className?: string
}

export function PageHeader({ label, title, subtitle, className }: PageHeaderProps) {
    const { themeConfig } = useThemeSystem()

    return (
        <header className={cn("pb-3 sm:pb-6 mb-4 sm:mb-8 border-b", className)} style={{ borderColor: `${themeConfig.colors.accent}15` }}>
            {label && (
                <p
                    className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1 sm:mb-2"
                    style={{ color: themeConfig.colors.accent }}
                >
                    {label}
                </p>
            )}
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
            </h1>
            {subtitle && (
                <p className="text-xs sm:text-base text-gray-600 dark:text-gray-300 mt-1 sm:mt-2">
                    {subtitle}
                </p>
            )}
        </header>
    )
}
