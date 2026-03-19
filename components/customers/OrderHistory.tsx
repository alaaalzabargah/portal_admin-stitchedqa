'use client'

import React, { useState, useEffect } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useThemeSystem } from '@/lib/themes/context'
import { markDepositAsPaid } from '@/app/actions/orders'
import { useRouter } from 'next/navigation'
import { Loader2, ShoppingBag, ChevronDown, Wallet, BadgeCheck, Send, Check, MessageSquare, Globe, X } from 'lucide-react'

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

interface OrderHistoryProps {
    customerId: string
    customerName?: string
    customerPhone?: string
}

// ── WhatsApp Message Builders ────────────────────────────────────────

function buildEnMessage(items: { title: string }[], reviewLinks: string[]): string {
    if (items.length === 1) {
        return `\u200EStitched would love to hear from you \u2728\n\n\u200EWe hope your new *${items[0].title}* is making you feel extraordinary \uD83E\uDD0D\n\n\u200EWhenever you have a moment, we'd be honored if you shared your experience with us \u2661\n\n\u200E\uD83D\uDC49 ${reviewLinks[0]}`
    }
    const itemLines = items.map((p, i) => `\u200E\u2726 *${p.title}* \u2192 ${reviewLinks[i]}`).join('\n')
    return `\u200EStitched would love to hear from you \u2728\n\n\u200EWe hope you're enjoying your recent Stitched pieces \uD83E\uDD0D\n\n\u200EWhenever you have a moment, we'd love your thoughts \u2661\n\n${itemLines}`
}

function buildArMessage(items: { title: string }[], reviewLinks: string[]): string {
    if (items.length === 1) {
        return `\u200F\u0639\u0627\u0626\u0644\u0629 Stitched \u062A\u062A\u0648\u0642 \u0644\u0633\u0645\u0627\u0639 \u0631\u0623\u064A\u0643 \u2728\n\n\u200F\u0646\u062A\u0645\u0646\u0649 \u0623\u0646 \u062A\u0643\u0648\u0646 *${items[0].title}* \u0642\u062F \u0623\u0636\u0627\u0641\u062A \u0644\u0645\u0633\u0629 \u0645\u0646 \u0627\u0644\u0623\u0646\u0627\u0642\u0629 \u0648\u0627\u0644\u062A\u0645\u064A\u0632 \u0644\u0623\u064A\u0627\u0645\u0643 \uD83E\uDD0D\n\n\u200F\u0645\u062A\u0649 \u0645\u0627 \u0633\u0646\u062D\u062A \u0644\u0643\u0650 \u0627\u0644\u0641\u0631\u0635\u0629\u060C \u064A\u0633\u0639\u062F\u0646\u0627 \u0623\u0646 \u062A\u0634\u0627\u0631\u0643\u064A\u0646\u0627 \u062A\u062C\u0631\u0628\u062A\u0643 \u2661\n\n\u200E\uD83D\uDC49 ${reviewLinks[0]}`
    }
    const itemLines = items.map((p, i) => `\u200E\u2726 *${p.title}* \u2190 ${reviewLinks[i]}`).join('\n')
    return `\u200F\u0639\u0627\u0626\u0644\u0629 Stitched \u062A\u062A\u0648\u0642 \u0644\u0633\u0645\u0627\u0639 \u0631\u0623\u064A\u0643 \u2728\n\n\u200F\u0646\u062A\u0645\u0646\u0649 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0642\u0637\u0639\u0643 \u0627\u0644\u0623\u062E\u064A\u0631\u0629 \u0645\u0646 Stitched \u0642\u062F \u0623\u0636\u0627\u0641\u062A \u0644\u0645\u0633\u0629 \u0645\u0646 \u0627\u0644\u062A\u0645\u064A\u0632 \uD83E\uDD0D\n\n\u200F\u0645\u062A\u0649 \u0645\u0627 \u0633\u0646\u062D\u062A \u0644\u0643\u0650 \u0627\u0644\u0641\u0631\u0635\u0629\u060C \u064A\u0633\u0639\u062F\u0646\u0627 \u0623\u0646 \u062A\u0634\u0627\u0631\u0643\u064A\u0646\u0627 \u062A\u062C\u0631\u0628\u062A\u0643 \u2661\n\n${itemLines}`
}

// ── Status Helpers ───────────────────────────────────────────────────

function getStatusColor(status: string, financialStatus?: string | null) {
    if (financialStatus === 'partially_paid') return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
    switch (status?.toLowerCase()) {
        case 'paid': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
        case 'pending': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
        case 'cancelled': case 'refunded': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
        default: return { bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200' }
    }
}

function getStatusLabel(status: string, financialStatus?: string | null) {
    if (financialStatus === 'partially_paid') return 'Deposit'
    return status
}

// ── Component ────────────────────────────────────────────────────────

export function OrderHistory({ customerId, customerName, customerPhone }: OrderHistoryProps) {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [markingPaid, setMarkingPaid] = useState<string | null>(null)
    const [toastMessage, setToastMessage] = useState<{ text: string; error?: boolean } | null>(null)

    // Send review state
    const [sendingReviewFor, setSendingReviewFor] = useState<string | null>(null)
    const [reviewSending, setReviewSending] = useState<'EN' | 'AR' | null>(null)
    const [reviewSent, setReviewSent] = useState<string | null>(null)

    const supabase = createClient()
    const { themeConfig } = useThemeSystem()
    const router = useRouter()

    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await supabase
                .from('orders')
                .select(`
                    id, shopify_order_number, created_at, source, status,
                    financial_status, fulfillment_status, total_amount_minor,
                    paid_amount_minor, total_shipping_minor, currency,
                    order_items (*)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
            if (data) setOrders(data)
            setLoading(false)
        }
        fetchOrders()
    }, [customerId])

    const toggleOrder = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId)
    }

    const handleMarkPaid = async (e: React.MouseEvent, orderId: string) => {
        e.stopPropagation()
        setMarkingPaid(orderId)
        const result = await markDepositAsPaid(orderId, customerId)
        if (result.success) {
            setToastMessage({ text: 'Order marked as fully paid!' })
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, financial_status: 'paid', status: 'paid', paid_amount_minor: o.total_amount_minor } : o))
            router.refresh()
        } else {
            setToastMessage({ text: result.error || 'Failed to update order', error: true })
        }
        setMarkingPaid(null)
        setTimeout(() => setToastMessage(null), 3000)
    }

    // ── Send Review via WhatsApp ─────────────────────────────────────

    const handleSendReview = async (e: React.MouseEvent, orderId: string, language: 'EN' | 'AR') => {
        e.stopPropagation()
        if (!customerPhone || reviewSending) return

        const order = orders.find(o => o.id === orderId)
        if (!order || !order.order_items?.length) return

        setReviewSending(language)
        const whatsappWindow = window.open('', '_blank')

        try {
            const reviewsBase = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com'
            const productNames = order.order_items.map(item => item.product_name)

            let handleMap: Record<string, { title: string; handle: string }> = {}
            try {
                const res = await fetch('/api/admin/products/resolve-handles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productNames }),
                })
                const data = await res.json()
                if (data.resolved) handleMap = data.resolved
            } catch {}

            const items: { title: string; handle: string }[] = []
            const reviewLinks: string[] = []

            for (const orderItem of order.order_items) {
                const resolved = handleMap[orderItem.product_name]
                if (!resolved) continue

                items.push({ title: resolved.title, handle: resolved.handle })

                let link = `${reviewsBase}/${resolved.handle}`
                try {
                    const res = await fetch('/api/review-links', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            productHandle: resolved.handle,
                            customerName: customerName?.split(' ')[0],
                            customerWhatsapp: customerPhone,
                            lang: language === 'AR' ? 'ar' : undefined,
                        }),
                    })
                    const json = await res.json()
                    if (json.code) link = `${reviewsBase}/r/${json.code}`
                } catch {}
                reviewLinks.push(link)
            }

            if (items.length === 0) {
                setToastMessage({ text: 'Could not match order items to products', error: true })
                setTimeout(() => setToastMessage(null), 3000)
                whatsappWindow?.close()
                return
            }

            const message = language === 'EN' ? buildEnMessage(items, reviewLinks) : buildArMessage(items, reviewLinks)
            const phone = customerPhone.replace(/[^0-9]/g, '')
            const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`

            if (whatsappWindow) {
                whatsappWindow.location.href = waUrl
                setTimeout(() => { try { whatsappWindow.close() } catch {} }, 1500)
            } else {
                window.open(waUrl, '_blank')
            }

            setReviewSent(orderId)
            setSendingReviewFor(null)
            setTimeout(() => setReviewSent(null), 3000)
        } catch {
            whatsappWindow?.close()
            setToastMessage({ text: 'Failed to send review link', error: true })
            setTimeout(() => setToastMessage(null), 3000)
        } finally {
            setReviewSending(null)
        }
    }

    // ── Render ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
            </div>
        )
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                <p className="text-sm">No orders yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Toast */}
            {toastMessage && (
                <div className={cn(
                    "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg",
                    toastMessage.error
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                )}>
                    {toastMessage.text}
                </div>
            )}

            {orders.map((order) => {
                const isExpanded = expandedOrder === order.id
                const itemCount = order.order_items?.length || 0
                const isDeposit = order.financial_status === 'partially_paid'
                const isPaid = order.financial_status === 'paid'
                const statusStyle = getStatusColor(order.status, order.financial_status)
                const isShowingLangPicker = sendingReviewFor === order.id
                const wasSent = reviewSent === order.id

                return (
                    <div
                        key={order.id}
                        className={cn(
                            "rounded-2xl overflow-hidden transition-all duration-200 border",
                            isExpanded ? "shadow-lg" : "shadow-sm hover:shadow-md",
                        )}
                        style={{
                            background: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderColor: isExpanded ? `${themeConfig.colors.accent}25` : 'rgba(0,0,0,0.06)',
                        }}
                    >
                        {/* ── Collapsed Header ─────────────────────────── */}
                        <button
                            onClick={() => toggleOrder(order.id)}
                            className="w-full text-left p-4 sm:p-5 focus:outline-none transition-colors hover:bg-white/50"
                        >
                            {/* Row 1: Order # + Badge + Chevron */}
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-bold text-base sm:text-lg font-mono tracking-tight text-stone-900">
                                        #{order.shopify_order_number || order.id.slice(0, 8)}
                                    </span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border",
                                        statusStyle.bg, statusStyle.text, statusStyle.border
                                    )}>
                                        {getStatusLabel(order.status, order.financial_status)}
                                    </span>
                                </div>
                                <ChevronDown className={cn(
                                    "w-5 h-5 text-stone-300 transition-transform flex-shrink-0",
                                    isExpanded && "rotate-180"
                                )} />
                            </div>

                            {/* Row 2: Price block */}
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span
                                    className="font-bold font-mono text-lg sm:text-xl"
                                    style={{ color: themeConfig.colors.accent }}
                                >
                                    {formatCurrency(
                                        isDeposit ? (order.paid_amount_minor || 0) : order.total_amount_minor,
                                        order.currency
                                    )}
                                </span>
                                {isDeposit && (
                                    <>
                                        <span className="text-stone-400 text-sm">
                                            / {formatCurrency(order.total_amount_minor, order.currency)}
                                        </span>
                                        <span className="text-purple-600 text-xs font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                            Remaining: {formatCurrency((order.total_amount_minor || 0) - (order.paid_amount_minor || 0), order.currency)}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Row 3: Meta */}
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-400">
                                {itemCount > 0 && (
                                    <>
                                        <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                                        <span>·</span>
                                    </>
                                )}
                                <span className="capitalize">{order.source?.replace('_', ' ')}</span>
                                <span>·</span>
                                <span>
                                    {new Date(order.created_at).toLocaleDateString(undefined, {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </button>

                        {/* ── Action Bar (always visible, between header and expanded) ── */}
                        {(isDeposit || isPaid) && (
                            <div
                                className="flex items-center gap-2 px-4 sm:px-5 pb-3"
                                style={{ marginTop: '-4px' }}
                            >
                                {isDeposit && (
                                    <button
                                        onClick={(e) => handleMarkPaid(e, order.id)}
                                        disabled={markingPaid === order.id}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-50 border"
                                        style={{
                                            background: `${themeConfig.colors.accent}10`,
                                            borderColor: `${themeConfig.colors.accent}25`,
                                            color: themeConfig.colors.accent,
                                        }}
                                    >
                                        {markingPaid === order.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Wallet className="w-3.5 h-3.5" />
                                        )}
                                        {markingPaid === order.id ? 'Updating...' : 'Mark Fully Paid'}
                                    </button>
                                )}
                                {isPaid && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <BadgeCheck className="w-3.5 h-3.5" />
                                        Paid
                                    </span>
                                )}
                            </div>
                        )}

                        {/* ── Expanded Section ─────────────────────────── */}
                        {isExpanded && (
                            <div
                                className="border-t px-4 sm:px-5 py-4 space-y-0"
                                style={{ borderColor: 'rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.015)' }}
                            >
                                {/* Items */}
                                {order.order_items && order.order_items.length > 0 ? (
                                    <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                                        {order.order_items.map((item) => (
                                            <div key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm text-stone-800">
                                                        {item.product_name}
                                                        {item.quantity > 1 && (
                                                            <span className="text-stone-400 font-normal"> × {item.quantity}</span>
                                                        )}
                                                    </p>
                                                    {(item.variant_title || item.size || item.color) && (
                                                        <p className="text-xs text-stone-400 mt-0.5">
                                                            {item.variant_title || [item.size, item.color].filter(Boolean).join(' / ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <span
                                                    className="font-semibold font-mono text-sm flex-shrink-0"
                                                    style={{ color: themeConfig.colors.accent }}
                                                >
                                                    {formatCurrency(item.unit_price_minor, order.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-stone-400 italic py-3">No item details available</p>
                                )}

                                {/* Shipping + Total */}
                                <div
                                    className="pt-3 mt-1 border-t space-y-2"
                                    style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                                >
                                    {order.total_shipping_minor != null && order.total_shipping_minor > 0 && (
                                        <div className="flex justify-between text-xs text-stone-400">
                                            <span>Shipping</span>
                                            <span className="font-mono">
                                                {formatCurrency(order.total_shipping_minor, order.currency)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-stone-500">
                                            {isDeposit ? 'Total Paid' : 'Total'}
                                        </span>
                                        <span
                                            className="font-bold font-mono text-base"
                                            style={{ color: themeConfig.colors.accent }}
                                        >
                                            {formatCurrency(
                                                isDeposit ? (order.paid_amount_minor || 0) : order.total_amount_minor,
                                                order.currency
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Send Review ──────────────────────────── */}
                                {customerPhone && itemCount > 0 && (
                                    <div
                                        className="pt-3 mt-3 border-t"
                                        style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                                    >
                                        {wasSent ? (
                                            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100">
                                                <Check className="w-3.5 h-3.5" />
                                                Opened in WhatsApp
                                            </div>
                                        ) : !isShowingLangPicker ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSendingReviewFor(order.id)
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] focus:outline-none border"
                                                style={{
                                                    color: themeConfig.colors.accent,
                                                    borderColor: `${themeConfig.colors.accent}20`,
                                                    background: `${themeConfig.colors.accent}05`,
                                                }}
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                Send Review Link
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleSendReview(e, order.id, 'EN')}
                                                    disabled={reviewSending !== null}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] focus:outline-none disabled:opacity-50 text-white"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${themeConfig.colors.accent}, ${themeConfig.colors.gradientTo || themeConfig.colors.accent})`,
                                                        boxShadow: `0 2px 12px ${themeConfig.colors.accent}25`,
                                                    }}
                                                >
                                                    {reviewSending === 'EN' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                                    {reviewSending === 'EN' ? 'Sending...' : 'English'}
                                                </button>
                                                <button
                                                    onClick={(e) => handleSendReview(e, order.id, 'AR')}
                                                    disabled={reviewSending !== null}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] focus:outline-none disabled:opacity-50 border"
                                                    style={{
                                                        color: themeConfig.colors.accent,
                                                        borderColor: `${themeConfig.colors.accent}25`,
                                                        background: `${themeConfig.colors.accent}08`,
                                                    }}
                                                >
                                                    {reviewSending === 'AR' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                                                    {reviewSending === 'AR' ? 'Sending...' : 'Arabic'}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSendingReviewFor(null)
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors focus:outline-none flex-shrink-0"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
