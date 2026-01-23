'use client'

import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertCircle, DollarSign, ShoppingCart, Wallet, BarChart3, Percent, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

import Link from 'next/link'

interface KPICardProps {
    label: string
    value: number | null
    changePercent?: number
    type?: 'currency' | 'number' | 'percentage'
    loading?: boolean
    error?: string
    unavailable?: boolean
    unavailableReason?: string
    highlighted?: boolean
    variant?: 'default' | 'revenue' | 'expense' | 'profit' | 'orders'
    icon?: LucideIcon
    className?: string
    href?: string
}

// Glassmorphism variant styles
const variantStyles = {
    default: {
        iconBg: 'bg-gray-500/20',
        iconColor: 'text-gray-600 dark:text-gray-400',
        valueBg: ''
    },
    revenue: {
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        valueBg: 'text-emerald-700 dark:text-emerald-300'
    },
    expense: {
        iconBg: 'bg-rose-500/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        valueBg: 'text-rose-700 dark:text-rose-300'
    },
    profit: {
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        valueBg: 'text-blue-700 dark:text-blue-300'
    },
    orders: {
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        valueBg: 'text-amber-700 dark:text-amber-300'
    }
}

const defaultIcons: Record<string, LucideIcon> = {
    revenue: DollarSign,
    expense: Wallet,
    profit: BarChart3,
    orders: ShoppingCart
}

export function KPICard({
    label,
    value,
    changePercent,
    type = 'currency',
    loading = false,
    error,
    unavailable = false,
    unavailableReason,
    highlighted = false,
    variant = 'default',
    icon,
    className,
    href
}: KPICardProps) {
    const styles = variantStyles[variant]
    const IconComponent = icon || defaultIcons[variant] || DollarSign

    const formatValue = (val: number | null) => {
        if (val === null) return '—'

        switch (type) {
            case 'currency':
                return formatCurrency(val)
            case 'percentage':
                return `${val.toFixed(1)}%`
            case 'number':
                return val.toLocaleString('en-US')
            default:
                return val.toString()
        }
    }

    const getTrendIcon = () => {
        if (!changePercent || changePercent === 0) return <Minus className="w-3.5 h-3.5" />
        if (changePercent > 0) return <TrendingUp className="w-3.5 h-3.5" />
        return <TrendingDown className="w-3.5 h-3.5" />
    }

    const getTrendColor = () => {
        if (!changePercent || changePercent === 0) return 'text-gray-500 bg-gray-500/10'
        if (variant === 'expense') {
            // For expenses, increase is bad (red), decrease is good (green)
            if (changePercent > 0) return 'text-red-600 bg-red-500/10'
            return 'text-emerald-600 bg-emerald-500/10'
        }
        // For revenue/profit, increase is good (green)
        if (changePercent > 0) return 'text-emerald-600 bg-emerald-500/10'
        return 'text-red-600 bg-red-500/10'
    }

    // Base luxury card classes
    const glassCardClasses = cn(
        "luxury-gradient-card",
        "p-4 md:p-6", // Compact padding on mobile
        "transition-all duration-300",
        "hover:luxury-gradient-card-hover",
        "group",
        "h-full flex flex-col justify-between", // Ensure full height
        className
    )

    const CardContent = () => (
        <>
            {/* Header: Label + Icon */}
            <div className="flex items-start justify-between mb-3 md:mb-4">
                <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    {label}
                </p>
                <div className={cn(
                    "p-2 md:p-2.5 rounded-xl transition-transform group-hover:scale-110",
                    styles.iconBg
                )}>
                    <IconComponent className={cn("w-4 h-4 md:w-5 md:h-5", styles.iconColor)} />
                </div>
            </div>

            <div>
                {/* Value */}
                <div className={cn(
                    "font-mono font-bold tabular-nums tracking-tight mb-2 md:mb-3 flex items-baseline gap-1 flex-wrap",
                    "text-gray-900 dark:text-white",
                    highlighted && "text-[var(--theme-primary)]",
                    styles.valueBg
                )}>
                    {type === 'currency' && typeof value === 'number' ? (
                        <>
                            <span className="text-xs sm:text-sm md:text-base font-medium opacity-70">QAR</span>
                            <span className="text-[17px] sm:text-2xl md:text-2xl">{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </>
                    ) : (
                        <span className="text-lg sm:text-2xl md:text-2xl break-all">
                            {formatValue(value)}
                        </span>
                    )}
                </div>

                {/* Change Indicator */}
                {changePercent !== undefined && (
                    <div className={cn(
                        "inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold",
                        getTrendColor()
                    )}>
                        {getTrendIcon()}
                        <span className="tabular-nums">
                            {changePercent > 0 && '+'}{changePercent.toFixed(1)}%
                        </span>
                        <span className="font-normal opacity-70 hidden sm:inline">vs last</span>
                    </div>
                )}
            </div>
        </>
    )

    if (loading) {
        return (
            <div className={cn(glassCardClasses, "animate-pulse")}>
                <div className="flex items-start justify-between mb-4">
                    <div className="h-3 bg-gray-300/50 rounded w-20"></div>
                    <div className="w-10 h-10 bg-gray-300/50 rounded-xl"></div>
                </div>
                <div className="h-8 bg-gray-300/50 rounded w-28 mb-3"></div>
                <div className="h-3 bg-gray-300/50 rounded w-16"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={cn(glassCardClasses, "border-red-300/50")}>
                <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-xs font-medium uppercase tracking-wider">Error</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
        )
    }

    if (unavailable) {
        return (
            <div className={glassCardClasses}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3">
                    {label}
                </p>
                <div className="flex items-center gap-2 text-gray-500">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">Unavailable</p>
                </div>
                {unavailableReason && (
                    <p className="text-xs text-gray-500/70 mt-2">{unavailableReason}</p>
                )}
            </div>
        )
    }

    if (href) {
        return (
            <Link href={href} className={cn(glassCardClasses, "block hover:scale-[1.02] active:scale-[0.98]")}>
                <CardContent />
            </Link>
        )
    }

    return (
        <div className={cn(
            glassCardClasses,
            highlighted && "ring-2 ring-[var(--theme-primary)]/30"
        )}>
            <CardContent />
        </div>
    )
}
