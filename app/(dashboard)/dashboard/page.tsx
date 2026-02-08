import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/config'
import { cookies } from 'next/headers'
import { PageHeader } from '@/components/ui/PageHeader'
import { DashboardFAB } from '@/components/dashboard/DashboardFAB'

interface KPIStats {
    totalOrders: number
    totalRevenue: number
    totalExpenses: number
    totalCustomers: number
    recentOrders: any[]
}

async function getStats(): Promise<KPIStats> {
    const supabase = await createClient()

    // Get order stats
    const { data: orders, count: totalOrders } = await supabase
        .from('orders')
        .select('total_amount_minor, created_at, id, shopify_order_number, status', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)

    // Get customer count
    const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

    // Calculate total revenue (including shipping fees)
    const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount_minor, total_shipping_minor')

    const totalRevenue = revenueData?.reduce((sum, o) =>
        sum + (o.total_amount_minor || 0) + (o.total_shipping_minor || 0), 0) || 0

    // Calculate expenses (shipping total only)
    const totalExpenses = revenueData?.reduce((sum, o) =>
        sum + (o.total_shipping_minor || 0), 0) || 0

    return {
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalExpenses,
        totalCustomers: totalCustomers || 0,
        recentOrders: orders || []
    }
}

import { DashboardToolbar } from '@/components/dashboard/DashboardToolbar'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stats = await getStats()

    const cookieStore = await cookies()
    const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
    const dict = await getDictionary(locale)

    const firstName = user?.email?.split('@')[0] || 'there'

    return (
        <>
            <div className="min-h-screen p-6 md:p-8 animate-fade-in">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Header */}
                    <div className="pb-4 border-b" style={{ borderColor: 'var(--theme-primary)15' }}>
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                            <div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--theme-primary)' }}>
                                    {dict.common.dashboard.toUpperCase()}
                                </p>
                                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900">
                                    {dict.dashboard.welcome} {firstName}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <DashboardToolbar />
                        </div>
                    </div>

                    {/* KPI Grid - Revenue full width, Orders and Customers side by side */}
                    <div className="grid grid-cols-1 gap-5">
                        {/* Total Revenue - Full Width */}
                        <div className="luxury-gradient-card p-5 rounded-3xl hover:luxury-gradient-card-hover group">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] uppercase tracking-widest text-[var(--theme-primary)] font-semibold">{dict.dashboard_new.revenue}</p>
                                <div className="p-2 rounded-xl bg-[var(--theme-primary)]/15 group-hover:scale-110 transition-transform">
                                    <DollarSign className="w-4 h-4 text-[var(--theme-primary)]" />
                                </div>
                            </div>
                            <p className="text-2xl font-mono font-bold text-gray-900 tabular-nums animate-count-up">
                                {formatCurrency(stats.totalRevenue)}
                            </p>
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 w-fit px-2 py-1 rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                <span>{dict.dashboard_new.all_time}</span>
                            </div>
                        </div>

                        {/* Orders and Customers - Side by Side */}
                        <div className="grid grid-cols-2 gap-5">
                            {/* Total Orders */}
                            <div className="luxury-gradient-card p-5 rounded-3xl hover:luxury-gradient-card-hover group">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] uppercase tracking-widest text-[var(--theme-primary)] font-semibold">{dict.dashboard_new.orders}</p>
                                    <div className="p-2 rounded-xl bg-[var(--theme-primary)]/15 group-hover:scale-110 transition-transform">
                                        <ShoppingBag className="w-4 h-4 text-[var(--theme-primary)]" />
                                    </div>
                                </div>
                                <p className="text-2xl font-mono font-bold text-gray-900 tabular-nums animate-count-up">
                                    {stats.totalOrders.toLocaleString()}
                                </p>
                                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                    <span>{dict.dashboard_new.total_orders_placed}</span>
                                </div>
                            </div>

                            {/* Total Customers */}
                            <div className="luxury-gradient-card p-5 rounded-3xl hover:luxury-gradient-card-hover group">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] uppercase tracking-widest text-[var(--theme-primary)] font-semibold">{dict.dashboard_new.customers}</p>
                                    <div className="p-2 rounded-xl bg-[var(--theme-primary)]/15 group-hover:scale-110 transition-transform">
                                        <Users className="w-4 h-4 text-[var(--theme-primary)]" />
                                    </div>
                                </div>
                                <p className="text-2xl font-mono font-bold text-gray-900 tabular-nums animate-count-up">
                                    {stats.totalCustomers.toLocaleString()}
                                </p>
                                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                    <span>{dict.dashboard_new.active_in_db}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Orders - Full Width */}
                    <div className="luxury-gradient-card overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/20">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{dict.dashboard_new.recent_orders}</h3>
                            </div>
                            <Link
                                href="/finance/orders"
                                className="text-xs font-medium text-amber-600 hover:underline flex items-center gap-1"
                            >
                                {dict.dashboard_new.view_all} <ArrowRight className="w-3 h-3 transform rtl:rotate-180" />
                            </Link>
                        </div>

                        <div className="divide-y divide-white/20">
                            {stats.recentOrders.length > 0 ? (
                                stats.recentOrders.map((order) => (
                                    <div key={order.id} className="p-4 hover:bg-sand-50/50 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
                                                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-primary">{dict.dashboard_new.orders} #{order.shopify_order_number || order.id.slice(0, 8)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-mono font-semibold text-primary">
                                                {formatCurrency(order.total_amount_minor)}
                                            </p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-sand-100 text-sand-700'
                                                }`}>
                                                {locale === 'ar' && order.status === 'paid' ? 'مدفوع' :
                                                    locale === 'ar' && order.status === 'pending' ? 'معلق' : order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">{dict.dashboard_new.no_orders}</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Floating Quick Actions */}
            <DashboardFAB />
        </>
    )
}
