'use client'

import React, { useState, useEffect } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useThemeSystem } from '@/lib/themes/context'
import { markDepositAsPaid } from '@/app/actions/orders'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, ShoppingBag, ChevronDown, Package, Wallet, BadgeCheck } from 'lucide-react'

interface OrderItem {
    id: string
    product_name: string
    variant_title?: string | null
    quantity: number
    unit_price_minor: number
    size?: string | null
    color?: string | null
}

interface Order {
    id: string
    shopify_order_number?: string | null
    created_at: string
    source: string
    status: string
    financial_status?: string | null
    fulfillment_status?: string | null
    total_amount_minor: number
    paid_amount_minor?: number | null
    total_shipping_minor?: number
    currency: string
    order_items: OrderItem[]
}

export function OrderHistory({ customerId }: { customerId: string }) {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [markingPaid, setMarkingPaid] = useState<string | null>(null)
    const [toastMessage, setToastMessage] = useState<{ text: string, error?: boolean } | null>(null)
    const supabase = createClient()
    const { themeConfig } = useThemeSystem()
    const router = useRouter()

    useEffect(() => {
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    shopify_order_number,
                    created_at,
                    source,
                    status,
                    financial_status,
                    fulfillment_status,
                    total_amount_minor,
                    paid_amount_minor,
                    total_shipping_minor,
                    currency,
                    order_items (*)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })

            if (data) {
                setOrders(data)
            }
            setLoading(false)
        }

        fetchOrders()
    }, [customerId])

    const toggleOrder = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId)
    }

    const handleMarkPaid = async (e: React.MouseEvent, orderId: string) => {
        // Prevent accordion toggle
        e.stopPropagation()
        setMarkingPaid(orderId)

        const result = await markDepositAsPaid(orderId, customerId)

        if (result.success) {
            setToastMessage({ text: 'Order marked as fully paid successfully!' })
            // Instantly update local state so badge changes from Deposit → Paid
            setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                financial_status: 'paid',
                status: 'paid',
                paid_amount_minor: o.total_amount_minor
            } : o))
            router.refresh()
        } else {
            setToastMessage({ text: result.error || 'Failed to update order', error: true })
        }

        setMarkingPaid(null)
        setTimeout(() => setToastMessage(null), 3000)
    }

    if (loading) {
        return <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
    }

    const getStatusColor = (status: string, financialStatus?: string | null) => {
        if (financialStatus === 'partially_paid') return 'bg-purple-100 text-purple-700'
        switch (status?.toLowerCase()) {
            case 'paid':
                return 'bg-emerald-100 text-emerald-700'
            case 'pending':
                return 'bg-amber-100 text-amber-700'
            case 'cancelled':
            case 'refunded':
                return 'bg-red-100 text-red-700'
            default:
                return 'bg-sand-100 text-sand-700'
        }
    }

    const getStatusLabel = (status: string, financialStatus?: string | null) => {
        if (financialStatus === 'partially_paid') return 'Deposit'
        return status
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-sand-300" />
                <p className="text-sm">No orders yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => {
                const isExpanded = expandedOrder === order.id
                const itemCount = order.order_items?.length || 0

                return (
                    <div
                        key={order.id}
                        className={cn(
                            "luxury-gradient-card overflow-hidden transition-all",
                            isExpanded && "ring-2 ring-[var(--theme-primary)]/20"
                        )}
                    >
                        {/* Order Header - Clickable */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleOrder(order.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleOrder(order.id)}
                            className="relative w-full p-4 sm:p-5 text-left hover:bg-white/30 transition-colors cursor-pointer"
                        >
                            {/*
                              * TWO-MODE LAYOUT
                              * Mobile  (default): vertical stack — info top, action button bottom
                              * Desktop (md+):     two columns — info left, [button + chevron] right
                              */}
                            <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-3">

                                {/* ── INFO SECTION ── icon + all text data */}
                                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">

                                    {/* Icon + status badge column */}
                                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                        <div
                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center"
                                            style={{
                                                background: `linear-gradient(135deg, ${themeConfig.colors.gradientFrom}20, ${themeConfig.colors.gradientTo}30)`,
                                                backdropFilter: 'blur(8px)'
                                            }}
                                        >
                                            <Package className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: themeConfig.colors.accent }} />
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide whitespace-nowrap",
                                            getStatusColor(order.status, order.financial_status)
                                        )}>
                                            {getStatusLabel(order.status, order.financial_status)}
                                        </span>
                                    </div>

                                    {/* Text data — always grouped, never broken by an action button */}
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        {/* Order number */}
                                        <div className="font-bold text-primary text-base sm:text-lg font-mono">
                                            #{order.shopify_order_number || order.id.slice(0, 8)}
                                        </div>

                                        {/* Price */}
                                        <div
                                            className="font-bold font-mono text-base sm:text-lg"
                                            style={{ color: themeConfig.colors.accent }}
                                        >
                                            {formatCurrency(
                                                order.financial_status === 'partially_paid'
                                                    ? (order.paid_amount_minor || 0)
                                                    : order.total_amount_minor,
                                                order.currency
                                            )}
                                        </div>

                                        {/* Deposit details or shipping note */}
                                        {order.financial_status === 'partially_paid' ? (
                                            <div className="text-xs sm:text-sm space-y-0.5">
                                                <span className="text-muted-foreground">
                                                    Full price: {formatCurrency(order.total_amount_minor, order.currency)}
                                                </span>
                                                <span className="text-purple-600 font-medium block">
                                                    Remaining: {formatCurrency((order.total_amount_minor || 0) - (order.paid_amount_minor || 0), order.currency)}
                                                </span>
                                            </div>
                                        ) : order.total_shipping_minor && order.total_shipping_minor > 0 ? (
                                            <div className="text-xs sm:text-sm text-muted-foreground">
                                                incl. {formatCurrency(order.total_shipping_minor, order.currency)} ship
                                            </div>
                                        ) : null}

                                        {/* Item count */}
                                        {itemCount > 0 && (
                                            <div className="text-xs sm:text-sm text-muted-foreground">
                                                • {itemCount} item{itemCount !== 1 ? 's' : ''}
                                            </div>
                                        )}

                                        {/* Date */}
                                        <div className="text-xs sm:text-sm text-muted-foreground">
                                            {new Date(order.created_at).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* ── ACTION SECTION ── */}

                                {/* DESKTOP: action button + chevron, right-aligned, never stretching */}
                                <div className="hidden md:flex items-center gap-3 flex-shrink-0 self-center">
                                    {order.financial_status === 'partially_paid' && (
                                        <button
                                            onClick={(e) => handleMarkPaid(e, order.id)}
                                            disabled={markingPaid === order.id}
                                            className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                                                     bg-amber-50 text-amber-700 hover:bg-emerald-50 hover:text-emerald-700 border border-amber-300 hover:border-emerald-300 active:scale-95"
                                        >
                                            {markingPaid === order.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Wallet className="w-3.5 h-3.5" />
                                            )}
                                            {markingPaid === order.id ? 'Updating...' : 'Mark Fully Paid'}
                                        </button>
                                    )}

                                    {order.financial_status === 'paid' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                            <BadgeCheck className="w-3.5 h-3.5" />
                                            Fully Paid
                                        </span>
                                    )}

                                    <ChevronDown className={cn(
                                        "w-5 h-5 text-muted-foreground transition-transform",
                                        isExpanded && "rotate-180"
                                    )} />
                                </div>

                                {/* MOBILE: action button in its own dedicated zone at the bottom */}
                                <div className="flex md:hidden flex-col gap-2">
                                    {order.financial_status === 'partially_paid' && (
                                        <button
                                            onClick={(e) => handleMarkPaid(e, order.id)}
                                            disabled={markingPaid === order.id}
                                            className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                                                     bg-amber-50 text-amber-700 hover:bg-emerald-50 hover:text-emerald-700 border border-amber-300 hover:border-emerald-300 active:scale-95"
                                        >
                                            {markingPaid === order.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Wallet className="w-4 h-4" />
                                            )}
                                            {markingPaid === order.id ? 'Updating...' : 'Mark Fully Paid'}
                                        </button>
                                    )}

                                    {order.financial_status === 'paid' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <BadgeCheck className="w-3.5 h-3.5" />
                                            Fully Paid
                                        </span>
                                    )}
                                </div>

                                {/* MOBILE: chevron sits in the top-right corner via absolute positioning trick */}
                                <div className="md:hidden absolute top-4 right-4">
                                    <ChevronDown className={cn(
                                        "w-5 h-5 text-muted-foreground transition-transform",
                                        isExpanded && "rotate-180"
                                    )} />
                                </div>
                            </div>
                        </div>

                        {/* Expanded Order Items */}
                        {isExpanded && (
                            <div
                                className="border-t p-4 sm:p-5 space-y-3"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                    borderColor: 'rgba(255, 255, 255, 0.5)'
                                }}
                            >
                                {/* Items Header */}
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                    Order Items
                                </p>

                                {/* Items List */}
                                {order.order_items && order.order_items.length > 0 ? (
                                    <div className="space-y-3">
                                        {order.order_items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-2xl p-3 sm:p-4 shadow-sm"
                                                style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                    backdropFilter: 'blur(8px)',
                                                    WebkitBackdropFilter: 'blur(8px)',
                                                    border: `2px solid ${themeConfig.colors.accent}20`
                                                }}
                                            >
                                                {/* Item Details */}
                                                <div className="flex justify-between items-start gap-3 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-primary text-sm sm:text-base">
                                                            {item.product_name}
                                                        </p>
                                                    </div>
                                                    {/* Price */}
                                                    <p
                                                        className="font-bold font-mono text-base sm:text-lg flex-shrink-0"
                                                        style={{ color: themeConfig.colors.accent }}
                                                    >
                                                        {formatCurrency(item.unit_price_minor, order.currency)}
                                                    </p>
                                                </div>

                                                {/* Variant Info - Only show size/color if not in variant_title */}
                                                <div className="flex flex-wrap gap-2">
                                                    {item.variant_title ? (
                                                        <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs">
                                                            {item.variant_title}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {item.size && (
                                                                <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs">
                                                                    {item.size}
                                                                </span>
                                                            )}
                                                            {item.color && (
                                                                <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs">
                                                                    {item.color}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                    {item.quantity > 1 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            × {item.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        No item details available
                                    </p>
                                )}

                                {/* Shipping */}
                                {order.total_shipping_minor && order.total_shipping_minor > 0 && (
                                    <div
                                        className="px-4 py-3 rounded-2xl border flex justify-between items-center"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                            backdropFilter: 'blur(8px)',
                                            WebkitBackdropFilter: 'blur(8px)',
                                            borderColor: 'rgba(255, 255, 255, 0.6)'
                                        }}
                                    >
                                        <span className="text-sm text-muted-foreground">Shipping:</span>
                                        <span
                                            className="text-sm font-bold font-mono"
                                            style={{ color: themeConfig.colors.accent }}
                                        >
                                            {formatCurrency(order.total_shipping_minor, order.currency)}
                                        </span>
                                    </div>
                                )}

                                {/* Order Summary Footer */}
                                <div
                                    className="flex flex-wrap justify-between items-center pt-4 mt-3 border-t gap-2"
                                    style={{ borderColor: `${themeConfig.colors.accent}30` }}
                                >
                                    <div className="text-xs text-muted-foreground">
                                        Source: <span className="capitalize font-medium">{order.source?.replace('_', ' ')}</span>
                                    </div>
                                    <div
                                        className="font-bold text-base sm:text-lg font-mono"
                                        style={{ color: themeConfig.colors.primary }}
                                    >
                                        {order.financial_status === 'partially_paid'
                                            ? <>Paid: {formatCurrency(order.paid_amount_minor || 0, order.currency)}</>
                                            : <>Total: {formatCurrency(order.total_amount_minor, order.currency)}</>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
