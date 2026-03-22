'use client'

import { useState, useEffect, useRef, use } from 'react'
import Image from 'next/image'
import { Loader2, Heart, ExternalLink } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Product {
    id: string
    title: string
    handle: string
    image: string | null
    images: string[]
}

type RatingValue = 1 | 2 | 3 | 4 | 5 | null
type Lang = 'en' | 'ar'

// ── Phone Normalization ────────────────────────────────────────────────────

function normalizePhoneNumber(raw: string): string {
    const phone = raw.replace(/[\s\-().]/g, '')
    if (!phone) return phone
    if (phone.startsWith('+')) return phone
    if (phone.startsWith('00')) return '+' + phone.slice(2)
    const gulfCodes = ['974', '971', '966', '965', '973', '968', '967']
    for (const code of gulfCodes) {
        if (phone.startsWith(code) && phone.length >= code.length + 7) {
            return '+' + phone
        }
    }
    return '+974' + phone
}

// ── Creative Copy — Transcreation ──────────────────────────────────────────

const copy = {
    en: {
        eyebrow: 'Your Stitched Story',
        question: 'Did this piece capture your heart?',
        tapToRate: 'Let the stars decide',
        ratingRequired: 'A rating is needed to share your story',
        ratings: {
            1: 'Not This Time',
            2: 'Wanted To Love It',
            3: "It's Lovely",
            4: 'I Adore It',
            5: 'Stole My Heart ♡',
        } as Record<number, string>,
        experienceLabel: 'Your impressions',
        optional: 'optional',
        experiencePlaceholder: 'Tell us what you loved, or what we can perfect…',
        aboutLabel: 'A little about you',
        namePlaceholder: 'Your First Name',
        whatsappPlaceholder: 'WhatsApp Number',
        submit: 'Share Your Thoughts',
        submitting: 'Sharing…',
        submitError: 'Something went wrong. Please try again.',
        tagline: 'Designed with passion. Worn with grace.',
        thankYouTitle: 'Thank You',
        thankYouSubtitle: 'Your story is treasured.',
        thankYouBody: 'Every word inspires our next stitch. We are honored that our passion has become part of your wardrobe.',
        visitStitched: 'Visit Stitched',
        productNotFound: 'Product Not Found',
        productNotFoundDesc: "We couldn't find this product. Please check the link you received.",
        loading: 'Loading…',
    },
    ar: {
        eyebrow: 'إطلالتكِ مع ستتشد',
        question: 'هل لامست هذه القطعة ذوقكِ الرفيع؟',
        tapToRate: 'اختاري تقييمكِ',
        ratingRequired: 'التقييم مطلوب لمشاركة حكايتكِ',
        ratings: {
            1: 'ليست هذه المرّة',
            2: 'تمنّيت أن أعشقها',
            3: 'قطعة رائعة',
            4: 'أعشقها',
            5: 'سرقت قلبي ♡',
        } as Record<number, string>,
        experienceLabel: 'تفاصيل إطلالتكِ',
        optional: 'اختياري',
        experiencePlaceholder: 'أخبرينا ما الذي أحببتِه، أو ما يمكننا إتقانه…',
        aboutLabel: 'نودّ معرفتكِ',
        namePlaceholder: 'الاسم الأول',
        whatsappPlaceholder: 'رقم الواتساب',
        submit: 'اعتمدي التقييم',
        submitting: 'جارٍ المشاركة…',
        submitError: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
        tagline: 'صُنعت بشغف. تُرتدى بأناقة.',
        thankYouTitle: 'شكراً لكِ',
        thankYouSubtitle: 'حكايتكِ محلّ تقديرنا.',
        thankYouBody: 'كل كلمة تُلهم غرزتنا القادمة. يشرّفنا أن شغفنا أصبح جزءاً من خزانتكِ.',
        visitStitched: 'زوري Stitched',
        productNotFound: 'المنتج غير موجود',
        productNotFoundDesc: 'لم نتمكّن من العثور على هذا المنتج. يرجى التحقق من الرابط.',
        loading: 'جارٍ التحميل…',
    },
}

const MAX_REVIEW_CHARS = 500

// ── Falling Icons Data (Thank You page only) ───────────────────────────────

const FALLING_ICONS = [
    { icon: '✂️', left: '5%', delay: '0s', duration: '6s', size: 'text-lg' },
    { icon: '🧵', left: '15%', delay: '1.2s', duration: '7s', size: 'text-base' },
    { icon: '🪡', left: '25%', delay: '0.5s', duration: '5.5s', size: 'text-sm' },
    { icon: '🧷', left: '35%', delay: '2.8s', duration: '6.5s', size: 'text-lg' },
    { icon: '✂️', left: '45%', delay: '1.8s', duration: '7.5s', size: 'text-sm' },
    { icon: '🪡', left: '55%', delay: '0.8s', duration: '5s', size: 'text-base' },
    { icon: '🧵', left: '65%', delay: '3.2s', duration: '6s', size: 'text-lg' },
    { icon: '🧷', left: '75%', delay: '2s', duration: '7s', size: 'text-sm' },
    { icon: '✂️', left: '85%', delay: '1s', duration: '5.5s', size: 'text-base' },
    { icon: '🪡', left: '95%', delay: '3.5s', duration: '6.5s', size: 'text-sm' },
    { icon: '🧵', left: '10%', delay: '4s', duration: '8s', size: 'text-xs' },
    { icon: '✂️', left: '30%', delay: '4.5s', duration: '7s', size: 'text-xs' },
    { icon: '🧷', left: '50%', delay: '5s', duration: '6s', size: 'text-xs' },
    { icon: '🪡', left: '70%', delay: '3.8s', duration: '7.5s', size: 'text-xs' },
    { icon: '🧵', left: '90%', delay: '2.5s', duration: '5s', size: 'text-xs' },
]

// ── Shared input styles ────────────────────────────────────────────────────

const glassInputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.07)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function CustomerReviewPage({
    params,
}: {
    params: Promise<{ handle: string }>
}) {
    const { handle } = use(params)

    // ── Language ─────────────────────────────────────────────────────────
    const [lang, setLang] = useState<Lang>('en')
    const t = copy[lang]
    const isRtl = lang === 'ar'

    const [product, setProduct] = useState<Product | null>(null)
    const [productLoading, setProductLoading] = useState(true)
    const [productError, setProductError] = useState(false)

    // Form state
    const [rating, setRating] = useState<RatingValue>(null)
    const [reviewText, setReviewText] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [isPrefilled, setIsPrefilled] = useState(false)

    // Validation
    const [ratingError, setRatingError] = useState(false)

    // Submission state
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [submitError, setSubmitError] = useState(false)

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // ── Load language preference ─────────────────────────────────────────

    useEffect(() => {
        const saved = localStorage.getItem('review-lang') as Lang | null
        if (saved === 'ar' || saved === 'en') setLang(saved)
    }, [])

    const toggleLang = () => {
        const next = lang === 'en' ? 'ar' : 'en'
        setLang(next)
        localStorage.setItem('review-lang', next)
    }

    // ── Fetch product and URL params ─────────────────────────────────────

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const nParam = params.get('n')
            const pParam = params.get('p')

            if (nParam && pParam) {
                try {
                    const decodedName = decodeURIComponent(atob(nParam)).split(' ')[0]
                    const decodedPhone = decodeURIComponent(atob(pParam))
                    setCustomerName(decodedName)
                    setWhatsapp(decodedPhone)
                    setIsPrefilled(true)
                } catch (e) {
                    console.error("Failed to parse personalized review link params", e)
                }
            }
        }
    }, [])

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`/api/reviews/product/${handle}`)
                if (!res.ok) throw new Error('Not found')
                const data = await res.json()
                setProduct(data.product)
            } catch {
                setProductError(true)
            } finally {
                setProductLoading(false)
            }
        }
        fetchProduct()
    }, [handle])

    // ── Rating selection ─────────────────────────────────────────────────

    const handleRatingSelect = (value: RatingValue) => {
        setRating(value)
        if (ratingError) setRatingError(false)
    }

    // ── Submit ────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!product) return

        if (!rating) {
            setRatingError(true)
            return
        }

        setSubmitting(true)
        setSubmitError(false)

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productHandle: product.handle,
                    productTitle: product.title,
                    customerName: customerName.trim() || null,
                    customerWhatsapp: whatsapp.trim() ? normalizePhoneNumber(whatsapp.trim()) : null,
                    rating,
                    reviewText: reviewText.trim() || null,
                }),
            })

            if (!res.ok) throw new Error('Submission failed')

            setSubmitting(false)
            setSubmitted(true)
        } catch {
            setSubmitting(false)
            setSubmitError(true)
        }
    }

    // ── Render: Loading ──────────────────────────────────────────────────

    if (productLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0A0A0A' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    <p className="text-[#A0A0A0] text-sm tracking-wide">{t.loading}</p>
                </div>
            </div>
        )
    }

    // ── Render: Error ────────────────────────────────────────────────────

    if (productError || !product) {
        return (
            <div
                className="fixed inset-0 flex items-center justify-center px-6"
                style={{ background: '#0A0A0A' }}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <div className="text-center max-w-sm">
                    <p className="font-serif text-2xl text-white mb-3">{t.productNotFound}</p>
                    <p className="text-[#A0A0A0] text-sm leading-relaxed">{t.productNotFoundDesc}</p>
                </div>
            </div>
        )
    }

    // ── Render: Thank You ────────────────────────────────────────────────

    if (submitted) {
        return (
            <>
                <style>{`
                    html, body { background: #000000 !important; margin: 0; padding: 0; }
                    @keyframes reviewFadeInUp {
                        from { opacity: 0; transform: translateY(24px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes iconFall {
                        0% { transform: translateY(-60px) rotate(0deg); opacity: 0; }
                        10% { opacity: 0.3; }
                        90% { opacity: 0.3; }
                        100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                    }
                    @keyframes heartPulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                `}</style>

                <div
                    className="fixed inset-0"
                    style={{ background: 'radial-gradient(circle at 50% -20%, #2c2725 0%, #0a0808 60%, #000000 100%)' }}
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {/* Falling Stitching Icons */}
                    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
                        {FALLING_ICONS.map((item, i) => (
                            <span
                                key={i}
                                className={`absolute ${item.size} opacity-0`}
                                style={{
                                    left: item.left,
                                    top: '-60px',
                                    animation: `iconFall ${item.duration} ${item.delay} linear infinite`,
                                }}
                            >
                                {item.icon}
                            </span>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
                        <div
                            className="text-center max-w-sm w-full"
                            style={{ animation: 'reviewFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                        >
                            {/* Frosted heart */}
                            <div className="relative w-16 h-16 mx-auto mb-5">
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Heart
                                        className="w-7 h-7 fill-white text-white"
                                        strokeWidth={0}
                                        style={{
                                            animation: 'heartPulse 2.8s ease-in-out infinite',
                                            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))',
                                        }}
                                    />
                                </div>
                            </div>

                            <h1
                                className="font-serif text-4xl text-white mb-2 tracking-tight"
                                style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}
                            >
                                {t.thankYouTitle}
                            </h1>
                            <p className="font-serif text-base text-white/70 mb-2 italic">
                                {t.thankYouSubtitle}
                            </p>
                            <p className="text-white/40 text-xs leading-relaxed mb-8 px-2">
                                {t.thankYouBody}
                            </p>

                            <a
                                href="https://stitchedqa.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="
                                    inline-flex items-center gap-2 px-8 py-3.5 rounded-xl
                                    bg-white text-stone-900 text-sm font-bold tracking-wide
                                    shadow-xl shadow-black/30
                                    active:scale-[0.98] transition-all duration-300
                                    focus:outline-none focus:ring-0
                                "
                            >
                                {t.visitStitched}
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-1"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        <Image
                            src="/images/stitched_logo.png"
                            alt="Stitched"
                            width={200}
                            height={66}
                            className="h-4 w-auto object-contain brightness-0 invert opacity-55 mx-auto mb-0.5"
                        />
                        <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">
                            {t.tagline}
                        </p>
                    </div>
                </div>
            </>
        )
    }

    // ── Render: Form ─────────────────────────────────────────────────────

    return (
        <>
            <style>{`
                html, body { background: #000000 !important; margin: 0; padding: 0; }
                input::placeholder, textarea::placeholder {
                    color: rgba(255,255,255,0.40) !important;
                    opacity: 1;
                }
                @keyframes reviewSlideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes ratingShake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
            `}</style>

            <div
                className="fixed inset-0"
                style={{ background: 'radial-gradient(circle at 50% -20%, #2c2725 0%, #0a0808 60%, #000000 100%)' }}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <form
                    onSubmit={handleSubmit}
                    className="absolute inset-0 z-10 flex flex-col p-5 overflow-y-auto gap-4"
                    style={{
                        paddingTop: 'max(24px, env(safe-area-inset-top))',
                        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                        justifyContent: 'safe center',
                    }}
                >
                    {/* ── Header: Logo + Language Toggle ──────────────── */}
                    <div
                        className="flex items-center justify-between"
                        style={{ animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                    >
                        <div className="w-14" />
                        <Image
                            src="/images/stitched_logo.png"
                            alt="Stitched"
                            width={200}
                            height={46}
                            className="h-12 w-auto object-contain brightness-0 invert opacity-90"
                        />
                        <button
                            type="button"
                            onClick={toggleLang}
                            className="w-14 py-1.5 px-3 rounded-full text-xs font-medium tracking-wide transition-all duration-200"
                            style={{
                                color: 'rgba(255,255,255,0.6)',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.10)',
                            }}
                        >
                            {lang === 'en' ? 'عربي' : 'EN'}
                        </button>
                    </div>

                    {/* ── Product Card ────────────────────────────────── */}
                    <div
                        className="flex items-center gap-4 p-4 rounded-2xl"
                        style={{
                            animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
                            background: '#1F1E1C',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        }}
                    >
                        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-white/10" style={{ background: '#F0F0F0' }}>
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-white/30 text-xs"
                                    style={{ background: '#2A2A2A' }}
                                >
                                    S
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase tracking-[0.3em] font-bold mb-1.5" style={{ color: '#C9A96E' }}>
                                {t.eyebrow}
                            </p>
                            <div className="h-px w-8 mb-2" style={{ background: 'rgba(201,169,110,0.25)' }} />
                            <h1
                                className="font-serif text-xl !text-white font-semibold tracking-tight leading-snug line-clamp-2"
                                style={{ textShadow: '0 1px 8px #C9A96E' }}
                            >
                                {product.title}
                            </h1>
                        </div>
                    </div>

                    {/* ── Heart Rating ────────────────────────────────── */}
                    <div
                        className="flex flex-col items-center gap-2"
                        style={{ animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}
                    >
                        <p className="font-serif text-base text-white tracking-wide">
                            {t.question}
                        </p>
                        <p
                            className="text-sm font-serif tracking-wide h-5"
                            style={{ color: rating ? '#FFFFFF' : 'rgba(255,255,255,0.40)' }}
                        >
                            {rating ? t.ratings[rating] : t.tapToRate}
                        </p>
                        <div
                            dir="ltr"
                            className="flex justify-center gap-3 w-full px-2 py-1"
                            style={ratingError ? { animation: 'ratingShake 0.5s ease-in-out' } : undefined}
                        >
                            {[1, 2, 3, 4, 5].map((value) => {
                                const isFilled = rating !== null && value <= rating
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleRatingSelect(value as RatingValue)}
                                        className="p-1.5 transition-all duration-200 active:scale-90 focus:outline-none focus:ring-0"
                                    >
                                        <Heart
                                            className={`w-10 h-10 transition-all duration-200 ${isFilled
                                                ? 'fill-white text-white'
                                                : ratingError
                                                    ? 'text-red-400/60'
                                                    : 'text-[#555555] hover:text-[#888888]'
                                                }`}
                                            strokeWidth={1.5}
                                            style={isFilled ? { filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))' } : undefined}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                        {ratingError && (
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(248,113,113,0.9)' }}>
                                {t.ratingRequired}
                            </p>
                        )}
                    </div>

                    {/* ── Text Area ───────────────────────────────────── */}
                    <div
                        style={{ animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both' }}
                    >
                        <label className="block text-[11px] uppercase tracking-[0.15em] text-white/80 font-semibold mb-2">
                            {t.experienceLabel}{' '}
                            <span className="normal-case tracking-normal text-white/30">({t.optional})</span>
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={reviewText}
                            onChange={(e) => {
                                if (e.target.value.length <= MAX_REVIEW_CHARS) {
                                    setReviewText(e.target.value)
                                }
                            }}
                            maxLength={MAX_REVIEW_CHARS}
                            placeholder={t.experiencePlaceholder}
                            className="
                                w-full h-24 px-4 py-3 rounded-xl
                                text-sm leading-relaxed
                                focus:outline-none focus:border-white/25
                                resize-none transition-colors duration-300
                            "
                            style={glassInputStyle}
                        />
                        {reviewText.length > 0 && (
                            <p className="text-[10px] text-white/25 text-end mt-1">
                                {reviewText.length}/{MAX_REVIEW_CHARS}
                            </p>
                        )}
                    </div>

                    {/* ── Contact Inputs ──────────────────────────────── */}
                    {!isPrefilled && (
                        <div
                            className="space-y-3"
                            style={{ animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}
                        >
                            <label className="block text-[11px] uppercase tracking-[0.15em] text-white/80 font-semibold">
                                {t.aboutLabel}{' '}
                                <span className="normal-case tracking-normal text-white/30">({t.optional})</span>
                            </label>
                            <input
                                id="customerName"
                                name="customerName"
                                type="text"
                                autoComplete="given-name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder={t.namePlaceholder}
                                className="
                                    w-full text-sm py-3 px-4 rounded-xl
                                    focus:outline-none focus:border-white/25
                                    transition-colors duration-300
                                "
                                style={glassInputStyle}
                            />
                            <input
                                id="whatsapp"
                                name="whatsapp"
                                type="tel"
                                autoComplete="tel"
                                dir="ltr"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                onBlur={() => { if (whatsapp.trim()) setWhatsapp(normalizePhoneNumber(whatsapp.trim())) }}
                                placeholder={t.whatsappPlaceholder}
                                className="
                                    w-full text-sm py-3 px-4 rounded-xl
                                    focus:outline-none focus:border-white/25
                                    transition-colors duration-300
                                "
                                style={glassInputStyle}
                            />
                        </div>
                    )}

                    {/* ── Submit Error ─────────────────────────────────── */}
                    {submitError && (
                        <p className="text-center text-xs" style={{ color: 'rgba(248,113,113,0.9)' }}>
                            {t.submitError}
                        </p>
                    )}

                    {/* ── CTA Button ──────────────────────────────────── */}
                    <div
                        style={{ animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both' }}
                    >
                        <button
                            type="submit"
                            disabled={submitting}
                            className="
                                w-full py-4 rounded-xl text-sm font-bold tracking-wide
                                transition-all duration-300 ease-out
                                flex items-center justify-center gap-2
                                focus:outline-none focus:ring-0
                                bg-white text-[#0A0A0A]
                                shadow-lg shadow-white/10
                                active:scale-[0.98] hover:shadow-white/20
                            "
                            style={submitting ? { opacity: 0.7 } : undefined}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{t.submitting}</span>
                                </>
                            ) : (
                                <span>{t.submit}</span>
                            )}
                        </button>
                    </div>

                    {/* ── Footer ──────────────────────────────────────── */}
                    <div className="flex flex-col items-center gap-1">
                        <Image
                            src="/images/stitched_logo.png"
                            alt="Stitched"
                            width={200}
                            height={66}
                            className="h-5 w-auto object-contain brightness-0 invert opacity-50"
                        />
                        <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {t.tagline}
                        </p>
                    </div>
                </form>
            </div>
        </>
    )
}
