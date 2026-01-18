'use client'

import { useState, useRef, useEffect } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { Download, Upload, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { GlassButton } from '@/components/ui/GlassButton'
import { type ExportFormat } from '@/lib/qr/export'

type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded'
type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
type CornerDotType = 'square' | 'dot'

export default function QRGeneratorPage() {
    const { t } = useLanguage()
    const qrRef = useRef<any>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [qrContent, setQRContent] = useState('https://example.com')
    const [dotType, setDotType] = useState<DotType>('square')
    const [dotColor, setDotColor] = useState('#000000')
    const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('square')
    const [cornerSquareColor, setCornerSquareColor] = useState('#000000')
    const [cornerDotType, setCornerDotType] = useState<CornerDotType>('square')
    const [cornerDotColor, setCornerDotColor] = useState('#000000')
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
    const [logoImage, setLogoImage] = useState<string | null>(null)
    const [logoSize, setLogoSize] = useState(0.3)
    const [logoMargin, setLogoMargin] = useState(3)
    const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
    const [size, setSize] = useState(1024)

    useEffect(() => {
        if (canvasRef.current) {
            const config: any = {
                width: 400,
                height: 400,
                data: qrContent,
                margin: 10,
                qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
                dotsOptions: { type: dotType, color: dotColor },
                cornersSquareOptions: { type: cornerSquareType, color: cornerSquareColor },
                cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
                backgroundOptions: { color: backgroundColor }
            }

            if (logoImage) {
                config.image = logoImage
                config.imageOptions = {
                    hideBackgroundDots: true,
                    imageSize: logoSize,
                    margin: logoMargin
                }
            }

            qrRef.current = new QRCodeStyling(config)
            qrRef.current.append(canvasRef.current)
        }
    }, [])

    useEffect(() => {
        if (qrRef.current) {
            const config: any = {
                data: qrContent,
                dotsOptions: { type: dotType, color: dotColor },
                cornersSquareOptions: { type: cornerSquareType, color: cornerSquareColor },
                cornersDotOptions: { type: cornerDotType, color: cornerDotColor },
                backgroundOptions: { color: backgroundColor }
            }

            if (logoImage) {
                config.image = logoImage
                config.imageOptions = {
                    hideBackgroundDots: true,
                    imageSize: logoSize,
                    margin: logoMargin
                }
            }

            qrRef.current.update(config)
        }
    }, [qrContent, dotType, dotColor, cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor, backgroundColor, logoImage, logoSize, logoMargin])

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => setLogoImage(event.target?.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleExport = async () => {
        if (!qrRef.current) return
        try {
            const blob = await qrRef.current.getRawData(exportFormat)
            if (blob) {
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `qr-code.${exportFormat}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Export failed:', error)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sand-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto mb-8">
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary dark:text-white mb-2">
                    QR Code Generator
                </h1>
                <p className="text-muted-foreground">Advanced QR code customization with full design control</p>
            </div>

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary dark:text-white mb-4">Content</h2>
                        <input type="text" value={qrContent} onChange={(e) => setQRContent(e.target.value)} placeholder="https://example.com"
                            className="w-full px-4 py-3 border border-sand-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-accent bg-white dark:bg-zinc-800 dark:text-white" />
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary dark:text-white mb-4">Dot Pattern</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {(['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'] as DotType[]).map((type) => (
                                    <button key={type} onClick={() => setDotType(type)}
                                        className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${dotType === type ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 dark:border-zinc-700 hover:border-accent/50'}`}>
                                        {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={dotColor} onChange={(e) => setDotColor(e.target.value)}
                                    className="h-12 w-20 rounded-xl border border-sand-200 dark:border-zinc-700 cursor-pointer" />
                                <input type="text" value={dotColor} onChange={(e) => setDotColor(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-sand-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-white font-mono text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary dark:text-white mb-4">Corner Squares (Eyes)</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {(['square', 'extra-rounded', 'dot'] as CornerSquareType[]).map((type) => (
                                    <button key={type} onClick={() => setCornerSquareType(type)}
                                        className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${cornerSquareType === type ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 dark:border-zinc-700 hover:border-accent/50'}`}>
                                        {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={cornerSquareColor} onChange={(e) => setCornerSquareColor(e.target.value)}
                                    className="h-12 w-20 rounded-xl border border-sand-200 dark:border-zinc-700 cursor-pointer" />
                                <input type="text" value={cornerSquareColor} onChange={(e) => setCornerSquareColor(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-sand-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-white font-mono text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary dark:text-white mb-4">Corner Dots (Pupils)</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {(['square', 'dot'] as CornerDotType[]).map((type) => (
                                    <button key={type} onClick={() => setCornerDotType(type)}
                                        className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${cornerDotType === type ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 dark:border-zinc-700 hover:border-accent/50'}`}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={cornerDotColor} onChange={(e) => setCornerDotColor(e.target.value)}
                                    className="h-12 w-20 rounded-xl border border-sand-200 dark:border-zinc-700 cursor-pointer" />
                                <input type="text" value={cornerDotColor} onChange={(e) => setCornerDotColor(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-sand-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-white font-mono text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary dark:text-white mb-4">Background</h2>
                        <div className="flex gap-2 items-center">
                            <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                                className="h-12 w-20 rounded-xl border border-sand-200 dark:border-zinc-700 cursor-pointer" />
                            <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                                className="flex-1 px-3 py-2 border border-sand-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 dark:text-white font-mono text-sm" />
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary dark:text-white mb-4">Center Logo</h2>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        {logoImage ? (
                            <div className="space-y-4">
                                <div className="relative w-24 h-24 mx-auto">
                                    <img src={logoImage} alt="Logo" className="w-full h-full object-contain border border-sand-200 rounded-lg" />
                                    <button onClick={() => setLogoImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div><label className="block text-sm font-medium mb-2">Logo Size: {(logoSize * 100).toFixed(0)}%</label>
                                    <input type="range" min="0.1" max="0.5" step="0.05" value={logoSize} onChange={(e) => setLogoSize(parseFloat(e.target.value))} className="w-full" /></div>
                                <div><label className="block text-sm font-medium mb-2">Margin: {logoMargin}px</label>
                                    <input type="range" min="0" max="10" value={logoMargin} onChange={(e) => setLogoMargin(parseInt(e.target.value))} className="w-full" /></div>
                            </div>
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-sand-200 dark:border-zinc-700 rounded-xl hover:border-accent transition-colors flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload logo</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="lg:sticky lg:top-8 lg:h-fit space-y-6">
                    <div className="glass-card p-8 rounded-2xl shadow-xl">
                        <h3 className="text-lg font-semibold text-primary dark:text-white mb-4">Live Preview</h3>
                        <div className="flex items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl p-8">
                            <div ref={canvasRef} />
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h3 className="text-lg font-semibold text-primary dark:text-white mb-4">Export Options</h3>
                        <div className="space-y-4">
                            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                className="w-full px-4 py-3 border border-sand-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-accent bg-white dark:bg-zinc-800 dark:text-white">
                                <option value="png">PNG (Raster)</option>
                                <option value="svg">SVG (Vector)</option>
                                <option value="jpeg">JPEG</option>
                                <option value="webp">WebP</option>
                            </select>
                            <div><label className="block text-sm font-medium mb-2">Size: {size}x{size}px</label>
                                <input type="range" min="256" max="4096" step="256" value={size} onChange={(e) => setSize(parseInt(e.target.value))} className="w-full" /></div>
                            <GlassButton variant="primary" className="w-full" leftIcon={<Download className="w-5 h-5" />} onClick={handleExport}>
                                Download QR Code
                            </GlassButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
