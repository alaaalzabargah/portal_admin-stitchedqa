import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/config'
import { cookies } from 'next/headers'
import { PageHeader } from '@/components/ui/PageHeader'

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
        .select('total_amount_minor, created_at, id, status', { count: 'exact' })
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

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stats = await getStats()

    const cookieStore = await cookies()
    const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'ar') as 'ar' | 'en'
    const dict = await getDictionary(locale)

    const firstName = user?.email?.split('@')[0] || 'there'

    return (
        <div className="min-h-screen p-6 md:p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <PageHeader
                    label={dict.common.dashboard.toUpperCase()}
                    title={`${dict.dashboard.welcome} ${firstName}`}
                />
                <p className="text-sm text-muted-foreground -mt-6 mb-8">
                    {new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Total Revenue */}
                    <div className="luxury-gradient-card p-6 rounded-3xl hover:luxury-gradient-card-hover group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[11px] uppercase tracking-widest text-[var(--theme-primary)] font-semibold">{dict.dashboard_new.revenue}</p>
                            <div className="p-2.5 rounded-xl bg-[var(--theme-primary)]/15 group-hover:scale-110 transition-transform">
                                <DollarSign className="w-5 h-5 text-[var(--theme-primary)]" />
                            </div>
                        </div>
                        <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums animate-count-up">
                            {formatCurrency(stats.totalRevenue)}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 w-fit px-2 py-1 rounded-full">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{dict.dashboard_new.all_time}</span>
                        </div>
                    </div>

                    {/* Total Orders */}
                    <div className="luxury-gradient-card p-6 rounded-3xl hover:luxury-gradient-card-hover group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[11px] uppercase tracking-widest text-[var(--theme-primary)] font-semibold">{dict.dashboard_new.orders}</p>
                            <div className="p-2.5 rounded-xl bg-[var(--theme-primary)]/15 group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-5 h-5 text-[var(--theme-primary)]" />
                            </div>
                        </div>
                        <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums animate-count-up">
                            {stats.totalOrders.toLocaleString()}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                            <span>{dict.dashboard_new.total_orders_placed}</span>
                        </div>
                    </div>

                    {/* Total Customers */}
                    <div className="luxury-gradient-card p-6 rounded-3xl hover:luxury-gradient-card-hover group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[11px] uppercase tracking-widest text-[var(--theme-primary)] font-semibold">{dict.dashboard_new.customers}</p>
                            <div className="p-2.5 rounded-xl bg-[var(--theme-primary)]/15 group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5 text-[var(--theme-primary)]" />
                            </div>
                        </div>
                        <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white tabular-nums animate-count-up">
                            {stats.totalCustomers.toLocaleString()}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                            <span>{dict.dashboard_new.active_in_db}</span>
                        </div>
                    </div>
                </div>

                {/* Recent Orders + Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Orders */}
                    <div className="lg:col-span-2 luxury-gradient-card overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/20">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{dict.dashboard_new.recent_orders}</h3>
                            </div>
                            <Link
                                href="/finance/orders"
                                className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                            >
                                {dict.dashboard_new.view_all} <ArrowRight className="w-3 h-3 transform rtl:rotate-180" />
                            </Link>
                        </div>

                        <div className="divide-y divide-white/20">
                            {stats.recentOrders.length > 0 ? (
                                stats.recentOrders.map((order) => (
                                    <div key={order.id} className="p-4 hover:bg-sand-50/50 dark:hover:bg-sand-100/30 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-sand-100 dark:bg-sand-200 flex items-center justify-center">
                                                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-primary">{dict.dashboard_new.orders} #{order.id.slice(0, 8)}</p>
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

                    {/* Quick Actions */}
                    <div className="luxury-gradient-card p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{dict.dashboard_new.quick_actions}</h3>

                        <Link
                            href="/customers/new"
                            className="block p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                                    <Users className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-primary">{dict.dashboard_new.add_customer}</p>
                                    <p className="text-xs text-muted-foreground">{dict.dashboard_new.create_profile}</p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            href="/marketing"
                            className="block p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                                    <ShoppingBag className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-primary">{dict.dashboard_new.send_campaign}</p>
                                    <p className="text-xs text-muted-foreground">{dict.dashboard_new.whatsapp_marketing}</p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            href="/finance"
                            className="block p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/20 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                                    <DollarSign className="w-4 h-4 text-accent" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-primary">{dict.dashboard_new.view_finance}</p>
                                    <p className="text-xs text-muted-foreground">{dict.dashboard_new.reports_analytics}</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    )
}
