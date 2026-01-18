'use client'

import { Phone, Mail } from 'lucide-react'
import { CopyableText } from '@/components/ui/CopyableText'

interface CustomerContactInfoProps {
    phone: string
    email?: string
    joinedDate: string
    locale: 'ar' | 'en'
}

export function CustomerContactInfo({ phone, email, joinedDate, locale }: CustomerContactInfoProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-secondary mt-1">
            <CopyableText
                text={phone}
                label="phone"
                icon={<Phone className="w-3.5 h-3.5 text-accent" />}
                textClassName="font-mono text-xs sm:text-sm"
            />
            {email && (
                <CopyableText
                    text={email}
                    label="email"
                    icon={<Mail className="w-3.5 h-3.5 text-accent" />}
                    textClassName="text-xs sm:text-sm"
                />
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Joined {new Date(joinedDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
            </div>
        </div>
    )
}
