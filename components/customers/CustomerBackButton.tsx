'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface CustomerBackButtonProps {
    fallback?: string
    locale?: 'ar' | 'en'
}

export function CustomerBackButton({ fallback = '/customers', locale = 'en' }: CustomerBackButtonProps) {
    const router = useRouter()

    return (
        <button
            onClick={() => {
                // If there's meaningful history, go back (preserves state)
                // Next.js router.back() falls back natively, but checking window.history is safer
                if (window.history.length > 2) {
                    router.back()
                } else {
                    router.push(fallback)
                }
            }}
            className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary transition-colors bg-white/50 backdrop-blur-sm px-3 py-2 rounded-full cursor-pointer"
        >
            <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
            {locale === 'en' ? 'Back' : 'رجوع'}
        </button>
    )
}
