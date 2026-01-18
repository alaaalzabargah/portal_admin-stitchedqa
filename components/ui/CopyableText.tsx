'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyableTextProps {
    text: string
    label?: string
    icon?: React.ReactNode
    className?: string
    textClassName?: string
}

export function CopyableText({ text, label, icon, className = '', textClassName = '' }: CopyableTextProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea')
            textArea.value = text
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
            className={`flex items-center gap-1.5 hover:text-accent active:text-accent transition-colors cursor-pointer touch-manipulation ${className}`}
            title={`Copy ${label || text}`}
            aria-label={`Copy ${label || text}`}
        >
            {icon}
            <span className={textClassName}>{text}</span>
            {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
            )}
        </button>
    )
}
