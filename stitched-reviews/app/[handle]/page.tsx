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
        visitStitched: 'زوري ستتشد',
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

// ── Font stacks ──────────────────────────────────────────────────────────────

const FONT_SANS_EN = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
const FONT_SANS_AR = "'Tajawal', 'Noto Naskh Arabic', -apple-system, sans-serif"
const FONT_SERIF_EN = "'Cormorant Garamond', Georgia, serif"
const FONT_SERIF_AR = "'Noto Naskh Arabic', 'Tajawal', serif"

// ── Shared input styles ────────────────────────────────────────────────────

const glassInputBase: React.CSSProperties = {
    background: 'rgba(12, 12, 12, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#FDFCF0',
    borderRadius: '16px',
    fontSize: '15px',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
}

const glassSectionStyle: React.CSSProperties = {
    background: 'rgba(18, 18, 18, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
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
    const fontSans = isRtl ? FONT_SANS_AR : FONT_SANS_EN
    const fontSerif = isRtl ? FONT_SERIF_AR : FONT_SERIF_EN
    const glassInputStyle: React.CSSProperties = { ...glassInputBase, fontFamily: fontSans }

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

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
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
            <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#050505' }}>
                <div className="flex flex-col items-center" style={{ gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', border: '2px solid #1A1A1A', borderTopColor: '#C5A059', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: '#6A6A6A', fontSize: '14px', letterSpacing: '0.05em' }}>{t.loading}</p>
                </div>
            </div>
        )
    }

    // ── Render: Error ────────────────────────────────────────────────────

    if (productError || !product) {
        return (
            <div
                className="fixed inset-0 flex items-center justify-center px-6"
                style={{ background: '#050505' }}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                <div className="text-center max-w-sm">
                    <p style={{ fontSize: '24px', color: '#FDFCF0', marginBottom: '12px', fontFamily: fontSerif }}>{t.productNotFound}</p>
                    <p style={{ color: '#6A6A6A', fontSize: '14px', lineHeight: '1.6' }}>{t.productNotFoundDesc}</p>
                </div>
            </div>
        )
    }

    // ── Render: Thank You ────────────────────────────────────────────────

    if (submitted) {
        return (
            <>
                <style>{`
                    html, body { background: #050505 !important; margin: 0; padding: 0; }
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
                    style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 8%, rgba(26,24,22,0.9) 0%, rgba(20,17,14,0.5) 50%, #000000 100%)' }}
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
                                className="text-4xl text-white mb-2 tracking-tight"
                                style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)', fontFamily: fontSerif }}
                            >
                                {t.thankYouTitle}
                            </h1>
                            <p className="text-base text-white/70 mb-2 italic" style={{ fontFamily: fontSerif }}>
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
                    color: #4A4A4A !important;
                    opacity: 1;
                    font-family: ${fontSans};
                }
                input:focus, textarea:focus {
                    border-color: rgba(197, 160, 89, 0.45) !important;
                    box-shadow: 0 0 0 1px rgba(197, 160, 89, 0.12), inset 0 1px 4px rgba(0,0,0,0.3) !important;
                }
                @keyframes reviewSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes ratingShake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
                @keyframes btnShimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes btnActivate {
                    0% { box-shadow: 0 4px 32px rgba(197,160,89,0.3), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2); }
                    50% { box-shadow: 0 4px 48px rgba(197,160,89,0.5), 0 0 80px rgba(197,160,89,0.12), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2); }
                    100% { box-shadow: 0 4px 32px rgba(197,160,89,0.3), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2); }
                }
                @keyframes ambientPulse {
                    0%, 100% { opacity: 0.85; }
                    50% { opacity: 1; }
                }
            `}</style>

            <div
                style={{
                    background: '#000000',
                    minHeight: '100dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    fontFamily: fontSans,
                }}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {/* ── Multi-layered spotlight gradient ──────────── */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        pointerEvents: 'none',
                        animation: 'ambientPulse 10s ease-in-out infinite',
                        background: [
                            'radial-gradient(ellipse 60% 45% at 50% 8%, rgba(26,24,22,0.9) 0%, transparent 70%)',
                            'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(20,17,14,0.5) 0%, transparent 80%)',
                            'radial-gradient(circle at 50% 25%, rgba(197,160,89,0.04) 0%, transparent 50%)',
                        ].join(', '),
                    }}
                />
                {/* ── Scrollable form content ─────────────────────── */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        flex: '1 1 auto',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        paddingBottom: '120px',
                    }}
                >
                    <form
                        id="review-form"
                        onSubmit={handleSubmit}
                        className="flex flex-col w-full"
                        style={{
                            padding: 'clamp(20px, 5dvh, 40px) 24px',
                            paddingTop: 'max(clamp(20px, 4dvh, 40px), env(safe-area-inset-top))',
                            gap: 'clamp(16px, 3.5dvh, 32px)',
                            maxWidth: '480px',
                            margin: '0 auto',
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
                                className="w-auto object-contain brightness-0 invert opacity-90"
                                style={{ height: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={toggleLang}
                                className="w-14 rounded-full text-xs font-medium tracking-wide transition-all duration-200"
                                style={{
                                    padding: '6px 12px',
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
                            className="flex items-center rounded-2xl"
                            style={{
                                animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
                                background: 'rgba(18, 18, 18, 0.75)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.10)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                                padding: '20px',
                                gap: '16px',
                            }}
                        >
                            <div className="rounded-xl overflow-hidden flex-shrink-0 border border-white/10" style={{ width: '84px', height: '84px', background: '#F0F0F0' }}>
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
                                <p className="font-semibold" style={{ color: '#C5A059', fontSize: isRtl ? '12px' : '9px', letterSpacing: isRtl ? '0' : '0.25em', textTransform: isRtl ? 'none' : 'uppercase', marginBottom: '6px' }}>
                                    {t.eyebrow}
                                </p>
                                <div style={{ height: '1px', width: '32px', background: 'rgba(197,160,89,0.2)', marginBottom: '8px' }} />
                                <h1
                                    className="font-semibold leading-snug line-clamp-2"
                                    style={{ color: '#FDFCF0', fontSize: '18px', letterSpacing: '-0.01em', textShadow: '0 1px 12px rgba(197,160,89,0.15)', fontFamily: fontSerif }}
                                >
                                    {product.title}
                                </h1>
                            </div>
                        </div>

                        {/* ── Heart Rating ────────────────────────────────── */}
                        <div
                            className="flex flex-col items-center"
                            style={{
                                animation: 'reviewSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
                                gap: '6px',
                                padding: '6px 0',
                            }}
                        >
                            <p style={{ color: '#FDFCF0', fontSize: '16px', letterSpacing: '0.01em', fontFamily: fontSerif }}>
                                {t.question}
                            </p>
                            <p
                                style={{ color: rating ? '#FDFCF0' : '#6A6A6A', fontSize: '14px', height: '24px', lineHeight: '24px', letterSpacing: '0.02em', fontFamily: fontSerif }}
                            >
                                {rating ? t.ratings[rating] : t.tapToRate}
                            </p>
                            <div
                                dir="ltr"
                                className="flex justify-center w-full"
                                style={{
                                    gap: '12px',
                                    padding: '6px 0',
                                    ...(ratingError ? { animation: 'ratingShake 0.5s ease-in-out' } : {}),
                                }}
                            >
                                {[1, 2, 3, 4, 5].map((value) => {
                                    const isFilled = rating !== null && value <= rating
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleRatingSelect(value as RatingValue)}
                                            className="transition-all duration-200 active:scale-90 focus:outline-none focus:ring-0"
                                            style={{ padding: '8px' }}
                                        >
                                            <Heart
                                                className={`transition-all duration-300 ${isFilled
                                                    ? 'text-white'
                                                    : ratingError
                                                        ? 'text-red-400/60'
                                                        : 'text-[#3A3A3A] hover:text-[#6A6A6A]'
                                                    }`}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    fill: isFilled ? '#FDFCF0' : 'none',
                                                    filter: isFilled ? 'drop-shadow(0 0 8px rgba(197, 160, 89, 0.4))' : undefined,
                                                }}
                                                strokeWidth={1.5}
                                            />
                                        </button>
                                    )
                                })}
                            </div>
                            {ratingError && (
                                <p style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(248,113,113,0.9)' }}>
                                    {t.ratingRequired}
                                </p>
                            )}
                        </div>

                        {/* ── Text Area ───────────────────────────────────── */}
                        <div
                            style={{
                                animation: 'reviewSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
                                ...glassSectionStyle,
                                padding: '20px',
                            }}
                        >
                            <label className="block font-semibold" style={{ marginBottom: '12px', fontSize: '11px', letterSpacing: isRtl ? '0' : '0.1em', textTransform: isRtl ? 'none' : 'uppercase', color: '#A1A1A1', fontFamily: fontSans }}>
                                {t.experienceLabel}{' '}
                                <span style={{ textTransform: 'none', letterSpacing: 'normal', color: '#4A4A4A' }}>({t.optional})</span>
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
                                    w-full rounded-2xl
                                    text-[15px] leading-relaxed
                                    focus:outline-none
                                    resize-none transition-all duration-300
                                "
                                style={{ ...glassInputStyle, padding: '16px 20px', minHeight: '110px' }}
                            />
                            {reviewText.length > 0 && (
                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', textAlign: 'end', marginTop: '6px' }}>
                                    {reviewText.length}/{MAX_REVIEW_CHARS}
                                </p>
                            )}
                        </div>

                        {/* ── Contact Inputs ──────────────────────────────── */}
                        {!isPrefilled && (
                            <div
                                style={{
                                    animation: 'reviewSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
                                    ...glassSectionStyle,
                                    padding: '20px',
                                }}
                            >
                                <label className="block font-semibold" style={{ marginBottom: '12px', fontSize: '11px', letterSpacing: isRtl ? '0' : '0.1em', textTransform: isRtl ? 'none' : 'uppercase', color: '#A1A1A1', fontFamily: fontSans }}>
                                    {t.aboutLabel}{' '}
                                    <span style={{ textTransform: 'none', letterSpacing: 'normal', color: '#4A4A4A' }}>({t.optional})</span>
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <input
                                        id="customerName"
                                        name="customerName"
                                        type="text"
                                        autoComplete="given-name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder={t.namePlaceholder}
                                        className="
                                            w-full text-[15px] rounded-2xl
                                            focus:outline-none
                                            transition-all duration-300
                                        "
                                        style={{ ...glassInputStyle, padding: '16px 20px' }}
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
                                            w-full text-[15px] rounded-2xl
                                            focus:outline-none
                                            transition-all duration-300
                                        "
                                        style={{ ...glassInputStyle, padding: '16px 20px', textAlign: isRtl && !whatsapp ? 'right' : 'left' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Submit Error (inline, above sticky CTA) ─────── */}
                        {submitError && (
                            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(248,113,113,0.9)' }}>
                                {t.submitError}
                            </p>
                        )}
                    </form>
                </div>

                {/* ── Fixed CTA + Footer ─────────────────────────── */}
                <div
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        padding: '0 24px',
                        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                        background: 'linear-gradient(to top, #000000 50%, rgba(0,0,0,0.92) 75%, rgba(0,0,0,0) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                    }}
                >
                    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
                        {/* Fade edge */}
                        <div style={{ height: '24px' }} />

                        <button
                            type="submit"
                            form="review-form"
                            disabled={submitting}
                            onClick={handleSubmit}
                            className="
                                w-full text-[15px] font-bold
                                transition-all duration-500 ease-out
                                flex items-center justify-center gap-2
                                focus:outline-none focus:ring-0
                                active:scale-[0.97]
                            "
                            style={{
                                padding: '20px 24px',
                                background: submitting
                                    ? 'rgba(197, 160, 89, 0.4)'
                                    : rating
                                        ? 'linear-gradient(135deg, #C5A059 0%, #D4B978 50%, #C5A059 100%)'
                                        : 'linear-gradient(135deg, rgba(197,160,89,0.15) 0%, rgba(142,115,91,0.10) 100%)',
                                backgroundSize: '200% auto',
                                animation: submitting
                                    ? 'none'
                                    : rating
                                        ? 'btnShimmer 3s ease-in-out infinite, btnActivate 1.5s ease-out 1'
                                        : 'none',
                                color: rating ? '#050505' : 'rgba(197,160,89,0.45)',
                                boxShadow: rating
                                    ? '0 4px 32px rgba(197, 160, 89, 0.3), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                                    : '0 2px 8px rgba(0,0,0,0.3)',
                                border: rating
                                    ? '1px solid rgba(197, 160, 89, 0.5)'
                                    : '1px solid rgba(197, 160, 89, 0.12)',
                                letterSpacing: isRtl ? '0' : '0.1em',
                                fontFamily: fontSans,
                                transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                                borderRadius: '16px',
                            }}
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

                        {/* Footer */}
                        <div className="flex flex-col items-center" style={{ marginTop: '16px', gap: '6px' }}>
                            <Image
                                src="/images/stitched_logo.png"
                                alt="Stitched"
                                width={200}
                                height={66}
                                className="w-auto object-contain brightness-0 invert opacity-40"
                                style={{ height: '18px' }}
                            />
                            <p style={{ fontSize: '10px', letterSpacing: isRtl ? '0' : '0.2em', textTransform: isRtl ? 'none' : 'uppercase', color: '#3A3A3A' }}>
                                {t.tagline}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
