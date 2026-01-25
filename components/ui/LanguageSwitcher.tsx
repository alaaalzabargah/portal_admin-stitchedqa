'use client'

import { useLanguage } from '@/lib/i18n/context'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage()

    const toggleLanguage = () => {
        setLocale(locale === 'ar' ? 'en' : 'ar')
    }

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            dir="ltr" // Always LTR for consistent icon placement
        >
            <Globe className="w-4 h-4" />
            <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
        </button>
    )
}
