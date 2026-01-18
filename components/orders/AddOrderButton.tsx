'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddOrderModal } from './AddOrderModal'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/context'
import { GlassButton } from '@/components/ui/GlassButton'

interface AddOrderButtonProps {
    customerId: string
    customerName: string
}

export function AddOrderButton({ customerId, customerName }: AddOrderButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()

    const handleSuccess = () => {
        router.refresh()
    }

    return (
        <>
            <GlassButton
                variant="accent"
                size="sm"
                onClick={() => setShowModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
            >
                {t('orders.add_btn')}
            </GlassButton>

            <AddOrderModal
                customerId={customerId}
                customerName={customerName}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={handleSuccess}
            />
        </>
    )
}

