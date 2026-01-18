'use client'

import { cn } from '@/lib/utils'
import { ReactNode, HTMLAttributes } from 'react'

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    /** Panel variant */
    variant?: 'default' | 'subtle' | 'strong'
    /** Padding size */
    padding?: 'none' | 'sm' | 'md' | 'lg'
    /** Border radius */
    rounded?: 'lg' | 'xl' | '2xl' | '3xl'
    /** Enable hover effect */
    hover?: boolean
}

/**
 * GlassPanel - Reusable glassmorphism container
 * 
 * Matches the dashboard KPI card design:
 * - Semi-transparent white background
 * - Backdrop blur
 * - Subtle white border
 * - Soft shadow
 */
export function GlassPanel({
    children,
    className,
    variant = 'default',
    padding = 'md',
    rounded = '3xl',
    hover = false,
    ...props
}: GlassPanelProps) {
    const variantClasses = {
        default: 'bg-white/65 dark:bg-white/10 border-white/40 dark:border-white/20',
        subtle: 'bg-white/50 dark:bg-white/5 border-white/30 dark:border-white/15',
        strong: 'bg-white/80 dark:bg-white/15 border-white/50 dark:border-white/25',
    }

    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    }

    const roundedClasses = {
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
    }

    return (
        <div
            className={cn(
                // Base glass effect
                'backdrop-blur-xl',
                'border',
                'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]',
                'transition-all duration-200',
                // Variant
                variantClasses[variant],
                // Padding
                paddingClasses[padding],
                // Rounded
                roundedClasses[rounded],
                // Hover effect
                hover && 'hover:bg-white/75 dark:hover:bg-white/15 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * GlassPanelHeader - Header section for glass panels
 */
export function GlassPanelHeader({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'flex items-center justify-between pb-4 mb-4 border-b border-white/20',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * GlassPanelTitle - Title text for glass panels
 */
export function GlassPanelTitle({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn(
                'text-lg font-semibold text-gray-900 dark:text-white',
                className
            )}
            {...props}
        >
            {children}
        </h3>
    )
}

/**
 * GlassPanelLabel - Small uppercase label
 */
export function GlassPanelLabel({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn(
                'text-[11px] uppercase tracking-widest text-gray-600 dark:text-gray-400 font-semibold',
                className
            )}
            {...props}
        >
            {children}
        </p>
    )
}

export default GlassPanel
