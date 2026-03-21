'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import {
    Star,
    MessageCircle,
    CheckCircle2,
    Archive,
    RotateCcw,
    Loader2,
    Search,
    Eye,
    EyeOff,
    TrendingUp,
    Clock,
    Trash2,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Review {
    id: string
    product_handle: string
    product_title: string
    customer_name: string | null
    customer_whatsapp: string | null
    rating: 1 | 2 | 3 | 4 | 5
    review_text: string | null
    status: 'NEEDS_ATTENTION' | 'PUBLISHED' | 'ARCHIVED'
    created_at: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
    1: 'Not This Time',
    2: 'Wanted To Love It',
    3: "It's Lovely",
    4: 'I Adore It',
    5: 'Stole My Heart ♡',
}

const RATING_COLORS: Record<number, string> = {
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-amber-500',
    4: 'text-emerald-500',
    5: 'text-emerald-600',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
    const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    className={`${sizeClass} ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`}
                />
            ))}
        </div>
    )
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    })
}

/** Product thumbnail — shows real image if available, falls back to initials */
function ProductThumbnail({ title, imageUrl }: { title: string; imageUrl?: string }) {
    const words = title.trim().split(/\s+/)
    const initials = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : title.slice(0, 2).toUpperCase()

    return (
        <div className="w-14 rounded-lg flex-shrink-0 bg-stone-100 border border-stone-200 overflow-hidden"
            style={{ minHeight: '72px' }}
        >
            {imageUrl ? (
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" style={{ minHeight: '72px' }} />
            ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '72px' }}>
                    <span className="text-sm font-bold text-stone-400 tracking-wide">{initials}</span>
                </div>
            )}
        </div>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ReviewModerationDashboard() {
    const [reviews, setReviews] = useState<Review[]>([])
    const [productImages, setProductImages] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'NEEDS_ATTENTION' | 'PUBLISHED'>('NEEDS_ATTENTION')
    const [searchQuery, setSearchQuery] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [clearing, setClearing] = useState(false)

    // ── Fetch ──────────────────────────────────────────────────────────────

    const fetchReviews = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/reviews')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            const reviewList: Review[] = data.reviews ?? []
            setReviews(reviewList)

            // Fetch product images for each unique handle in parallel
            const uniqueHandles = [...new Set(reviewList.map(r => r.product_handle))]
            const imageEntries = await Promise.all(
                uniqueHandles.map(async handle => {
                    try {
                        const r = await fetch(`/api/reviews/product/${handle}`)
                        if (!r.ok) return [handle, null]
                        const d = await r.json()
                        return [handle, d.product?.image ?? null]
                    } catch {
                        return [handle, null]
                    }
                })
            )
            setProductImages(Object.fromEntries(imageEntries.filter(([, v]) => v !== null)))
        } catch {
            setError('Failed to load reviews. Check your connection and try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchReviews() }, [fetchReviews])

    // ── Supabase Realtime — push new reviews as they are inserted ─────────

    useEffect(() => {
        const supabase = createClient()

        const channel = supabase
            .channel('reviews-live')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'reviews' },
                (payload) => {
                    const newReview = payload.new as Review
                    setReviews(prev => [newReview, ...prev])

                    // Fetch product image only if not already cached
                    setProductImages(prev => {
                        if (prev[newReview.product_handle]) return prev
                        fetch(`/api/reviews/product/${newReview.product_handle}`)
                            .then(r => r.ok ? r.json() : null)
                            .then(d => {
                                if (d?.product?.image) {
                                    setProductImages(imgs => ({
                                        ...imgs,
                                        [newReview.product_handle]: d.product.image,
                                    }))
                                }
                            })
                            .catch(() => {})
                        return prev
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    // ── Actions ────────────────────────────────────────────────────────────

    const updateStatus = useCallback(async (
        id: string,
        status: 'PUBLISHED' | 'NEEDS_ATTENTION' | 'ARCHIVED'
    ) => {
        setActionLoading(id)
        try {
            const res = await fetch(`/api/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            if (!res.ok) throw new Error('Update failed')

            if (status === 'ARCHIVED') {
                setReviews(prev => prev.filter(r => r.id !== id))
            } else {
                setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r))
            }
        } catch {
            // Silently fail — data remains unchanged
        } finally {
            setActionLoading(null)
        }
    }, [])

    const handleClearAll = useCallback(async () => {
        setClearing(true)
        try {
            const res = await fetch('/api/reviews', { method: 'DELETE' })
            if (!res.ok) throw new Error('Clear failed')
            setReviews([])
            setShowClearConfirm(false)
        } catch {
            // Silently fail
        } finally {
            setClearing(false)
        }
    }, [])

    // WhatsApp — different tone for rating ≤ 2 (recovery) vs = 3 (feedback)
    const handleWhatsApp = useCallback((review: Review) => {
        if (!review.customer_whatsapp) return
        const phone = review.customer_whatsapp.replace('+', '')
        const name = review.customer_name || 'valued customer'
        const firstName = name.split(' ')[0]

        const message = review.rating <= 2
            ? `مرحباً *${firstName}* 🙏\n\nنأسف جداً إن تجربتك مع *${review.product_title}* ما كانت بمستوى توقعاتك.\n\nنبي نصحح الأمر — ممكن تشاركينا أكثر عن اللي صار؟\n\nبكل اهتمام،\n*Stitched* 🪡`
            : `أهلاً *${firstName}* ✨\n\nشكراً لرأيك في *${review.product_title}* 🤍\n\nلاحظنا إن تجربتك كانت مختلطة — نبي نفهم أكثر ونحسّن لك الخدمة.\n\nبكل محبة،\n*Stitched* 🪡`

        const w = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
        if (w) setTimeout(() => { try { w.close() } catch {} }, 1500)
    }, [])

    // ── Computed ───────────────────────────────────────────────────────────

    const attentionCount = reviews.filter(r => r.status === 'NEEDS_ATTENTION').length
    const publishedCount = reviews.filter(r => r.status === 'PUBLISHED').length

    const publishedReviews = reviews.filter(r => r.status === 'PUBLISHED')
    const avgRating = publishedReviews.length > 0
        ? (publishedReviews.reduce((s, r) => s + r.rating, 0) / publishedReviews.length).toFixed(1)
        : '—'

    // Per-product stats (from published reviews only) — O(N) single pass
    const productStats = (() => {
        const sums: Record<string, { sum: number; count: number }> = {}
        for (const r of publishedReviews) {
            if (!sums[r.product_handle]) sums[r.product_handle] = { sum: 0, count: 0 }
            sums[r.product_handle].sum += r.rating
            sums[r.product_handle].count++
        }
        const result: Record<string, { avg: number; count: number }> = {}
        for (const [handle, { sum, count }] of Object.entries(sums)) {
            result[handle] = { avg: parseFloat((sum / count).toFixed(1)), count }
        }
        return result
    })()

    const filteredReviews = reviews.filter(r => {
        if (r.status !== activeTab) return false
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            r.product_title.toLowerCase().includes(q) ||
            (r.customer_name?.toLowerCase().includes(q) ?? false)
        )
    })

    // ── Loading / Error states ─────────────────────────────────────────────

    if (loading && reviews.length === 0) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-7 h-7 animate-spin text-stone-400" />
                    <p className="text-sm text-stone-400">Loading reviews…</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-stone-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchReviews()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            </div>
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                label="MODERATION"
                title="Review Moderation"
                subtitle="Manage customer reviews before they appear on your storefront."
                actions={
                    <>
                        <button
                            onClick={() => fetchReviews()}
                            className="p-2 rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {reviews.length > 0 && (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear test data
                            </button>
                        )}
                    </>
                }
            />

            {/* Clear confirmation */}
            {showClearConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700 font-medium">
                            This will permanently delete all {reviews.length} reviews. Cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={() => setShowClearConfirm(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 border border-stone-200 bg-white hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={clearing}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 flex items-center gap-1.5"
                        >
                            {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Delete all
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Needs Attention</span>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">{attentionCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Published</span>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">{publishedCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Avg Rating</span>
                    </div>
                    <p className="text-2xl font-bold text-stone-900">{avgRating}</p>
                </div>
            </div>

            {/* Tabs + Search — stacked on mobile, inline on desktop */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('NEEDS_ATTENTION')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'NEEDS_ATTENTION'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            Needs Attention
                            {attentionCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                    {attentionCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('PUBLISHED')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'PUBLISHED'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            Published
                            {publishedCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                    {publishedCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search — hidden on mobile, shown on sm+ */}
                    <div className="relative hidden sm:block">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search reviews…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-stone-200 text-sm bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400/20 w-64 transition-all"
                        />
                    </div>
                </div>

                {/* Search — full width below tabs on mobile only */}
                <div className="relative sm:hidden">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'NEEDS_ATTENTION' ? 'needs attention' : 'published'} reviews…`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-sm bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400/20 w-full transition-all"
                    />
                </div>
            </div>

            {/* Review Cards */}
            <div className="space-y-3">
                {filteredReviews.length === 0 ? (
                    <div className="py-16 text-center">
                        <EyeOff className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                        <p className="text-sm text-stone-400">
                            {activeTab === 'NEEDS_ATTENTION'
                                ? 'No reviews awaiting moderation.'
                                : 'No published reviews yet.'}
                        </p>
                    </div>
                ) : (
                    filteredReviews.map((review) => {
                        const stats = productStats[review.product_handle]
                        const isLoading = actionLoading === review.id
                        const needsContact = review.rating <= 3

                        return (
                            <div
                                key={review.id}
                                className={`bg-white rounded-xl border transition-all duration-300 ${isLoading ? 'opacity-50 scale-[0.99]' : ''} ${needsContact && review.status === 'NEEDS_ATTENTION'
                                    ? review.rating <= 2
                                        ? 'border-red-200 shadow-sm shadow-red-50'
                                        : 'border-amber-200 shadow-sm shadow-amber-50'
                                    : 'border-stone-200 hover:shadow-md'
                                    }`}
                            >
                                <div className="p-5">
                                    {/* Top Row */}
                                    <div className="flex gap-4 mb-4">
                                        <ProductThumbnail title={review.product_title} imageUrl={productImages[review.product_handle]} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-stone-900 truncate">
                                                        {review.product_title}
                                                    </h3>
                                                    <p className="text-xs text-stone-400 mt-0.5">
                                                        {review.customer_name?.split(' ')[0] ?? 'Anonymous'} · {formatDate(review.created_at)}
                                                    </p>
                                                </div>

                                                {/* Storefront impact badge */}
                                                {stats && (
                                                    <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-100">
                                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                        <span className="text-[11px] font-semibold text-amber-700">{stats.avg}</span>
                                                        <span className="text-[10px] text-amber-500 hidden sm:inline">· {stats.count} live</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-2">
                                                <StarRating rating={review.rating} />
                                                <span className={`text-xs font-medium ${RATING_COLORS[review.rating]}`}>
                                                    {RATING_LABELS[review.rating]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Review Text */}
                                    {review.review_text && (
                                        <p className="text-sm text-stone-600 leading-relaxed mb-4">
                                            &ldquo;{review.review_text}&rdquo;
                                        </p>
                                    )}

                                    {/* No review text */}
                                    {!review.review_text && (
                                        <p className="text-xs text-stone-300 italic mb-4">No written review provided.</p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                                        {review.status === 'NEEDS_ATTENTION' ? (
                                            <>
                                                {/* WhatsApp contact for rating ≤ 3 */}
                                                {needsContact && review.customer_whatsapp && (
                                                    <button
                                                        onClick={() => handleWhatsApp(review)}
                                                        disabled={isLoading}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        {review.rating <= 2 ? 'Make it right' : 'Ask for feedback'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => updateStatus(review.id, 'PUBLISHED')}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                                                >
                                                    {isLoading
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <CheckCircle2 className="w-3.5 h-3.5" />
                                                    }
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(review.id, 'ARCHIVED')}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-stone-400 border border-stone-200 hover:bg-stone-50 hover:text-stone-600 transition-colors ml-auto"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                    Archive
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => updateStatus(review.id, 'NEEDS_ATTENTION')}
                                                disabled={isLoading}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                                            >
                                                {isLoading
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <RotateCcw className="w-3.5 h-3.5" />
                                                }
                                                Revoke from Storefront
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
