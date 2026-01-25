'use client'

import { Phone, MessageCircle, Mail } from 'lucide-react'

interface QuickActionsProps {
    phone: string
    email?: string
}

export function QuickActions({ phone, email }: QuickActionsProps) {
    const handleCall = () => {
        window.location.href = `tel:${phone}`
    }

    const handleWhatsApp = () => {
        // Format phone for WhatsApp (remove spaces and +)
        const cleanPhone = phone.replace(/\s+/g, '').replace('+', '')
        window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }

    const handleEmail = () => {
        if (email) {
            window.location.href = `mailto:${email}`
        }
    }

    return (
        <div className="flex items-center justify-center gap-3">
            {/* Phone Call */}
            <button
                onClick={handleCall}
                className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
                title="Call"
                aria-label="Call customer"
            >
                <Phone className="w-5 h-5 text-slate-600" />
            </button>

            {/* WhatsApp */}
            <button
                onClick={handleWhatsApp}
                className="w-11 h-11 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
                title="WhatsApp"
                aria-label="WhatsApp customer"
            >
                <MessageCircle className="w-5 h-5 text-emerald-600" />
            </button>

            {/* Email */}
            {email && (
                <button
                    onClick={handleEmail}
                    className="w-11 h-11 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
                    title="Email"
                    aria-label="Email customer"
                >
                    <Mail className="w-5 h-5 text-blue-600" />
                </button>
            )}
        </div>
    )
}
