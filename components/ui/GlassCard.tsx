'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface GlassCardProps {
    children: ReactNode
    className?: string
    /** Padding preset */
    padding?: 'none' | 'sm' | 'md' | 'lg'
    /** Whether to animate on mount */
    animate?: boolean
    /** Click handler */
    onClick?: () => void
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
}

/**
 * GlassCard - A glassmorphism card component
 * Features:
 * - Translucent white background (65% opacity)
 * - Backdrop blur effect
 * - Light border for edge definition
 * - Soft shadow for depth
 * - 24px border radius
 */
export function GlassCard({
    children,
    className,
    padding = 'md',
    animate = true,
    onClick,
}: GlassCardProps) {
    return (
        <div
            className={cn(
                // Glass effect
                "bg-white/65",
                "backdrop-blur-xl",
                "border border-white/40",
                "rounded-3xl",
                "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]",
                // Animation
                animate && "animate-fade-in",
                // Padding
                paddingClasses[padding],
                // Interactivity
                onClick && "cursor-pointer hover:bg-white/75 transition-all duration-200",
                // Custom classes
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )
}

/**
 * GlassCardHeader - Header section for glass cards
 */
export function GlassCardHeader({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "border-b border-white/20 pb-4 mb-4",
                className
            )}
        >
            {children}
        </div>
    )
}

/**
 * GlassCardTitle - Title text for glass cards
 */
export function GlassCardTitle({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <h3
            className={cn(
                "text-lg font-semibold text-gray-900",
                className
            )}
        >
            {children}
        </h3>
    )
}

/**
 * GlassCardDescription - Subtitle/description text
 */
export function GlassCardDescription({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <p
            className={cn(
                "text-sm text-gray-600 mt-1",
                className
            )}
        >
            {children}
        </p>
    )
}

/**
 * GlassCardContent - Main content area
 */
export function GlassCardContent({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div className={cn("", className)}>
            {children}
        </div>
    )
}

/**
 * GlassCardFooter - Footer section
 */
export function GlassCardFooter({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "border-t border-white/20 pt-4 mt-4",
                className
            )}
        >
            {children}
        </div>
    )
}

export default GlassCard
