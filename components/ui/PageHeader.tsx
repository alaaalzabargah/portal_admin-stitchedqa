'use client'

import { useThemeSystem } from '@/lib/themes/context'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
    label?: string
    title: string
    subtitle?: string
    actions?: React.ReactNode
    className?: string
}

export function PageHeader({ label, title, subtitle, actions, className }: PageHeaderProps) {
    const { themeConfig } = useThemeSystem()

    return (
        <header
            className={cn("pb-2 sm:pb-4 mb-3 sm:mb-6 border-b", className)}
            style={{ borderColor: `${themeConfig.colors.accent}15` }}
        >
            <div className={cn("flex items-start gap-4", actions ? "justify-between" : "")}>
                <div className="min-w-0 flex-1">
                    {label && (
                        <p
                            className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1"
                            style={{ color: themeConfig.colors.accent }}
                        >
                            {label}
                        </p>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex-shrink-0 flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    )
}
