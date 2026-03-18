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
        const reviewsBase = process.env.NEXT_PUBLIC_REVIEWS_URL || (typeof window !== 'undefined' ? window.location.origin + '/review' : 'https://reviews.stitchedqa.com')
        const reviewLink = `${reviewsBase}/${product.handle}`
        let textToCopy = ''

        switch (type) {
            case 'LINK_ONLY':
                textToCopy = reviewLink
                break
            case 'EN_MSG':
                textToCopy = `✨ *Stitched* would love to hear from you.\n\nWe hope your new *${product.title}* has been making you feel extraordinary 🤍\n\nWhen you have a moment, share your story ♡\n\n👉 ${reviewLink}`
                break
            case 'AR_MSG':
                textToCopy = `✨ *Stitched* تتشوق لرأيك.\n\nنتمنى إن *${product.title}* أضاف لمسة خاصة لأيامك 🤍\n\nمتى تقدرين، شاركينا قصتك ♡\n\n👉 ${reviewLink}`
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

// --- Modals ---

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
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [sending, setSending] = useState<'EN' | 'AR' | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setQuery('')
            setCustomers([])
            setSelectedCustomer(null)
            setSending(null)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const timer = setTimeout(async () => {
            setLoading(true)
            const res = await searchCustomers(query)
            if (res.success && res.data) {
                setCustomers(res.data)
            }
            setLoading(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [query, isOpen])

    if (!isOpen || !product) return null

    const handleSend = async (language: 'EN' | 'AR') => {
        if (!selectedCustomer || !selectedCustomer.phone || sending) return

        setSending(language)

        // Open the window immediately (user gesture context) — browsers block
        // window.open() called after await as a popup
        const whatsappWindow = window.open('', '_blank')

        try {
            // Create a short link — keeps the URL clean in WhatsApp
            const res = await fetch('/api/review-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productHandle: product.handle,
                    customerName: selectedCustomer.full_name,
                    customerWhatsapp: selectedCustomer.phone,
                }),
            })
            const json = await res.json()
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            const reviewsBase = process.env.NEXT_PUBLIC_REVIEWS_URL || 'https://reviews.stitchedqa.com'
            // Fallback to full URL if short link creation failed
            const reviewLink = json.code
                ? `${origin}/r/${json.code}`
                : `${reviewsBase}/${product.handle}`

            const firstName = selectedCustomer.full_name?.split(' ')[0] || selectedCustomer.full_name

            let textToCopy = ''
            if (language === 'EN') {
                textToCopy = `Hi *${firstName}* ✨\n\nYour *${product.title}* has found its forever home — we hope you're completely in love with it 🤍\n\nWhen you have a moment, share how it feels to wear it ♡\n\n👉 ${reviewLink}\n\nWith love,\n*Stitched* 🪡`
            } else {
                textToCopy = `أهلاً *${firstName}* ✨\n\n*${product.title}* وصلت لبيتها الجديد — ونتمنى إنك حبيتيها من أول لبسة 🤍\n\nلما تقدرين، شاركينا شعورك وهي عليك ♡\n\n👉 ${reviewLink}\n\nبكل محبة،\n*Stitched* 🪡`
            }

            const phone = selectedCustomer.phone.replace('+', '')
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(textToCopy)}`

            if (whatsappWindow) {
                whatsappWindow.location.href = waUrl
            } else {
                // Fallback if pre-opened window was blocked
                window.open(waUrl, '_blank')
            }

            setCopiedId(language)
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            whatsappWindow?.close()
        } finally {
            setSending(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-stone-900">Send Review Link</h3>
                        <p className="text-xs text-stone-500 mt-0.5">{product.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 focus:outline-none">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto">
                    {!selectedCustomer ? (
                        <>
                            <div className="relative mb-4">
                                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="Search customer by name, phone, or order #..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full ps-9 pe-4 py-2 border border-stone-200 rounded-xl text-sm text-start focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                                    autoFocus
                                />
                            </div>

                            {loading ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-300" /></div>
                            ) : customers.length === 0 ? (
                                <p className="text-sm text-center py-8 text-stone-400">No customers found.</p>
                            ) : (
                                <div className="space-y-1">
                                    {customers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCustomer(c)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors text-left border border-transparent hover:border-stone-100"
                                        >
                                            <div>
                                                <p className="font-medium text-sm text-stone-900">{c.full_name}</p>
                                                <p className="text-xs text-stone-500">{c.phone}</p>
                                            </div>
                                            <Send className="w-4 h-4 text-stone-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                                <p className="text-sm text-stone-500 mb-1">Sending to:</p>
                                <p className="font-semibold text-stone-900 text-lg">{selectedCustomer.full_name}</p>
                                <p className="text-stone-500 text-sm">{selectedCustomer.phone || 'No phone number'}</p>
                                <button 
                                    onClick={() => setSelectedCustomer(null)}
                                    className="text-xs text-stone-400 underline mt-2 hover:text-stone-600 focus:outline-none"
                                >
                                    Change customer
                                </button>
                            </div>

                            <div className="space-y-3">
                                <button
                                    disabled={!selectedCustomer.phone || sending !== null}
                                    onClick={() => handleSend('EN')}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending === 'EN' ? <Loader2 className="w-4 h-4 animate-spin" /> : copiedId === 'EN' ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                    {sending === 'EN' ? 'Creating link…' : copiedId === 'EN' ? 'Opened in WhatsApp!' : 'Send in English (WhatsApp)'}
                                </button>
                                <button
                                    disabled={!selectedCustomer.phone || sending !== null}
                                    onClick={() => handleSend('AR')}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-stone-900 border border-stone-200 font-medium text-sm hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending === 'AR' ? <Loader2 className="w-4 h-4 animate-spin" /> : copiedId === 'AR' ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                    {sending === 'AR' ? 'Creating link…' : copiedId === 'AR' ? 'Opened in WhatsApp!' : 'Send in Arabic (WhatsApp)'}
                                </button>
                            </div>
                            
                            {!selectedCustomer.phone && (
                                <p className="text-xs text-red-500 text-center">This customer does not have a phone number on record.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
