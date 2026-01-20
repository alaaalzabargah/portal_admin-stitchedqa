'use client'

import { MessageCircle, Plus } from 'lucide-react'
import { AddOrderButton } from '@/components/orders/AddOrderButton'
import { useThemeSystem } from '@/lib/themes/context'

interface StickyActionsProps {
    phone: string
    customerId: string
    customerName: string
}

export function StickyActions({ phone, customerId, customerName }: StickyActionsProps) {
    const { themeConfig } = useThemeSystem()

    const handleWhatsApp = () => {
        // Format phone for WhatsApp (remove spaces and +)
        const cleanPhone = phone.replace(/\s+/g, '').replace('+', '')
        window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 pb-safe animate-in slide-in-from-bottom-5 duration-300"
            style={{
                background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(0,0,0,0.1)'
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center gap-3 justify-center sm:justify-end">
                    {/* WhatsApp Button - Primary */}
                    <button
                        onClick={handleWhatsApp}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-white shadow-lg hover:shadow-xl active:scale-95 transition-all touch-manipulation"
                        style={{
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                            boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3), 0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        aria-label="WhatsApp customer"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-bold">WhatsApp</span>
                    </button>

                    {/* Add Order Button - Secondary */}
                    <div className="flex-1 sm:flex-none">
                        <AddOrderButton
                            customerId={customerId}
                            customerName={customerName}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
