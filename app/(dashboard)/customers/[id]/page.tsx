import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Ruler, Package, Edit } from 'lucide-react'
import { getDictionary } from '@/lib/i18n/config'
import { cookies } from 'next/headers'
import { DeleteCustomerButton } from '@/components/customers/DeleteCustomerButton'
import { CustomerDetailsWrapper } from '@/components/customers/CustomerDetailsWrapper'
import { CustomerDetailsClient } from '@/components/customers/CustomerDetailsClient'
import { GlassButton } from '@/components/ui/GlassButton'
import { AddOrderButton } from '@/components/orders/AddOrderButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CustomerDetailsPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const cookieStore = await cookies()
    const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
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
            <div className="relative pt-6 sm:pt-8 pb-6 sm:pb-8">
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

                {/* Action Buttons */}
                <div className="absolute top-6 ltr:right-6 rtl:left-6 sm:top-8 sm:ltr:right-8 sm:rtl:left-8 flex items-center gap-2 z-20">
                    <AddOrderButton customerId={customer.id} customerName={customer.full_name} />
                    <DeleteCustomerButton
                        customerId={customer.id}
                        confirmMessage={(dict.customer_details as any).delete_confirm || 'Delete this customer?'}
                        label={(dict.customer_details as any).delete || 'Delete'}
                    />
                </div>

                {/* Customer Name Header + Tier Badge + Since Date */}
                <div className="text-center pt-12 sm:pt-4">
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary dark:text-white mb-3">
                        {customer.full_name}
                    </h1>
                    {/* Tier Badge + Since Date */}
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {currentTier && (
                            <span
                                className="inline-block text-[10px] px-4 py-2 rounded-full font-bold uppercase"
                                style={{
                                    backgroundColor: `${currentTier.color}e6`,
                                    color: currentTier.color === '#FFFFFF' || currentTier.color === '#ffffff' ? '#000' : '#fff',
                                    letterSpacing: '0.1em',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: `0 4px 12px ${currentTier.color}40`
                                }}
                            >
                                {currentTier.name}
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>📅</span>
                            {locale === 'en' ? 'Since' : 'منذ'}{' '}
                            {new Date(customer.created_at).toLocaleDateString(
                                locale === 'ar' ? 'ar-EG' : 'en-US',
                                { month: 'short', year: 'numeric' }
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Client-side Tabbed Interface */}
            <CustomerDetailsClient
                customer={customer}
                tier={currentTier ? { name: currentTier.name, color: currentTier.color } : undefined}
                lastOrderDate={orders[0]?.created_at}
                orders={orders}
                locale={locale}
                dict={dict}
            />
        </CustomerDetailsWrapper>
    )
}
