'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, MessageSquare, Globe, Check, Loader2, Search, Image as ImageIcon, Send, X, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { searchCustomers } from '@/lib/actions/customer'

interface Product {
    id: string
    title: string
    handle: string
    image: string | null
}

interface ProductStat {
    avg: number
    count: number
    distribution: Record<string, number>
}

type CopyType = 'LINK_ONLY' | 'EN_MSG' | 'AR_MSG'

export default function ReviewLinkGenerator() {
    const [products, setProducts] = useState<Product[]>([])
    const [productStats, setProductStats] = useState<Record<string, ProductStat>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    // Pagination state
    const [pageInfo, setPageInfo] = useState<{
        hasNextPage: boolean
        hasPreviousPage: boolean
        startCursor: string | null
        endCursor: string | null
    }>({ hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null })
    const [paginationLoading, setPaginationLoading] = useState(false)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 15

    const fetchProducts = useCallback(async (cursor?: { after?: string; before?: string }, direction?: 'next' | 'prev') => {
        try {
            setPaginationLoading(true)
            const params = new URLSearchParams()
            if (cursor?.after) params.set('after', cursor.after)
            if (cursor?.before) params.set('before', cursor.before)

            const res = await fetch(`/api/admin/products?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch products')
            const data = await res.json()
            setProducts(data.products)
            setPageInfo(data.pageInfo)
            if (data.totalCount !== undefined) setTotalCount(data.totalCount)

            if (direction === 'next') setCurrentPage(p => p + 1)
            else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1))
        } catch (err: any) {
            console.error('Fetch error:', err)
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
            setPaginationLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProducts()
        // Fetch rating stats for all products independently
        fetch('/api/reviews/stats')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.stats) setProductStats(d.stats) })
            .catch(() => {})
    }, [])

    const handleCopy = useCallback(async (product: Product, type: CopyType) => {
        const reviewsBase = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com'
        const reviewLink = `${reviewsBase}/${product.handle}`
        let textToCopy = ''

        switch (type) {
            case 'LINK_ONLY':
                textToCopy = reviewLink
                break
            case 'EN_MSG':
                textToCopy = `\u200EStitched would love to hear from you \u2728\n\n\u200EWe hope your new *${product.title}* is making you feel extraordinary \uD83E\uDD0D\n\n\u200EWhenever you have a moment, we'd be honored if you shared your experience with us \u2661\n\n\u200E\uD83D\uDC49 ${reviewLink}`
                break
            case 'AR_MSG':
                textToCopy = `\u200F\u0639\u0627\u0626\u0644\u0629 Stitched \u062A\u062A\u0648\u0642 \u0644\u0633\u0645\u0627\u0639 \u0631\u0623\u064A\u0643 \u2728\n\n\u200F\u0646\u062A\u0645\u0646\u0649 \u0623\u0646 \u062A\u0643\u0648\u0646 *${product.title}* \u0642\u062F \u0623\u0636\u0627\u0641\u062A \u0644\u0645\u0633\u0629 \u0645\u0646 \u0627\u0644\u0623\u0646\u0627\u0642\u0629 \u0648\u0627\u0644\u062A\u0645\u064A\u0632 \u0644\u0623\u064A\u0627\u0645\u0643 \uD83E\uDD0D\n\n\u200F\u0645\u062A\u0649 \u0645\u0627 \u0633\u0646\u062D\u062A \u0644\u0643\u0650 \u0627\u0644\u0641\u0631\u0635\u0629\u060C \u064A\u0633\u0639\u062F\u0646\u0627 \u0623\u0646 \u062A\u0634\u0627\u0631\u0643\u064A\u0646\u0627 \u062A\u062C\u0631\u0628\u062A\u0643 \u2661\n\n\u200E\uD83D\uDC49 ${reviewLink}`
                break
        }

        try {
            await navigator.clipboard.writeText(textToCopy)
            const key = `${product.id}-${type}`
            setCopiedId(key)
            setTimeout(() => setCopiedId(null), 2000)
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }, [])

    const filteredProducts = products.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.handle.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // --- Render States ---

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-muted-foreground text-sm">Loading products from Shopify…</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="glass-card p-8 rounded-2xl max-w-md text-center">
                    <p className="text-red-500 font-semibold mb-2">Error</p>
                    <p className="text-muted-foreground text-sm">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="glass-card p-4 rounded-2xl">
                <div className="relative">
                    <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search products…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full ps-11 pe-4 py-3 border border-sand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white/60 backdrop-blur-sm text-sm text-start transition-all"
                    />
                </div>
            </div>

            {/* Product Count */}
            <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">
                    Showing{' '}
                    <span className="font-semibold text-primary">
                        {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount || products.length)}
                    </span>
                    {totalCount > 0 && (
                        <> of <span className="font-semibold text-primary">{totalCount}</span></>
                    )}
                    {' '}products
                </p>
            </div>

            {/* Products List */}
            <div className={`space-y-3 transition-opacity duration-200 ${paginationLoading ? 'opacity-50' : 'opacity-100'}`}>
                {filteredProducts.length === 0 ? (
                    <div className="glass-card rounded-2xl px-6 py-16 text-center">
                        <p className="text-muted-foreground text-sm">No products found.</p>
                    </div>
                ) : (
                    filteredProducts.map((product, index) => (
                        <div
                            key={product.id}
                            className="flex flex-row gap-4 p-4 bg-white rounded-xl border border-stone-200 shadow-sm"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            {/* Start Column: Product Image */}
                            <div className="w-24 h-32 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 flex-shrink-0">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-stone-300" />
                                    </div>
                                )}
                            </div>

                            {/* End Column: Details & Actions */}
                            <div className="flex flex-col flex-1 justify-between gap-3 min-w-0">
                                {/* Title */}
                                <p className="text-base font-medium text-stone-900 text-start truncate">{product.title}</p>

                                {/* Rating summary */}
                                {(() => {
                                    const s = productStats[product.handle]
                                    if (!s) return (
                                        <p className="text-xs text-stone-300">No reviews yet</p>
                                    )
                                    return (
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3.5 h-3.5 ${i <= Math.round(s.avg) ? 'text-amber-400 fill-amber-400' : 'text-stone-200 fill-stone-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-sm font-semibold text-stone-700">{s.avg}</span>
                                            <span className="text-xs text-stone-400">({s.count} {s.count === 1 ? 'review' : 'reviews'})</span>
                                        </div>
                                    )
                                })()}

                                {/* Primary Action – Send to Customer */}
                                <button
                                    onClick={() => {
                                        setSelectedProduct(product)
                                        setIsModalOpen(true)
                                    }}
                                    className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 active:scale-[0.98] transition-all focus:outline-none focus:ring-0"
                                >
                                    <Send className="w-4 h-4" />
                                    Send to Customer
                                </button>

                                {/* Secondary Actions – Segmented Copy Control */}
                                <div className="flex rounded-lg border border-stone-200 overflow-hidden bg-stone-50">
                                    <button
                                        onClick={() => handleCopy(product, 'LINK_ONLY')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 h-11 text-xs font-medium transition-all focus:outline-none focus:ring-0 border-e border-stone-200 ${
                                            copiedId === `${product.id}-LINK_ONLY`
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'text-stone-600 hover:bg-white active:bg-stone-100'
                                        }`}
                                    >
                                        {copiedId === `${product.id}-LINK_ONLY` ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                                        {copiedId === `${product.id}-LINK_ONLY` ? 'Copied!' : 'Link'}
                                    </button>
                                    <button
                                        onClick={() => handleCopy(product, 'EN_MSG')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 h-11 text-xs font-medium transition-all focus:outline-none focus:ring-0 border-e border-stone-200 ${
                                            copiedId === `${product.id}-EN_MSG`
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'text-stone-600 hover:bg-white active:bg-stone-100'
                                        }`}
                                    >
                                        {copiedId === `${product.id}-EN_MSG` ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                        {copiedId === `${product.id}-EN_MSG` ? 'Copied!' : 'EN'}
                                    </button>
                                    <button
                                        onClick={() => handleCopy(product, 'AR_MSG')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 h-11 text-xs font-medium transition-all focus:outline-none focus:ring-0 ${
                                            copiedId === `${product.id}-AR_MSG`
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'text-stone-600 hover:bg-white active:bg-stone-100'
                                        }`}
                                    >
                                        {copiedId === `${product.id}-AR_MSG` ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                        {copiedId === `${product.id}-AR_MSG` ? 'Copied!' : 'AR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CustomerSelectModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedProduct(null)
                }}
                product={selectedProduct}
            />

            {/* Pagination Controls */}
            {(pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => fetchProducts({ before: pageInfo.startCursor! }, 'prev')}
                        disabled={!pageInfo.hasPreviousPage || paginationLoading}
                        className={`
                            inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-medium
                            transition-all duration-200 border focus:outline-none focus:ring-0
                            ${pageInfo.hasPreviousPage && !paginationLoading
                                ? 'bg-white/60 border-sand-200 text-primary hover:bg-white hover:shadow-sm cursor-pointer'
                                : 'bg-white/30 border-sand-100 text-muted-foreground/40 cursor-not-allowed'
                            }
                        `}
                    >
                        <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" />
                        Previous
                    </button>

                    {paginationLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    )}

                    <button
                        onClick={() => fetchProducts({ after: pageInfo.endCursor! }, 'next')}
                        disabled={!pageInfo.hasNextPage || paginationLoading}
                        className={`
                            inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-medium
                            transition-all duration-200 border focus:outline-none focus:ring-0
                            ${pageInfo.hasNextPage && !paginationLoading
                                ? 'bg-white/60 border-sand-200 text-primary hover:bg-white hover:shadow-sm cursor-pointer'
                                : 'bg-white/30 border-sand-100 text-muted-foreground/40 cursor-not-allowed'
                            }
                        `}
                    >
                        Next
                        <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Send to Customer Modal ───────────────────────────────────────────
// Single-screen: search + inline [EN] [AR] per customer row.
// Light theme to match admin portal. Keyboard-safe on mobile.

function CustomerSelectModal({
    isOpen,
    onClose,
    product,
}: {
    isOpen: boolean
    onClose: () => void
    product: Product | null
}) {
    const [query, setQuery] = useState('')
    const [customers, setCustomers] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
    const [loading, setLoading] = useState(false)
    const [sendingFor, setSendingFor] = useState<string | null>(null) // customer id
    const [sentFor, setSentFor] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setQuery('')
            setCustomers([])
            setSendingFor(null)
            setSentFor(null)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const timer = setTimeout(async () => {
            setLoading(true)
            const res = await searchCustomers(query)
            if (res.success && res.data) setCustomers(res.data)
            setLoading(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [query, isOpen])

    if (!isOpen || !product) return null

    const handleSend = async (customer: { id: string; full_name: string; phone: string | null }, language: 'EN' | 'AR') => {
        if (!customer.phone || sendingFor) return

        setSendingFor(`${customer.id}-${language}`)
        const whatsappWindow = window.open('', '_blank')

        try {
            const reviewsBase = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com'
            let reviewLink = `${reviewsBase}/${product.handle}`

            try {
                const res = await fetch('/api/review-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productHandle: product.handle,
                        customerName: customer.full_name?.split(' ')[0],
                        customerWhatsapp: customer.phone,
                        lang: language === 'AR' ? 'ar' : undefined,
                    }),
                })
                const json = await res.json()
                if (json.code) reviewLink = `${reviewsBase}/r/${json.code}`
            } catch {}

            const message = language === 'EN'
                ? `\u200EStitched would love to hear from you \u2728\n\n\u200EWe hope your new *${product.title}* is making you feel extraordinary \uD83E\uDD0D\n\n\u200EWhenever you have a moment, we'd be honored if you shared your experience with us \u2661\n\n\u200E\uD83D\uDC49 ${reviewLink}`
                : `\u200F\u0639\u0627\u0626\u0644\u0629 Stitched \u062A\u062A\u0648\u0642 \u0644\u0633\u0645\u0627\u0639 \u0631\u0623\u064A\u0643 \u2728\n\n\u200F\u0646\u062A\u0645\u0646\u0649 \u0623\u0646 \u062A\u0643\u0648\u0646 *${product.title}* \u0642\u062F \u0623\u0636\u0627\u0641\u062A \u0644\u0645\u0633\u0629 \u0645\u0646 \u0627\u0644\u0623\u0646\u0627\u0642\u0629 \u0648\u0627\u0644\u062A\u0645\u064A\u0632 \u0644\u0623\u064A\u0627\u0645\u0643 \uD83E\uDD0D\n\n\u200F\u0645\u062A\u0649 \u0645\u0627 \u0633\u0646\u062D\u062A \u0644\u0643\u0650 \u0627\u0644\u0641\u0631\u0635\u0629\u060C \u064A\u0633\u0639\u062F\u0646\u0627 \u0623\u0646 \u062A\u0634\u0627\u0631\u0643\u064A\u0646\u0627 \u062A\u062C\u0631\u0628\u062A\u0643 \u2661\n\n\u200E\uD83D\uDC49 ${reviewLink}`

            const phone = customer.phone.replace(/[^0-9]/g, '')
            const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`

            if (whatsappWindow) {
                whatsappWindow.location.href = waUrl
                setTimeout(() => { try { whatsappWindow.close() } catch {} }, 1500)
            } else {
                window.open(waUrl, '_blank')
            }

            setSentFor(customer.id)
            setTimeout(() => setSentFor(null), 3000)
        } catch {
            whatsappWindow?.close()
        } finally {
            setSendingFor(null)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className="w-full sm:max-w-lg overflow-hidden flex flex-col sm:rounded-2xl rounded-t-2xl border bg-white shadow-2xl"
                style={{ maxHeight: '80dvh', borderColor: 'rgba(0,0,0,0.08)' }}
            >
                {/* ── Fixed Header + Search ────────────────────── */}
                <div className="flex-shrink-0 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    {/* Title row */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-stone-900">Send Review Link</h3>
                            <p className="text-xs text-stone-400 mt-0.5 truncate">{product.title}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors focus:outline-none"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search — fixed, never scrolls away */}
                    <div className="px-5 pb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                            <input
                                type="text"
                                placeholder="Search by name, phone, or order..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full text-sm pl-9 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Scrollable Results ────────────────────────── */}
                <div className="flex-1 overflow-y-auto overscroll-contain" style={{ minHeight: '200px' }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6">
                            <Search className="w-8 h-8 text-stone-100 mb-3" />
                            <p className="text-sm text-stone-300 text-center">
                                {query ? 'No customers found' : 'Start typing to search'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                            {customers.map(c => {
                                const hasPhone = !!c.phone
                                const isSending = sendingFor?.startsWith(c.id)
                                const wasSent = sentFor === c.id

                                return (
                                    <div
                                        key={c.id}
                                        className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                                            hasPhone ? 'hover:bg-stone-50' : 'opacity-40'
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-semibold text-stone-500 flex-shrink-0">
                                            {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>

                                        {/* Name + Phone */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-stone-800 truncate">{c.full_name}</p>
                                            <p className="text-xs text-stone-400 truncate mt-0.5">
                                                {c.phone || 'No phone number'}
                                            </p>
                                        </div>

                                        {/* Inline Send Buttons */}
                                        {wasSent ? (
                                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 flex-shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                                Sent
                                            </span>
                                        ) : hasPhone ? (
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    onClick={() => handleSend(c, 'EN')}
                                                    disabled={!!sendingFor}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.96] focus:outline-none disabled:opacity-40 bg-stone-900 text-white hover:bg-stone-800"
                                                >
                                                    {isSending && sendingFor === `${c.id}-EN` ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <MessageSquare className="w-3 h-3" />
                                                    )}
                                                    EN
                                                </button>
                                                <button
                                                    onClick={() => handleSend(c, 'AR')}
                                                    disabled={!!sendingFor}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.96] focus:outline-none disabled:opacity-40 border border-stone-200 text-stone-600 hover:bg-stone-50"
                                                >
                                                    {isSending && sendingFor === `${c.id}-AR` ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Globe className="w-3 h-3" />
                                                    )}
                                                    AR
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-stone-300 flex-shrink-0">No phone</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
