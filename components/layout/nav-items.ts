import {
    LayoutDashboard,
    Users,
    Wallet,
    Package,
    Megaphone,
    Star,
    Bot,
    ShieldCheck,
    Settings,
    type LucideIcon,
} from 'lucide-react'

export interface NavItem {
    href: string
    labelKey: string       // i18n key like 'common.dashboard', or raw string
    icon: LucideIcon
    isRawLabel?: boolean   // true = use labelKey as-is, false = translate it
}

/**
 * Single source of truth for all navigation items.
 * Both Sidebar (desktop) and MobileNav (mobile) read from here.
 */
export const ALL_NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', labelKey: 'common.dashboard', icon: LayoutDashboard },
    { href: '/customers', labelKey: 'common.customers', icon: Users },
    { href: '/finance', labelKey: 'common.finance', icon: Wallet },
    { href: '/finance/orders', labelKey: 'common.orders', icon: Package },
    { href: '/marketing', labelKey: 'common.marketing', icon: Megaphone },
    { href: '/marketing/reviews', labelKey: 'Reviews', icon: Star, isRawLabel: true },
    // Hidden: uncomment the next line to re-enable the Workflows page in navigation
    // { href: '/marketing/reviews/automations', labelKey: 'common.automations', icon: Bot },
    { href: '/marketing/moderation', labelKey: 'common.moderation', icon: ShieldCheck },
]

/** Paths visible to moderator role */
export const MODERATOR_PATHS = ['/customers', '/marketing/reviews', '/marketing/moderation', '/finance/orders']

/** Bottom nav items for non-moderators */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
    { href: '/settings', labelKey: 'common.settings', icon: Settings },
]

/** Route matching logic — shared so both sidebars highlight the same way */
export function isRouteActive(href: string, pathname: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/finance/orders') return pathname.startsWith('/finance/orders')
    if (href === '/finance') return pathname === '/finance'
    if (href === '/marketing/moderation') return pathname.startsWith('/marketing/moderation')
    if (href === '/marketing/reviews/automations') return pathname.startsWith('/marketing/reviews/automations')
    if (href === '/marketing/reviews') return pathname === '/marketing/reviews'
    if (href === '/marketing') return pathname === '/marketing'
    return pathname.startsWith(href)
}
