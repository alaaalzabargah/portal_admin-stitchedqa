'use client'

import { useState } from 'react'
import { User, Ruler, Package } from 'lucide-react'
import { CustomerTabs } from './CustomerTabs'
import { OverviewTab } from './OverviewTab'
import { MeasurementsGrid } from './MeasurementsGrid'
import { AdditionalComments } from './AdditionalComments'
import { OrderHistory } from './OrderHistory'
import { StickyActions } from './StickyActions'

interface CustomerDetailsClientProps {
    customer: any
    tier?: {
        name: string
        color: string
    }
    lastOrderDate?: string
    orders?: any[]
    locale: 'ar' | 'en'
    dict: any
}

export function CustomerDetailsClient({
    customer,
    tier,
    lastOrderDate,
    orders = [],
    locale,
    dict
}: CustomerDetailsClientProps) {
    const [activeTab, setActiveTab] = useState('overview')

    const tabs = [
        {
            id: 'overview',
            label: locale === 'en' ? 'Overview' : 'نظرة عامة',
            icon: <User className="w-4 h-4" />
        },
        {
            id: 'measurements',
            label: locale === 'en' ? 'Measurements' : 'المقاسات',
            icon: <Ruler className="w-4 h-4" />
        },
        {
            id: 'orders',
            label: locale === 'en' ? 'Orders' : 'الطلبات',
            icon: <Package className="w-4 h-4" />
        }
    ]

    return (
        <>
            <div className="max-w-7xl mx-auto">
                {/* Tabs */}
                <CustomerTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* Tab Content */}
                <div className="p-4 sm:p-6 lg:p-8">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            customer={customer}
                            tier={tier}
                            lastOrderDate={lastOrderDate}
                            locale={locale}
                            dict={dict}
                        />
                    )}

                    {activeTab === 'measurements' && (
                        <div className="space-y-6 pb-24">
                            <MeasurementsGrid customer={customer} orders={orders} dict={dict} />
                            <AdditionalComments comments={customer.additional_comments} dict={dict} />
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="pb-24">
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
                                                {customer.order_count ?? 0} {locale === 'en' ? 'total orders' : 'طلب إجمالي'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <OrderHistory customerId={customer.id} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
