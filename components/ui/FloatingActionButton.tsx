'use client'

import { useState } from 'react'
import { Plus, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { IconType } from 'react-icons'

// v2.0 - Morphing FAB with squircle→circle transition
export interface FABAction {
    label: string
    href?: string
    onClick?: () => void
    icon: LucideIcon | IconType
    variant?: 'theme' | 'green' | 'white'
}

interface FloatingActionButtonProps {
    actions: FABAction[]
}

/**
 * Reusable Floating Action Button (FAB) Component
 * 
 * Usage:
 * ```tsx
 * <FloatingActionButton
 *   actions={[
 *     { label: 'Add Customer', href: '/customers/new', icon: Users, variant: 'theme' },
 *     { label: 'Campaign', href: '/marketing', icon: MessageCircle, variant: 'green' },
 *     { label: 'Finance', href: '/finance', icon: DollarSign, variant: 'white' }
 *   ]}
 * />
 * ```
 */
export function FloatingActionButton({ actions }: FloatingActionButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    const getActionStyle = (variant: FABAction['variant'] = 'theme') => {
        switch (variant) {
            case 'green':
                return {
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: 'white',
                    className: 'text-white'
                }
            case 'white':
                return {
                    background: 'white',
                    color: '#1f2937',
                    className: 'bg-white text-gray-800 border-2 border-gray-200'
                }
            case 'theme':
            default:
                return {
                    background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                    color: 'var(--theme-text-primary)',
                    className: ''
                }
        }
    }

    const handleActionClick = (action: FABAction) => {
        if (action.onClick) {
            action.onClick()
        }
        setIsOpen(false)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Action Menu Items */}
            <div className={`absolute bottom-20 right-1 flex flex-col gap-4 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {actions.map((action, index) => {
                    const style = getActionStyle(action.variant)
                    const Icon = action.icon

                    const buttonContent = (
                        <>
                            <span className="text-sm font-semibold text-gray-700 bg-white px-4 py-2 rounded-xl shadow-md transition-opacity whitespace-nowrap">
                                {action.label}
                            </span>
                            <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all ${style.className}`}
                                style={{
                                    background: style.background,
                                }}
                            >
                                <Icon className="w-5 h-5" style={{ color: style.color }} />
                            </div>
                        </>
                    )

                    return action.href ? (
                        <Link
                            key={index}
                            href={action.href}
                            onClick={() => handleActionClick(action)}
                            className="flex items-center justify-end gap-4 group"
                        >
                            {buttonContent}
                        </Link>
                    ) : (
                        <button
                            key={index}
                            onClick={() => handleActionClick(action)}
                            className="flex items-center justify-end gap-4 group"
                        >
                            {buttonContent}
                        </button>
                    )
                })}
            </div>

            {/* Main FAB Button - Morphing Shape */}
            <div className="relative flex items-center justify-center w-16 h-16">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative z-10 w-14 h-14 bg-[var(--theme-primary)] text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform border-2 border-[#C5A572] ${isOpen ? 'rotate-[135deg] rounded-full' : 'rotate-0 rounded-2xl'}`}
                    style={{
                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}
                    aria-label="Quick actions"
                >
                    <Plus
                        className={`w-7 h-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                        style={{ color: 'var(--theme-text-primary)' }}
                    />
                </button>
            </div>
        </div>
    )
}
