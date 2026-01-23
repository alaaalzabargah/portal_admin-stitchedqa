'use client'

import { useState } from 'react'

import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

import { cn } from '@/lib/utils'

export function SearchInput({ placeholder = 'Search...', className }: { placeholder?: string, className?: string }) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()
    const [value, setValue] = useState(searchParams.get('q')?.toString() || '')

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }
        replace(`${pathname}?${params.toString()}`)
    }, 300)

    return (
        <div className={cn("relative flex-1", className)}>
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
                type="text"
                value={value} // Controlled component
                onChange={(e) => {
                    setValue(e.target.value) // Update local state
                    handleSearch(e.target.value) // Trigger debounced search
                }}
                placeholder={placeholder}
                className="w-full ltr:pl-9 rtl:pr-9 py-2 bg-sand-50/50 border border-sand-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
        </div>
    )
}
