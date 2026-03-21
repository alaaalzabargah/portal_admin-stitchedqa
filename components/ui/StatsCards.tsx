'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface StatCard {
    label: string
    value: number | string
    /** Optional secondary value shown smaller after the main value (e.g. "/ 101") */
    secondaryValue?: string
    color: string
    icon?: LucideIcon
}

export interface StatsCardsProps {
    /** Hero card shown with theme gradient background */
    hero?: {
        label: string
        value: number | string
        icon?: LucideIcon
    }
    /** Regular stat cards with colored top borders */
    cards: StatCard[]
}

export function StatsCards({ hero, cards }: StatsCardsProps) {
    return (
        <>
            {/* Mobile */}
            <div className="flex flex-col gap-3 sm:hidden">
                {hero && (
                    <div
                        className="relative overflow-hidden p-3 h-16 rounded-xl"
                        style={{
                            background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/20 to-transparent" />
                        <div className="relative z-10 flex items-center justify-between h-full">
                            <div className="flex items-center gap-2.5">
                                {hero.icon && (
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <hero.icon className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
                                    </div>
                                )}
                                <span
                                    className="text-xs uppercase tracking-wide font-semibold"
                                    style={{ color: 'var(--theme-text-secondary)' }}
                                >
                                    {hero.label}
                                </span>
                            </div>
                            <p
                                className="text-2xl font-bold font-mono"
                                style={{ color: 'var(--theme-text-primary)' }}
                            >
                                {hero.value}
                            </p>
                        </div>
                    </div>
                )}

                <div className={cn(
                    "grid gap-2",
                    cards.length <= 3 ? 'grid-cols-3' : cards.length <= 5 ? 'grid-cols-5' : `grid-cols-${Math.min(cards.length, 5)}`
                )}>
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            className={cn(
                                "relative overflow-hidden p-2 rounded-lg bg-white border-2 border-gray-200 flex flex-col justify-between",
                                cards.length >= 5 ? 'aspect-square' : 'h-[72px]'
                            )}
                        >
                            <div
                                className="absolute top-0 left-0 right-0 h-1"
                                style={{ backgroundColor: card.color }}
                            />
                            <div className="flex items-center gap-0.5 mt-0.5">
                                <div
                                    className="w-1 h-1 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: card.color }}
                                />
                                <span className="text-[8px] uppercase tracking-wide text-gray-500 font-medium truncate">
                                    {card.label}
                                </span>
                            </div>
                            <p
                                className="text-xl font-bold font-mono self-end leading-none"
                                style={{ color: card.color }}
                            >
                                {card.value}
                                {card.secondaryValue && (
                                    <span className="text-[10px] font-normal text-stone-400">{card.secondaryValue}</span>
                                )}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex flex-row gap-4 overflow-x-auto pb-4 hide-scrollbar">
                {hero && (
                    <div
                        className="relative overflow-hidden p-6 min-w-[160px] flex-shrink-0 rounded-2xl"
                        style={{
                            background: 'linear-gradient(145deg, var(--theme-gradient-from), var(--theme-gradient-via), var(--theme-gradient-to))',
                            boxShadow: '0 8px 24px -4px var(--theme-primary)30'
                        }}
                    >
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                {hero.icon && (
                                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <hero.icon className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
                                    </div>
                                )}
                                <span
                                    className="text-xs uppercase tracking-widest font-semibold"
                                    style={{ color: 'var(--theme-text-secondary)' }}
                                >
                                    {hero.label}
                                </span>
                            </div>
                            <p
                                className="text-4xl font-bold font-mono tracking-tight"
                                style={{ color: 'var(--theme-text-primary)' }}
                            >
                                {hero.value}
                            </p>
                        </div>
                    </div>
                )}

                {cards.map((card) => (
                    <div
                        key={card.label}
                        className={cn(
                            "relative overflow-hidden",
                            "p-6 min-w-[160px] flex-shrink-0",
                            "rounded-2xl",
                            "bg-white/80 backdrop-blur-xl",
                            "border border-gray-100",
                            "shadow-sm hover:shadow-lg",
                            "transition-all duration-300",
                            "group hover:scale-[1.02]"
                        )}
                    >
                        <div
                            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                            style={{ backgroundColor: card.color }}
                        />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: `${card.color}15` }}
                                >
                                    {card.icon ? (
                                        <card.icon className="w-4 h-4" style={{ color: card.color }} />
                                    ) : (
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: card.color }}
                                        />
                                    )}
                                </div>
                                <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold truncate">
                                    {card.label}
                                </span>
                            </div>
                            <p
                                className="text-4xl font-bold font-mono tracking-tight"
                                style={{ color: card.color }}
                            >
                                {card.value}
                                {card.secondaryValue && (
                                    <span className="text-sm font-normal text-stone-400"> {card.secondaryValue}</span>
                                )}
                            </p>
                        </div>
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                            style={{
                                background: `radial-gradient(circle at center, ${card.color}08 0%, transparent 70%)`
                            }}
                        />
                    </div>
                ))}
            </div>
        </>
    )
}
