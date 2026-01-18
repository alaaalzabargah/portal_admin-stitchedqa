'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ═══════════════════════════════════════════════════════════════════════════
// THEME SYSTEM - Purple, Mint, Gold, Maroon
// ═══════════════════════════════════════════════════════════════════════════

export type ThemeName = 'purple' | 'mint' | 'gold' | 'maroon'

export interface ThemeConfig {
    name: ThemeName
    label: string
    description: string
    isDark: boolean // For contrast logic
    colors: {
        primary: string
        primaryLight: string
        primaryDark: string
        gradientFrom: string
        gradientVia: string
        gradientTo: string
        textPrimary: string
        textSecondary: string
        accent: string
        // Button colors
        buttonText: string
        buttonOutline: string
    }
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
    'purple': {
        name: 'purple',
        label: 'Purple',
        description: 'Deep plum with violet tones',
        isDark: true,
        colors: {
            // Gradient: rgb(65, 41, 90) → rgb(57, 34, 80) → rgb(47, 7, 67)
            primary: '#41295A',           // Deep Plum
            primaryLight: '#392250',      // Mid Violet
            primaryDark: '#2F0743',       // Dark Violet
            gradientFrom: '#41295A',      // rgb(65, 41, 90)
            gradientVia: '#392250',       // rgb(57, 34, 80)
            gradientTo: '#2F0743',        // rgb(47, 7, 67)
            // Dark theme: White text
            textPrimary: '#FFFFFF',
            textSecondary: '#E0E0E0',
            accent: '#9B59B6',
            buttonText: '#FFFFFF',
            buttonOutline: '#FFFFFF',
        }
    },
    'mint': {
        name: 'mint',
        label: 'Mint',
        description: 'Fresh teal with aqua tones',
        isDark: false,
        colors: {
            // Gradient: rgb(81, 221, 188) → rgb(57, 189, 167) → rgb(31, 150, 139)
            primary: '#51DDBC',           // Bright Mint
            primaryLight: '#39BDA7',      // Mid Teal
            primaryDark: '#1F968B',       // Dark Teal
            gradientFrom: '#51DDBC',      // rgb(81, 221, 188)
            gradientVia: '#39BDA7',       // rgb(57, 189, 167)
            gradientTo: '#1F968B',        // rgb(31, 150, 139)
            // Bright theme: Dark text
            textPrimary: '#222222',
            textSecondary: '#4A4A4A',
            accent: '#1F968B',
            buttonText: '#222222',
            buttonOutline: '#1F968B',
        }
    },
    'gold': {
        name: 'gold',
        label: 'Gold',
        description: 'Luxurious gold with amber tones',
        isDark: false,
        colors: {
            // Gradient: rgb(191, 149, 63) → rgb(215, 180, 95) → rgb(130, 95, 20)
            primary: '#BF953F',           // Rich Gold
            primaryLight: '#D7B45F',      // Light Gold
            primaryDark: '#825F14',       // Deep Amber
            gradientFrom: '#BF953F',      // rgb(191, 149, 63)
            gradientVia: '#D7B45F',       // rgb(215, 180, 95)
            gradientTo: '#825F14',        // rgb(130, 95, 20)
            // Bright theme: Dark text
            textPrimary: '#222222',
            textSecondary: '#4A4A4A',
            accent: '#825F14',
            buttonText: '#222222',
            buttonOutline: '#825F14',
        }
    },
    'maroon': {
        name: 'maroon',
        label: 'Maroon',
        description: 'Deep burgundy with crimson tones',
        isDark: true,
        colors: {
            // Gradient: rgb(110, 15, 30) → rgb(138, 21, 56) → rgb(165, 40, 70)
            primary: '#6E0F1E',           // Deep Maroon
            primaryLight: '#8A1538',      // Crimson
            primaryDark: '#A52846',       // Rich Burgundy
            gradientFrom: '#6E0F1E',      // rgb(110, 15, 30)
            gradientVia: '#8A1538',       // rgb(138, 21, 56)
            gradientTo: '#A52846',        // rgb(165, 40, 70)
            // Dark theme: White text
            textPrimary: '#FFFFFF',
            textSecondary: '#E0E0E0',
            accent: '#E74C3C',
            buttonText: '#FFFFFF',
            buttonOutline: '#FFFFFF',
        }
    }
}

interface ThemeContextType {
    theme: ThemeName
    themeConfig: ThemeConfig
    setTheme: (theme: ThemeName) => Promise<void>
    loading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeSystemProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeName>('purple')
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()

    // Mark as mounted (client-side only)
    useEffect(() => {
        setMounted(true)
    }, [])

    // Load theme from database on mount
    useEffect(() => {
        if (!mounted) return

        const loadTheme = async () => {
            try {
                // Check localStorage for faster initial load (only on client)
                if (typeof window !== 'undefined') {
                    const cached = localStorage.getItem('user-theme') as ThemeName
                    if (cached && THEMES[cached]) {
                        setThemeState(cached)
                        applyTheme(cached)
                    }
                }

                // Then fetch from database
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data } = await supabase
                        .from('user_themes')
                        .select('theme_name')
                        .eq('user_id', user.id)
                        .single()

                    if (data?.theme_name && THEMES[data.theme_name as ThemeName]) {
                        setThemeState(data.theme_name as ThemeName)
                        applyTheme(data.theme_name as ThemeName)
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('user-theme', data.theme_name)
                        }
                    }
                }
            } catch (error) {
                console.log('Theme load error:', error)
            } finally {
                setLoading(false)
            }
        }

        loadTheme()
    }, [mounted, supabase])

    // Apply theme CSS variables to document
    const applyTheme = (themeName: ThemeName) => {
        const config = THEMES[themeName]
        const root = document.documentElement

        root.style.setProperty('--theme-primary', config.colors.primary)
        root.style.setProperty('--theme-primary-light', config.colors.primaryLight)
        root.style.setProperty('--theme-primary-dark', config.colors.primaryDark)
        root.style.setProperty('--theme-gradient-from', config.colors.gradientFrom)
        root.style.setProperty('--theme-gradient-via', config.colors.gradientVia)
        root.style.setProperty('--theme-gradient-to', config.colors.gradientTo)
        root.style.setProperty('--theme-text-primary', config.colors.textPrimary)
        root.style.setProperty('--theme-text-secondary', config.colors.textSecondary)
        root.style.setProperty('--theme-accent', config.colors.accent)
        root.style.setProperty('--theme-button-text', config.colors.buttonText)
        root.style.setProperty('--theme-button-outline', config.colors.buttonOutline)
        root.style.setProperty('--theme-is-dark', config.isDark ? '1' : '0')

        root.setAttribute('data-theme', themeName)
    }

    const setTheme = useCallback(async (newTheme: ThemeName) => {
        setThemeState(newTheme)
        applyTheme(newTheme)
        if (typeof window !== 'undefined') {
            localStorage.setItem('user-theme', newTheme)
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase
                    .from('user_themes')
                    .upsert({
                        user_id: user.id,
                        theme_name: newTheme,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id'
                    })
            }
        } catch (error) {
            console.error('Failed to save theme:', error)
        }
    }, [supabase])

    return (
        <ThemeContext.Provider value={{
            theme,
            themeConfig: THEMES[theme],
            setTheme,
            loading
        }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useThemeSystem() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useThemeSystem must be used within ThemeSystemProvider')
    }
    return context
}
