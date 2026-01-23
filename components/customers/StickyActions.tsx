'use client'

import { useState } from 'react'
import { MessageCircle, Plus } from 'lucide-react'
import { AddOrderModal } from '@/components/orders/AddOrderModal'
import { useRouter } from 'next/navigation'
import { FloatingActionButton, FABAction } from '@/components/ui/FloatingActionButton'

interface StickyActionsProps {
    phone: string
    customerId: string
    customerName: string
}

export function StickyActions({ phone, customerId, customerName }: StickyActionsProps) {
    const [showAddOrderModal, setShowAddOrderModal] = useState(false)
    const router = useRouter()

    const handleWhatsApp = () => {
        // Format phone for WhatsApp (remove spaces and +)
        const cleanPhone = phone.replace(/\s+/g, '').replace('+', '')
        window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }

    const handleAddOrder = () => {
        setShowAddOrderModal(true)
    }

    const handleOrderSuccess = () => {
        router.refresh()
    }

    const actions: FABAction[] = [
        { label: 'WhatsApp', onClick: handleWhatsApp, icon: MessageCircle, variant: 'green' },
        { label: 'Add Order', onClick: handleAddOrder, icon: Plus, variant: 'theme' }
    ]

    return (
        <>
            <FloatingActionButton actions={actions} />

            <AddOrderModal
                customerId={customerId}
                customerName={customerName}
                isOpen={showAddOrderModal}
                onClose={() => setShowAddOrderModal(false)}
                onSuccess={handleOrderSuccess}
            />
        </>
    )
}
