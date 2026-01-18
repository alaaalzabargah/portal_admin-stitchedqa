'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyableSizeCardProps {
    size: string
    label: string
}

export function CopyableSizeCard({ size, label }: CopyableSizeCardProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(size)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea')
            textArea.value = size
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="card-premium p-3 rounded-lg text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all w-full touch-manipulation"
            title={`Copy ${size}`}
            aria-label={`Copy size ${size}`}
        >
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
            <div className="flex items-center justify-center gap-1.5">
                <p className="text-xl font-bold text-primary uppercase">
                    {size}
                </p>
                {copied ? (
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                    <Copy className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                )}
            </div>
        </button>
    )
}

