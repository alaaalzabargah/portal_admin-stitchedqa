const fs = require('fs');
const path = './app/review/[handle]/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// The new render function for the form
const newRenderForm = `    // ── Render: Form (Cinematic Design) ───────────────────

    return (
        <>
            <style>{\`
                html, body { background: #000000 !important; margin: 0; padding: 0; height: 100%; overflow: hidden; }
                input::placeholder, textarea::placeholder {
                    color: #A0A0A0 !important;
                    opacity: 1;
                }
                @keyframes reviewFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes formSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            \`}</style>

            <div className="fixed inset-0 w-full h-full bg-black">
                {/* ── Background Image ── */}
                {product.image && (
                    <img
                        src={product.image}
                        alt={product.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ animation: 'reviewFadeIn 0.8s ease-out both' }}
                    />
                )}

                {/* ── Gradient Overlay ── */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.95) 75%, rgba(0,0,0,1) 100%)'
                    }}
                />

                {/* ── Brand Logo (Top) ── */}
                <div className="absolute top-0 left-0 right-0 z-20 pt-10 pb-4 flex justify-center pointer-events-none">
                    <Image
                        src="/images/stitched_logo.png"
                        alt="Stitched"
                        width={180}
                        height={40}
                        className="h-10 w-auto object-contain brightness-0 invert"
                        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
                    />
                </div>

                {/* ── Scrollable Form Area (Bottom constrained) ── */}
                <div className="absolute inset-0 z-10 overflow-y-auto w-full h-full no-scrollbar">
                    <div className="min-h-full flex flex-col justify-end p-5 pb-8" style={{ paddingTop: '50vh' }}>
                        
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-5 max-w-lg mx-auto w-full"
                            style={{ animation: 'formSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}
                        >
                            {/* ── Product Title ── */}
                            <div className="text-center mb-1">
                                <h1
                                    className="font-serif text-3xl text-white font-semibold tracking-tight leading-snug"
                                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
                                >
                                    {product.title}
                                </h1>
                            </div>

                            {/* ── Heart Rating ── */}
                            <div className="flex flex-col items-center gap-1.5">
                                <p className={\`font-serif text-lg tracking-wide \${formErrors.rating ? 'text-red-400' : 'text-white'}\`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                                    {formErrors.rating || 'Did this piece capture your heart?'}
                                </p>
                                <div className="flex justify-center gap-4 w-full py-1">
                                    {[1, 2, 3, 4, 5].map((value) => {
                                        const isFilled = rating !== null && value <= rating
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    setRating(value)
                                                    if (formErrors.rating) setFormErrors({ ...formErrors, rating: undefined })
                                                }}
                                                className="transition-transform duration-200 active:scale-90 focus:outline-none focus:ring-0"
                                            >
                                                <Heart
                                                    className={\`w-11 h-11 transition-all duration-200 \${isFilled
                                                        ? 'fill-white text-white'
                                                        : formErrors.rating ? 'text-red-400/60 hover:text-red-400/80' : 'text-white/40 hover:text-white/60'
                                                        }\`}
                                                    strokeWidth={1.5}
                                                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-sm font-serif tracking-wide h-5 mx-0 mt-1" style={{ color: rating ? '#FFFFFF' : 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                                    {rating ? RATING_LABELS[rating] : ''}
                                </p>
                            </div>

                            {/* ── Text Area ── */}
                            <div>
                                <textarea
                                    ref={textareaRef}
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Tell us your story... (optional)"
                                    className="
                                        w-full h-28 px-4 py-3 rounded-xl
                                        text-sm leading-relaxed text-white
                                        focus:outline-none focus:ring-1 focus:ring-white/50
                                        resize-none transition-all duration-300
                                    "
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                    }}
                                />
                            </div>

                            {/* ── Contact Inputs ── */}
                            {!isPrefilled && (
                                <div className="flex flex-col gap-3">
                                    <input
                                        id="customerName"
                                        name="customerName"
                                        type="text"
                                        autoComplete="name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Your Name (optional)"
                                        className="
                                            w-full text-sm py-3 px-4 rounded-xl text-white
                                            focus:outline-none focus:ring-1 focus:ring-white/50
                                            transition-all duration-300
                                        "
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                        }}
                                    />
                                    <div>
                                        <input
                                            id="whatsapp"
                                            name="whatsapp"
                                            type="tel"
                                            autoComplete="tel"
                                            value={whatsapp}
                                            onChange={(e) => {
                                                setWhatsapp(e.target.value)
                                                if (formErrors.whatsapp) setFormErrors({ ...formErrors, whatsapp: undefined })
                                            }}
                                            onBlur={() => { if (whatsapp.trim()) setWhatsapp(normalizePhoneNumber(whatsapp.trim())) }}
                                            placeholder="WhatsApp Number (optional)"
                                            className="
                                                w-full text-sm py-3 px-4 rounded-xl text-white
                                                focus:outline-none focus:ring-1 focus:ring-white/50
                                                transition-all duration-300
                                            "
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: formErrors.whatsapp ? '1px solid rgba(248, 113, 113, 0.6)' : '1px solid rgba(255, 255, 255, 0.15)',
                                                backdropFilter: 'blur(12px)',
                                                WebkitBackdropFilter: 'blur(12px)',
                                            }}
                                        />
                                        {formErrors.whatsapp && (
                                            <p className="text-red-400 text-xs mt-1.5 ml-1 drop-shadow-md">{formErrors.whatsapp}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Submit Error ── */}
                            {submitError && (
                                <p className="text-center text-sm font-medium text-red-400 drop-shadow-md">
                                    Something went wrong. Please try again.
                                </p>
                            )}

                            {/* ── CTA Button ── */}
                            <div className="mt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={\`
                                        w-full py-4 rounded-xl text-base font-bold tracking-wider uppercase
                                        transition-all duration-300 ease-out
                                        flex items-center justify-center gap-2
                                        focus:outline-none focus:ring-0
                                        \${!submitting
                                            ? 'bg-white text-black shadow-[0_4px_24px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-[0.98]'
                                            : 'cursor-not-allowed bg-white/20 text-white/50 border border-white/10'
                                        }
                                    \`}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Sharing…</span>
                                        </>
                                    ) : (
                                        <span>Share My Story</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}`;

const splitPoint = "// \u2500\u2500 Render: Form (True Luxury Minimalist Dark Theme) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
const parts = content.split(splitPoint);

if (parts.length === 2) {
    const updatedContent = parts[0] + newRenderForm + "\n}\n";
    fs.writeFileSync(path, updatedContent, 'utf8');
    console.log("Successfully updated UI");
} else {
    console.error("Could not find the split point.");
    console.log(content.indexOf(splitPoint));
}
