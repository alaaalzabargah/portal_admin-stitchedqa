'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GlassButton } from '@/components/ui/GlassButton'
import { useDialog } from '@/lib/dialog'
import { deleteCustomer } from '@/lib/actions/customer'

export function DeleteCustomerButton({ customerId, confirmMessage, label }: { customerId: string, confirmMessage: string, label: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()
    const dialog = useDialog()

    const handleDelete = async () => {
        const confirmed = await dialog.confirm(confirmMessage, 'Delete Customer')
        if (confirmed) {
            setIsDeleting(true)
            const res = await deleteCustomer(customerId)
            if (res.success) {
                router.push('/customers')
            } else {
                await dialog.alert(res.error || 'An error occurred', 'Error')
                setIsDeleting(false)
            }
        }
    }

    return (
        <GlassButton
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            leftIcon={!isDeleting ? <Trash2 className="w-4 h-4" /> : undefined}
        >
            {label}
        </GlassButton>
    )
}

