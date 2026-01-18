'use client'

import { useThemeSystem, THEMES, ThemeName } from '@/lib/themes/context'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeSelectorProps {
    className?: string
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
    const { theme, setTheme, loading } = useThemeSystem()

    const themeList = Object.values(THEMES)

    if (loading) {
        return (
            <div className={cn("animate-pulse", className)}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-5", className)}>
            {themeList.map((themeConfig) => {
                const isSelected = theme === themeConfig.name

                return (
                    <button
                        key={themeConfig.name}
                        onClick={() => setTheme(themeConfig.name)}
                        className={cn(
                            "group relative rounded-2xl overflow-hidden transition-all duration-300",
                            "transform hover:scale-[1.04] hover:-translate-y-1",
                            "focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2",
                            isSelected
                                ? "ring-4 ring-white/60 shadow-2xl"
                                : "ring-1 ring-black/5 shadow-lg hover:shadow-2xl hover:ring-black/10"
                        )}
                        style={{
                            boxShadow: isSelected
                                ? `0 20px 40px -10px ${themeConfig.colors.primary}60, 0 10px 20px -5px ${themeConfig.colors.primary}40`
                                : undefined
                        }}
                    >
                        {/* Gradient Background */}
                        <div
                            className="h-32 p-4 flex flex-col justify-between relative overflow-hidden"
                            style={{
                                background: `linear-gradient(145deg, ${themeConfig.colors.gradientFrom}, ${themeConfig.colors.gradientVia} 50%, ${themeConfig.colors.gradientTo})`
                            }}
                        >
                            {/* Shine Effect on Hover */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, transparent 100%)'
                                }}
                            />

                            {/* Selected Indicator - Top Right */}
                            {isSelected && (
                                <div
                                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300"
                                    style={{
                                        backgroundColor: themeConfig.colors.textPrimary,
                                    }}
                                >
                                    <Check
                                        className="w-4 h-4"
                                        style={{ color: themeConfig.colors.primary }}
                                        strokeWidth={3}
                                    />
                                </div>
                            )}

                            {/* Theme Name - Large & Prominent */}
                            <div className="relative z-10">
                                <h3
                                    className="text-xl font-bold tracking-tight drop-shadow-sm"
                                    style={{ color: themeConfig.colors.textPrimary }}
                                >
                                    {themeConfig.label}
                                </h3>
                                <p
                                    className="text-[11px] leading-tight mt-1 max-w-[90%]"
                                    style={{
                                        color: themeConfig.colors.textSecondary,
                                        opacity: 0.85
                                    }}
                                >
                                    {themeConfig.description}
                                </p>
                            </div>

                            {/* Bottom Row: Color Palette Preview */}
                            <div className="flex items-center gap-2 relative z-10">
                                <div className="flex -space-x-1.5">
                                    {[themeConfig.colors.gradientFrom, themeConfig.colors.gradientVia, themeConfig.colors.gradientTo].map((color, i) => (
                                        <div
                                            key={i}
                                            className="w-5 h-5 rounded-full border-2 shadow-sm"
                                            style={{
                                                backgroundColor: color,
                                                borderColor: themeConfig.colors.textPrimary + '30',
                                                zIndex: 3 - i
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Sparkle for selected */}
                                {isSelected && (
                                    <Sparkles
                                        className="w-4 h-4 ml-auto animate-pulse"
                                        style={{ color: themeConfig.colors.textPrimary }}
                                    />
                                )}
                            </div>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

export default ThemeSelector
