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
    Menu,
    X,
    Loader2,
    Package
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n/context'
import { useAuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

import { useThemeSystem } from '@/lib/themes/context'
import { IMAGES } from '@/lib/constants/images'

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const { t } = useLanguage()
    const { user, profile, loading } = useAuthUser()
    const { themeConfig, loading: themeLoading } = useThemeSystem()
    const supabase = createClient()

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
        if (loading) return 'Loading...'
        return profile?.display_name || profile?.full_name || user?.email?.split('@')[0] || 'User'
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

    // Close menu when route changes
    useEffect(() => {
        requestAnimationFrame(() => setIsOpen(false))
    }, [pathname])

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    return (
        <>
            {/* Mobile Top Bar */}
            <div
                className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white/65 backdrop-blur-xl border-b border-white/40 z-50 flex items-center justify-between px-6 shadow-sm"
                style={{
                    background: themeLoading
                        ? undefined
                        : `linear-gradient(135deg, ${themeConfig.colors.gradientFrom}, ${themeConfig.colors.gradientVia}, ${themeConfig.colors.gradientTo})`
                }}
            >
                <div className="flex items-center gap-2">
                    <img
                        src={IMAGES.LOGO}
                        alt="STITCHED"
                        className={cn(
                            "h-12 w-auto object-contain",
                            themeConfig.isDark ? "invert brightness-0 invert" : "brightness-0"
                        )}
                        style={{
                            imageRendering: 'auto',
                            filter: themeConfig.isDark ? 'brightness(0) invert(1)' : 'brightness(0)'
                        }}
                    />
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "p-2 -mr-2 transition-colors",
                        themeConfig.isDark
                            ? "text-white/80 hover:text-white"
                            : "text-black/60 hover:text-black"
                    )}
                >
                    <Menu className="w-8 h-8" />
                </button>
            </div>

            {/* Overlay & Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer Panel - Glass Theme */}
                    <div className="absolute top-0 right-0 w-[280px] h-full bg-white/95 backdrop-blur-2xl shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-200">

                        {/* Header */}
                        <div className="h-16 flex items-center justify-between px-6 border-b border-white/20">
                            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Menu</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 -mr-2 text-muted-foreground hover:text-primary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Main Navigation */}
                            <nav className="flex-1 overflow-y-auto py-6 px-3">
                                <div className="space-y-1">
                                    {mainNavItems.map((item) => {
                                        // More specific route matching
                                        let isActive = false

                                        if (item.href === '/dashboard') {
                                            isActive = pathname === '/dashboard'
                                        } else if (item.href === '/finance/orders') {
                                            isActive = pathname.startsWith('/finance/orders')
                                        } else if (item.href === '/finance') {
                                            isActive = pathname === '/finance'
                                        } else {
                                            isActive = pathname.startsWith(item.href)
                                        }

                                        const Icon = item.icon

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                                    isActive
                                                        ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 shadow-sm font-semibold"
                                                        : "text-gray-600 hover:bg-gray-100 border border-transparent"
                                                )}
                                            >
                                                <Icon className={cn(
                                                    "w-[18px] h-[18px]",
                                                    isActive ? "text-[var(--theme-primary)]" : "text-muted-foreground"
                                                )} />
                                                <span className={cn(
                                                    "font-medium text-[13px]",
                                                    isActive && "font-semibold"
                                                )}>
                                                    {item.label}
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </nav>

                            {/* Bottom Navigation - Settings */}
                            <div className="px-3 pb-4 pt-2 border-t border-white/20">
                                <div className="space-y-1">
                                    {bottomNavItems.map((item) => {
                                        const isActive = pathname.startsWith(item.href)
                                        const Icon = item.icon

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                                    isActive
                                                        ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 shadow-sm font-semibold"
                                                        : "text-gray-600 hover:bg-black/5 border border-transparent"
                                                )}
                                            >
                                                <Icon className={cn(
                                                    "w-[18px] h-[18px]",
                                                    isActive ? "text-[var(--theme-primary)]" : "text-muted-foreground"
                                                )} />
                                                <span className={cn(
                                                    "font-medium text-[13px]",
                                                    isActive && "font-semibold"
                                                )}>
                                                    {item.label}
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50/80">
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors mb-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-semibold text-sm shadow-md">
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        getInitials()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-primary truncate">{getDisplayName()}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{getEmail()}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs uppercase tracking-wider text-gray-600 hover:text-[var(--theme-primary)] transition-all shadow-sm"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                            <div className="mt-3 pt-3 border-t border-sand-200/50 flex justify-center">
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
