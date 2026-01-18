'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    icon,
    iconPosition = 'left',
    children,
    ...props
}, ref) => {
    const baseStyles = `
        relative inline-flex items-center justify-center gap-2
        font-semibold tracking-tight rounded-xl
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    `

    const variants = {
        primary: `
            bg-gradient-to-br from-accent to-accent-dark text-white
            shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]
            hover:shadow-[0_8px_20px_rgba(201,162,39,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]
            hover:-translate-y-0.5
            active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.1)]
            focus-visible:ring-accent/50
        `,
        secondary: `
            bg-gradient-to-br from-white to-sand-50 text-primary
            border border-sand-200
            shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]
            hover:border-accent/30
            hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
            active:bg-sand-50
            focus-visible:ring-sand-300
        `,
        ghost: `
            bg-transparent text-muted-foreground
            hover:text-primary hover:bg-sand-100/50
            active:bg-sand-100
            focus-visible:ring-sand-300
        `,
        danger: `
            bg-gradient-to-br from-red-500 to-red-600 text-white
            shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]
            hover:shadow-[0_8px_20px_rgba(239,68,68,0.35)]
            hover:-translate-y-0.5
            active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.1)]
            focus-visible:ring-red-500/50
        `
    }

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base'
    }

    const iconSizes = {
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    }

    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <span className={iconSizes[size]}>{icon}</span>
                    )}
                    {children}
                    {icon && iconPosition === 'right' && (
                        <span className={iconSizes[size]}>{icon}</span>
                    )}
                </>
            )}
        </button>
    )
})

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
