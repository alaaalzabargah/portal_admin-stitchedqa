'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function DashboardContent({ children }: { children: React.ReactNode }) {
    // Initialize from localStorage synchronously to avoid flash
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
        }
        return false
    })
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setMounted(true))
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (stored === 'true') {
            requestAnimationFrame(() => setIsCollapsed(true))
        }

        // storage fires for cross-tab changes
        const handleStorage = () => {
            setIsCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')
        }
        // sidebar-toggle fires for same-tab changes (dispatched by the Sidebar component)
        const handleToggle = () => {
            setIsCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')
        }

        window.addEventListener('storage', handleStorage)
        window.addEventListener('sidebar-toggle', handleToggle)

        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('sidebar-toggle', handleToggle)
        }
    }, [])

    return (
        <main
            className={cn(
                "flex-1 min-h-screen transition-all duration-300 ease-in-out",
                "px-4 py-20 lg:px-8 lg:py-8 animate-fade-in w-full",
                mounted
                    ? isCollapsed
                        ? "lg:ltr:ml-[72px] lg:rtl:mr-[72px]"
                        : "lg:ltr:ml-64 lg:rtl:mr-64"
                    : "lg:ltr:ml-64 lg:rtl:mr-64" // Default to expanded on first render
            )}
        >
            {children}
        </main>
    )
}
