'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Users,
    Wallet,
    Megaphone,
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeft,
    Loader2,
    HelpCircle,
    Package
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n/context'
import { useAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { useThemeSystem } from '@/lib/themes/context'
import { IMAGES } from '@/lib/constants/images'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { t } = useLanguage()
    const { user, profile, loading } = useAuthUser()
    const { themeConfig, loading: themeLoading } = useThemeSystem()
    const supabase = createClient()

    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Load collapsed state from localStorage
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true))
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (stored === 'true') {
            requestAnimationFrame(() => setIsCollapsed(true))
        }
    }, [])

    // Persist collapsed state
    const toggleCollapsed = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
    }

    const mainNavItems = [
        { href: '/dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
        { href: '/customers', label: t('common.customers'), icon: Users },
        { href: '/finance', label: t('common.finance'), icon: Wallet },
        { href: '/finance/orders', label: t('common.orders'), icon: Package },
        { href: '/marketing', label: t('common.marketing'), icon: Megaphone },
    ]

    const bottomNavItems = [
        { href: '/settings', label: t('common.settings'), icon: Settings },
    ]

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const getDisplayName = () => {
        if (loading) return t('common.loading')
        return profile?.display_name || profile?.full_name || user?.email?.split('@')[0] || t('common.user')
    }

    const getEmail = () => {
        if (loading) return ''
        return user?.email || ''
    }

    const getInitials = () => {
        const name = profile?.display_name || profile?.full_name || user?.email
        if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <aside className="w-64 hidden lg:flex flex-col h-screen fixed ltr:left-0 rtl:right-0 top-0 z-50 glass-sidebar" />
        )
    }

    // Determine text color based on theme brightness for the header part
    const headerTextColor = themeConfig.isDark ? 'text-white' : 'text-gray-900'

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col h-screen fixed ltr:left-0 rtl:right-0 top-0 z-50",
                "glass-sidebar",
                "transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[72px]" : "w-64"
            )}
        >
            {/* Header with Logo & Collapse Toggle - Dynamic Background */}
            <div
                className={cn(
                    "h-20 flex items-center border-b border-white/10",
                    isCollapsed ? "justify-center px-2" : "justify-between px-6"
                )}
                style={{
                    background: themeLoading
                        ? undefined
                        : `linear-gradient(135deg, ${themeConfig.colors.gradientFrom}, ${themeConfig.colors.gradientVia}, ${themeConfig.colors.gradientTo})`
                }}
            >
                {!isCollapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <img
                            src={IMAGES.LOGO}
                            alt="STITCHED"
                            className={cn(
                                "h-12 w-auto object-contain",
                                // If theme is dark, use original logo (assuming it's light/white). 
                                // If theme is light, invert it to be dark.
                                // Adjust this logic based on your actual logo color.
                                // Assuming uploaded logo is black text:
                                themeConfig.isDark ? "invert brightness-0 invert" : "brightness-0"
                            )}
                            style={{
                                imageRendering: 'auto',
                                // Example override if needed: filter: themeConfig.isDark ? 'invert(1)' : 'none'
                                filter: themeConfig.isDark ? 'brightness(0) invert(1)' : 'brightness(0)'
                            }}
                        />
                    </Link>
                )}

                {isCollapsed && (
                    <Link href="/dashboard">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img
                                src={IMAGES.LOGO}
                                alt="S"
                                className="h-8 w-auto object-contain"
                                style={{
                                    filter: themeConfig.isDark ? 'brightness(0) invert(1)' : 'brightness(0)'
                                }}
                            />
                        </div>
                    </Link>
                )}

                {!isCollapsed && (
                    <button
                        onClick={toggleCollapsed}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            themeConfig.isDark
                                ? "text-white/70 hover:bg-white/10 hover:text-white"
                                : "text-black/60 hover:bg-black/5 hover:text-black"
                        )}
                        title="Collapse sidebar"
                    >
                        <PanelLeftClose className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {isCollapsed && (
                <button
                    onClick={toggleCollapsed}
                    className="mx-auto mt-4 p-2 rounded-lg hover:bg-sand-100 dark:hover:bg-zinc-800 transition-colors text-muted-foreground"
                    title="Expand sidebar"
                >
                    <PanelLeft className="w-5 h-5" />
                </button>
            )}

            {/* Main Navigation */}
            <nav className={cn(
                "flex-1 py-4 overflow-y-auto",
                isCollapsed ? "px-2" : "px-3"
            )}>
                <div className="space-y-1">
                    {mainNavItems.map((item) => {
                        // More specific route matching - only highlight if it's the exact match or no other item is more specific
                        let isActive = false

                        if (item.href === '/dashboard') {
                            isActive = pathname === '/dashboard'
                        } else if (item.href === '/finance/orders') {
                            // Orders page - exact match or subpaths
                            isActive = pathname.startsWith('/finance/orders')
                        } else if (item.href === '/finance') {
                            // Finance page - only if exactly /finance, not /finance/orders
                            isActive = pathname === '/finance'
                        } else {
                            // Other routes - standard logic
                            isActive = pathname.startsWith(item.href)
                        }

                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-xl transition-all duration-200",
                                    isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                                    isActive
                                        ? "bg-white/85 dark:bg-white/20 text-gray-900 dark:text-white border border-white/60 dark:border-white/30 shadow-sm"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10 border border-transparent"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={cn(
                                    "flex-shrink-0",
                                    isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]"
                                )} />

                                {!isCollapsed && (
                                    <span className={cn(
                                        "text-[13px] tracking-tight",
                                        isActive ? "font-semibold" : "font-medium"
                                    )}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className={cn(
                "border-t border-white/20",
                isCollapsed ? "px-2 py-3" : "px-3 py-4"
            )}>
                {/* Settings Nav */}
                <div className="space-y-1 mb-3">
                    {bottomNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center rounded-xl transition-all duration-200",
                                    isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                                    isActive
                                        ? "bg-white/85 dark:bg-white/20 text-gray-900 dark:text-white border border-white/60 dark:border-white/30 shadow-sm"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10 border border-transparent"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={cn(
                                    "flex-shrink-0",
                                    isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]"
                                )} />

                                {!isCollapsed && (
                                    <span className={cn(
                                        "text-[13px] tracking-tight",
                                        isActive ? "font-semibold" : "font-medium"
                                    )}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </div>

                {/* User Profile */}
                <div className={cn(
                    "rounded-lg transition-colors mb-3",
                    isCollapsed
                        ? "flex justify-center"
                        : "flex items-center gap-3 p-2 hover:bg-sand-100 dark:hover:bg-zinc-800"
                )}>
                    <div className={cn(
                        "rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-semibold shadow-md",
                        isCollapsed ? "w-10 h-10 text-sm" : "w-9 h-9 text-xs"
                    )}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            getInitials()
                        )}
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-primary dark:text-white truncate">
                                    {getDisplayName()}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {getEmail()}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* Theme & Language Toggle */}
                {!isCollapsed && (
                    <div className="flex items-center justify-center px-2 py-2">
                        <LanguageSwitcher />
                    </div>
                )}

                {isCollapsed && (
                    <div className="flex flex-col items-center gap-2">
                        <LanguageSwitcher />
                    </div>
                )}

                {/* Logout for collapsed mode */}
                {isCollapsed && (
                    <button
                        onClick={handleLogout}
                        className="w-full mt-2 p-3 flex justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                        title="Sign out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>
        </aside>
    )
}
