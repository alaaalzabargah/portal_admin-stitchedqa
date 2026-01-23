import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'silver' | 'gold' | 'bronze' | 'accent'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    /** Hide text on mobile, show only icon */
    iconOnlyMobile?: boolean
}

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    icon: 'p-2',
}

const iconOnlySizeClasses = {
    sm: 'sm:px-3 sm:py-1.5 px-2 py-2',
    md: 'sm:px-4 sm:py-2 px-2.5 py-2.5',
    lg: 'sm:px-6 sm:py-3 px-3 py-3',
    icon: 'p-2',
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            iconOnlyMobile = false,
            className,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        // Map legacy variants to new ones
        const resolvedVariant = variant === 'silver' || variant === 'gold' || variant === 'bronze'
            ? 'secondary'
            : variant

        const isLoadingState = isLoading
        const iconElement = leftIcon || rightIcon

        const baseClasses = cn(
            'inline-flex items-center justify-center gap-2',
            'font-medium rounded-xl',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            iconOnlyMobile ? iconOnlySizeClasses[size] : sizeClasses[size]
        )

        // Text element that hides on mobile when iconOnlyMobile is true
        const textElement = children ? (
            <span className={iconOnlyMobile ? 'hidden sm:inline' : undefined}>
                {children}
            </span>
        ) : null

        // ACCENT - Theme gradient (primary action buttons like Add Order)
        if (resolvedVariant === 'accent') {
            return (
                <button
                    ref={ref}
                    className={cn(
                        baseClasses,
                        "shadow-lg hover:shadow-xl hover:scale-[1.02]",
                        "focus:ring-2 focus:ring-offset-2",
                        className
                    )}
                    style={{
                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                        color: 'var(--theme-text-primary)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    disabled={disabled || isLoadingState}
                    {...props}
                >
                    {isLoadingState ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {textElement}
                        </>
                    ) : (
                        <>
                            {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                            {textElement}
                        </>
                    )}
                </button>
            )
        }

        // PRIMARY - Luxury gradient background
        if (resolvedVariant === 'primary') {
            return (
                <button
                    ref={ref}
                    className={cn(
                        baseClasses,
                        "luxury-gradient-button",
                        "focus:ring-[var(--theme-primary)]/50",
                        className
                    )}
                    disabled={disabled || isLoadingState}
                    {...props}
                >
                    {isLoadingState ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {textElement}
                        </>
                    ) : (
                        <>
                            {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                            {textElement}
                        </>
                    )}
                </button>
            )
        }

        // SECONDARY - Outline with theme color
        if (resolvedVariant === 'secondary') {
            return (
                <button
                    ref={ref}
                    className={cn(
                        baseClasses,
                        "bg-transparent border-2 border-[var(--theme-primary)]",
                        "text-[var(--theme-primary)]",
                        "hover:bg-[var(--theme-primary)]/10",
                        "focus:ring-[var(--theme-primary)]/50",
                        className
                    )}
                    disabled={disabled || isLoadingState}
                    {...props}
                >
                    {isLoadingState ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {textElement}
                        </>
                    ) : (
                        <>
                            {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                            {textElement}
                        </>
                    )}
                </button>
            )
        }

        // GHOST - Transparent with subtle hover
        if (resolvedVariant === 'ghost') {
            return (
                <button
                    ref={ref}
                    className={cn(
                        baseClasses,
                        "bg-transparent text-gray-700 dark:text-gray-300",
                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                        "focus:ring-gray-300",
                        className
                    )}
                    disabled={disabled || isLoadingState}
                    {...props}
                >
                    {isLoadingState ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {textElement}
                        </>
                    ) : (
                        <>
                            {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                            {textElement}
                        </>
                    )}
                </button>
            )
        }

        // DANGER - Red destructive
        if (resolvedVariant === 'danger') {
            return (
                <button
                    ref={ref}
                    className={cn(
                        baseClasses,
                        "bg-red-600 text-white",
                        "hover:bg-red-700",
                        "focus:ring-red-500",
                        className
                    )}
                    disabled={disabled || isLoadingState}
                    {...props}
                >
                    {isLoadingState ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {textElement}
                        </>
                    ) : (
                        <>
                            {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                            {textElement}
                        </>
                    )}
                </button>
            )
        }

        // SUCCESS - Green
        if (resolvedVariant === 'success') {
            return (
                <button
                    ref={ref}
                    className={cn(
                        baseClasses,
                        "bg-green-600 text-white",
                        "hover:bg-green-700",
                        "focus:ring-green-500",
                        className
                    )}
                    disabled={disabled || isLoadingState}
                    {...props}
                >
                    {isLoadingState ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {textElement}
                        </>
                    ) : (
                        <>
                            {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                            {textElement}
                        </>
                    )}
                </button>
            )
        }

        // Fallback to primary
        return (
            <button
                ref={ref}
                className={cn(baseClasses, "luxury-gradient-button", className)}
                disabled={disabled || isLoadingState}
                {...props}
            >
                {isLoadingState ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {textElement}
                    </>
                ) : (
                    <>
                        {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
                        {textElement}
                    </>
                )}
            </button>
        )
    }
)

GlassButton.displayName = 'GlassButton'
