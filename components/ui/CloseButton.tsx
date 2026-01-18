'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { GlassButton } from '@/components/ui/GlassButton'

export function CloseButton() {
    const router = useRouter()

    return (
        <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<X className="w-5 h-5" />}
        >
            Close
        </GlassButton>
    )
}
