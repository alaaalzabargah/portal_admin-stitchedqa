'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Locale = 'en' | 'ar'
type Direction = 'ltr' | 'rtl'

interface LanguageContextType {
    locale: Locale
    direction: Direction
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

import enTranslations from '@/locales/en.json'
import arTranslations from '@/locales/ar.json'

const translations: Record<Locale, Record<string, any>> = {
    en: enTranslations,
    ar: arTranslations,
}

export function LanguageProvider({
    children,
    initialLocale = 'ar'
}: {
    children: React.ReactNode
    initialLocale?: Locale
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale)
    const [direction, setDirection] = useState<Direction>(initialLocale === 'ar' ? 'rtl' : 'ltr')
    const [mounted, setMounted] = useState(false)

    // Initialize from cookies or default
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true))
    }, [])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
        const newDir = newLocale === 'ar' ? 'rtl' : 'ltr'
        setDirection(newDir)

        // Update Document attributes
        document.documentElement.lang = newLocale
        document.documentElement.dir = newDir

        // Save to cookie (simple)
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000` // 1 year
    }

    // Nested key lookup (e.g. "common.dashboard")
    const t = (key: string): string => {
        const keys = key.split('.')
        let current = translations[locale]

        for (const k of keys) {
            if (current[k] === undefined) return key
            current = current[k]
        }

        if (typeof current !== 'string') return key
        return current
    }

    // Prevent hydration mismatch by returning stub or invisible on first render if needed.
    // But for better UX, we just render. Layout handling takes care of the initial HTML attributes.

    return (
        <LanguageContext.Provider value={{ locale, direction, setLocale, t }}>
            {children}
            {/* Invisible forced update for Tailwind RTL/LTR helpers if used. */}
            {/* Ideally we set the dir on the HTML tag, which we do in setLocale */}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
