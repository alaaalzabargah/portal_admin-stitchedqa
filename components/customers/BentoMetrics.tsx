'use client'

import { DollarSign, ShoppingBag, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useThemeSystem } from '@/lib/themes/context'

interface BentoMetricsProps {
    customer: {
        total_spend_minor: number
        order_count: number
    }
    lastOrderDate?: string
    locale: 'ar' | 'en'
    dict: any
}

export function BentoMetrics({ customer, lastOrderDate, locale, dict }: BentoMetricsProps) {
    const { themeConfig } = useThemeSystem()

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Total Spend */}
            <div className="luxury-gradient-card p-6">
                <div className="flex items-start gap-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                            background: `color-mix(in srgb, ${themeConfig.colors.primary} 15%, #ffffff)`
                        }}
                    >
                        <DollarSign
                            className="w-6 h-6"
                            style={{ color: themeConfig.colors.primary }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-600 font-medium mb-1">
                            {dict.customer_details?.total_spend || 'Total Spend'}
                        </p>
                        <p
                            className="text-2xl font-bold font-mono"
                            style={{ color: themeConfig.colors.primary }}
                        >
                            {formatCurrency(customer.total_spend_minor)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Order Count */}
            <div className="luxury-gradient-card p-6">
                <div className="flex items-start gap-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                            background: `color-mix(in srgb, ${themeConfig.colors.primary} 15%, #ffffff)`
                        }}
                    >
                        <ShoppingBag
                            className="w-6 h-6"
                            style={{ color: themeConfig.colors.primary }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-600 font-medium mb-1">
                            {dict.customer_details?.orders || 'Orders'}
                        </p>
                        <p
                            className="text-2xl font-bold font-mono"
                            style={{ color: themeConfig.colors.primary }}
                        >
                            {customer.order_count ?? 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Last Order */}
            <div className="luxury-gradient-card p-6 col-span-2 lg:col-span-1">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-600 font-medium mb-1">
                            {dict.customer_details?.last_order || 'Last Order'}
                        </p>
                        <p className="text-lg font-bold font-mono text-slate-700">
                            {lastOrderDate
                                ? new Date(lastOrderDate).toLocaleDateString(
                                    locale === 'ar' ? 'ar-EG' : 'en-US',
                                    { day: 'numeric', month: 'short', year: 'numeric' }
                                )
                                : '-'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
