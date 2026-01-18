import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, AlertCircle, Edit } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AddOrderButton } from '@/components/orders/AddOrderButton'
import { getDictionary } from '@/lib/i18n/config'
import { cookies } from 'next/headers'
import { DeleteCustomerButton } from '@/components/customers/DeleteCustomerButton'
import { ProfileCard } from '@/components/customers/ProfileCard'
import { BentoMetrics } from '@/components/customers/BentoMetrics'
import { MeasurementsGrid } from '@/components/customers/MeasurementsGrid'
import { AdditionalComments } from '@/components/customers/AdditionalComments'
import { OrderHistory } from '@/components/customers/OrderHistory'
import { GlassButton } from '@/components/ui/GlassButton'
import { CustomerDetailsWrapper } from '@/components/customers/CustomerDetailsWrapper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CustomerDetailsPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const cookieStore = await cookies()
    const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'ar') as 'ar' | 'en'
    const dict = await getDictionary(locale)

    // Parallel data fetching
    const [customerReq, ordersReq, tiersReq] = await Promise.all([
        supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('orders')
            .select(`
                *,
                shipping_debug:total_shipping_minor,
                order_items (*)
            `)
            .eq('customer_id', id)
            .order('created_at', { ascending: false }),
        supabase
            .from('loyalty_tiers')
            .select('*')
            .order('min_spend_minor', { ascending: true })
    ])

    if (customerReq.error || !customerReq.data) {
        notFound()
    }

    const customer = customerReq.data
    const orders = ordersReq.data || []
    const tiers = tiersReq.data || []

    // Calculate Lifetime Value
    const lifetimeValue = orders.reduce((sum, order) => sum + (order.total_amount_minor || 0), 0)

    // Determine Loyalty Tier (Dynamic)
    const currentTier = tiers
        .slice()
        .reverse()
        .find(t => lifetimeValue >= t.min_spend_minor) || tiers[0]

    return (
        <CustomerDetailsWrapper>
            {/* Header Section with Buttons */}
            <div className="relative pt-6 sm:pt-8 pb-12 sm:pb-16">
                {/* Back Button */}
                <div className="absolute top-6 ltr:left-6 rtl:right-6 sm:top-8 sm:ltr:left-8 sm:rtl:right-8 z-20">
                    <Link
                        href="/customers"
                        className="inline-flex items-center gap-2 text-sm text-primary/70 dark:text-white/70 hover:text-primary dark:hover:text-white transition-colors bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm px-3 py-2 rounded-full"
                    >
                        <ArrowLeft className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                        {locale === 'en' ? 'Back' : 'رجوع'}
                    </Link>
                </div>

                {/* Action Buttons - Floating Top Right */}
                <div className="absolute top-6 ltr:right-6 rtl:left-6 sm:top-8 sm:ltr:right-8 sm:rtl:left-8 flex items-center gap-2 z-20">
                    <AddOrderButton customerId={customer.id} customerName={customer.full_name || 'Customer'} />
                    <div className="hidden sm:flex items-center gap-2">
                        <Link href={`/customers/${customer.id}/edit`}>
                            <GlassButton
                                variant="primary"
                                size="sm"
                                icon={<Edit className="w-4 h-4" />}
                                className="hidden sm:inline-flex"
                            >
                                <span className="hidden md:inline">{dict.customer_details.edit_profile}</span>
                                <span className="md:hidden">Edit</span>
                            </GlassButton>
                        </Link>
                        <DeleteCustomerButton
                            customerId={customer.id}
                            confirmMessage={(dict.customer_details as any).delete_confirm || 'Delete this customer?'}
                            label={(dict.customer_details as any).delete || 'Delete'}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-4">

                {/* Desktop: Split Screen Layout */}
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">

                    {/* Left Column - Profile & Measurements (Fixed on Desktop) */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                        {/* Profile Card - Overlaps Header */}
                        <ProfileCard
                            customer={customer}
                            tier={currentTier ? { name: currentTier.name, color: currentTier.color } : undefined}
                            locale={locale}
                        />

                        {/* Action Buttons - Mobile Only */}
                        <div className="flex flex-wrap items-center justify-center gap-2 lg:hidden px-4">
                            <Link href={`/customers/${customer.id}/edit`}>
                                <GlassButton
                                    variant="primary"
                                    size="sm"
                                    icon={<Edit className="w-4 h-4" />}
                                >
                                    {dict.customer_details.edit_profile}
                                </GlassButton>
                            </Link>
                            <DeleteCustomerButton
                                customerId={customer.id}
                                confirmMessage={(dict.customer_details as any).delete_confirm || 'Delete this customer?'}
                                label={(dict.customer_details as any).delete || 'Delete'}
                            />
                        </div>

                        {/* Measurements - Desktop Sidebar Position */}
                        <div className="hidden lg:block space-y-6">
                            <MeasurementsGrid customer={customer} dict={dict} />
                            <AdditionalComments comments={customer.additional_comments} dict={dict} />
                        </div>
                    </div>

                    {/* Right Column - Metrics & Orders (Scrollable on Desktop) */}
                    <div className="lg:col-span-8 xl:col-span-9 mt-6 lg:mt-0 space-y-6">

                        {/* Bento Metrics Grid */}
                        <BentoMetrics
                            customer={customer}
                            lastOrderDate={orders[0]?.created_at}
                            locale={locale}
                            dict={dict}
                        />

                        {/* Measurements - Mobile Position */}
                        <div className="lg:hidden space-y-6">
                            <MeasurementsGrid customer={customer} dict={dict} />
                            <AdditionalComments comments={customer.additional_comments} dict={dict} />
                        </div>

                        {/* Recent Orders */}
                        <div className="luxury-gradient-card p-5 sm:p-6 lg:p-8">
                            <div className="flex items-center justify-between mb-7">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center"
                                        style={{
                                            background: 'color-mix(in srgb, var(--theme-primary) 15%, #ffffff)'
                                        }}
                                    >
                                        <Package className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--theme-primary)' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                                            {dict.customer_details.recent_orders}
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {orders.length} {locale === 'en' ? 'total orders' : 'طلب إجمالي'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Client-side fetch wrapper handles loading state internally */}
                            <OrderHistory customerId={customer.id} />
                        </div>
                    </div>
                </div>
            </div>
        </CustomerDetailsWrapper>
    )
}

// SVG Icons for specific uses
function DollarSignIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
