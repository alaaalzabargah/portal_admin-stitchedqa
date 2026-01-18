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

        // Listen for storage changes (when sidebar toggles)
        const handleStorage = () => {
            const current = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
            setIsCollapsed(current === 'true')
        }

        // Custom event listener for same-tab updates
        window.addEventListener('storage', handleStorage)

        // Poll for changes (since storage event only fires cross-tab)
        const interval = setInterval(() => {
            const current = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
            setIsCollapsed(current === 'true')
        }, 100)

        return () => {
            window.removeEventListener('storage', handleStorage)
            clearInterval(interval)
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
