'use client'

import { useState, useRef, useEffect } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { Download, Upload, X, Layers, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { GlassButton } from '@/components/ui/GlassButton'
import { type ExportFormat } from '@/lib/qr/export'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'

type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded'
type CornerSquareType = 'square' | 'extra-rounded' | 'dot'
type CornerDotType = 'square' | 'dot'
type GeneratorMode = 'single' | 'bulk'
type LabelSize = '40mm' | '50mm'

interface BulkItem {
    link: string
    itemName: string
    status?: 'pending' | 'done' | 'error'
}

export default function QRGeneratorPage() {
    const { t } = useLanguage()
    const qrRef = useRef<any>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const bulkInputRef = useRef<HTMLInputElement>(null)

    // Configuration State (Shared)
    const [dotType, setDotType] = useState<DotType>('rounded')
    const [dotColor, setDotColor] = useState('#2D3436') // Charcoal Gray
    const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded')
    const [cornerSquareColor, setCornerSquareColor] = useState('#2D3436')
    const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot')
    const [cornerDotColor, setCornerDotColor] = useState('#2D3436')
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
    const [logoImage, setLogoImage] = useState<string | null>(null)
    const [logoSize, setLogoSize] = useState(0.3)
    const [logoMargin, setLogoMargin] = useState(3)
    const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
    const [size, setSize] = useState(2048) // Increased default resolution
    const [labelSize, setLabelSize] = useState<LabelSize>('63.5x72mm')

    // Single Mode State
    const [qrContent, setQRContent] = useState('https://example.com')
    const [itemName, setItemName] = useState('')

    // Bulk Mode State
    const [mode, setMode] = useState<GeneratorMode>('single')
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)

    // Initialize QR Code Styling instance
    useEffect(() => {
        if (canvasRef.current) {
            const config = getQRConfig(qrContent)
            qrRef.current = new QRCodeStyling(config)
            qrRef.current.append(canvasRef.current)
        }
    }, [])

    // Update Live Preview (Single Mode)
    useEffect(() => {
        if (qrRef.current && mode === 'single') {
            const config = getQRConfig(qrContent)
            qrRef.current.update(config)
        }
    }, [qrContent, dotType, dotColor, cornerSquareType, cornerSquareColor, cornerDotType, cornerDotColor, backgroundColor, logoImage, logoSize, logoMargin, mode])

    const getQRConfig = (data: string) => {
        const config: any = {
            width: 400,
            height: 400,
            data: data,
            margin: 0,
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
        return config
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => setLogoImage(event.target?.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

            // Map columns loosely (case insensitive logic could be added)
            const items: BulkItem[] = jsonData.map(row => ({
                link: row['Link'] || row['URL'] || row['link'] || row['url'] || '',
                itemName: row['Item Name'] || row['Name'] || row['item name'] || row['name'] || '',
                status: 'pending' as const
            })).filter(item => item.link) // Filter empty rows

            setBulkItems(items)
        }
        reader.readAsArrayBuffer(file)
    }

    const generateQR = async (data: string, label: string): Promise<Blob | null> => {
        return new Promise(async (resolve) => {
            // Create temp QR instance
            const tempConfig = getQRConfig(data)
            tempConfig.width = size
            tempConfig.height = size

            const tempQR = new QRCodeStyling(tempConfig)
            const rawBlob = await tempQR.getRawData(exportFormat) as Blob
            if (!rawBlob) { resolve(null); return }

            // If no label, just return the raw blob (SVG or Raster)
            if (!label) { resolve(rawBlob); return }

            // Handle SVG Vector Output
            if (exportFormat === 'svg') {
                const text = await rawBlob.text()
                const padding = size * 0.05
                const bottomSpace = size * 0.15
                const fontSize = size * 0.06
                const totalHeight = size + bottomSpace

                // regex to extract content inside <svg>...</svg>
                const svgContentMatch = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)
                const innerContent = svgContentMatch ? svgContentMatch[1] : text

                // Construct new SVG
                const newSvg = `
                <svg width="${size}" height="${totalHeight}" viewBox="0 0 ${size} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="${size}" height="${totalHeight}" fill="#ffffff"/>
                    <g transform="translate(${padding}, ${padding})">
                        <svg width="${size - (padding * 2)}" height="${size - (padding * 2)}" viewBox="0 0 ${size} ${size}">
                            ${innerContent}
                        </svg>
                    </g>
                    <text x="${size / 2}" y="${size - padding + (bottomSpace / 1.5)}" 
                        font-family="sans-serif" font-size="${fontSize}" font-weight="bold" 
                        fill="#000000" text-anchor="middle" dominant-baseline="middle">
                        ${label}
                    </text>
                </svg>
                `
                resolve(new Blob([newSvg], { type: 'image/svg+xml' }))
                return
            }

            // Handle Raster Output (PNG, JPEG, WebP) via Canvas
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) { resolve(null); return }

            const img = new Image()
            img.src = URL.createObjectURL(rawBlob)
            await new Promise(r => img.onload = r)

            const padding = size * 0.05
            const bottomSpace = size * 0.15
            const fontSize = size * 0.06

            canvas.width = size
            canvas.height = size + bottomSpace

            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, padding, padding, size - (padding * 2), size - (padding * 2))

            ctx.fillStyle = '#000000'
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            const textY = size - padding + (bottomSpace / 1.5)
            ctx.fillText(label, size / 2, textY)

            canvas.toBlob(resolve, `image/${exportFormat}`)
        })
    }

    const handleSingleExport = async () => {
        if (!qrRef.current) return
        try {
            const start = Date.now()
            const blob = await generateQR(qrContent, itemName)
            if (blob) {
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                // Use item name directly if available, sanitized for filename safety (allow spaces/dashes)
                const filename = itemName
                    ? `${itemName.replace(/[^a-z0-9\s\-\(\)]/gi, '').trim()}.${exportFormat}`
                    : `qr-code.${exportFormat}`

                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Export failed:', error)
        }
    }

    const handleBulkExport = async () => {
        if (bulkItems.length === 0) return
        setIsProcessing(true)
        setProgress(0)

        const zip = new JSZip()
        const folder = zip.folder("qr_codes")

        for (let i = 0; i < bulkItems.length; i++) {
            const item = bulkItems[i]
            try {
                const blob = await generateQR(item.link, item.itemName)
                if (blob) {
                    // Use item name directly, sanitized lightly for filesystem
                    const cleanName = item.itemName
                        ? item.itemName.replace(/[^a-z0-9\s\-\(\)]/gi, '').trim()
                        : `qr_${i}`

                    const filename = `${cleanName}.${exportFormat}`
                    folder?.file(filename, blob)
                }
            } catch (e) {
                console.error(`Failed to generate QR for ${item.itemName}`, e)
            }
            setProgress(Math.round(((i + 1) / bulkItems.length) * 100))
        }

        const content = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(content)
        const link = document.createElement('a')
        link.href = url
        link.download = "bulk_qr_codes.zip"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setIsProcessing(false)
        setProgress(100)
    }

    type LabelSize = '63.5x72mm' | '99x68mm'

    const handleBulkPDF = async () => {
        if (bulkItems.length === 0) return
        setIsProcessing(true)
        setProgress(0)

        const doc = new jsPDF()
        const pageWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm

        // Define dimensions based on selection
        const dims = labelSize === '63.5x72mm'
            ? { w: 63.5, h: 72 }
            : { w: 99, h: 68 }

        // Calculate centered grid
        const cols = Math.floor((pageWidth - 6) / dims.w)
        const rows = Math.floor((pageHeight - 6) / dims.h)
        const totalGridW = cols * dims.w
        const totalGridH = rows * dims.h
        const startX = (pageWidth - totalGridW) / 2
        const startY = (pageHeight - totalGridH) / 2

        let currentItem = 0

        while (currentItem < bulkItems.length) {
            if (currentItem > 0) doc.addPage()

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (currentItem >= bulkItems.length) break

                    const item = bulkItems[currentItem]
                    const x = startX + (c * dims.w)
                    const y = startY + (r * dims.h)

                    // Sticker internal padding
                    const stickerPadding = 4
                    const safeW = dims.w - (stickerPadding * 2)
                    const safeH = dims.h - (stickerPadding * 2)

                    const tempConfig = getQRConfig(item.link)
                    tempConfig.width = 1024
                    tempConfig.height = 1024

                    const tempQR = new QRCodeStyling(tempConfig)
                    try {
                        const rawBlob = await tempQR.getRawData('png') as Blob
                        if (rawBlob) {
                            const canvas = document.createElement('canvas')
                            const ctx = canvas.getContext('2d')
                            if (ctx) {
                                // Canvas Generation Logic
                                const img = new Image()
                                img.src = URL.createObjectURL(rawBlob)
                                await new Promise(r => img.onload = r)

                                const tempSize = 1024
                                const renderPadding = tempSize * 0.05
                                const bottomSpace = tempSize * 0.15
                                const fontSize = tempSize * 0.06

                                canvas.width = tempSize
                                canvas.height = tempSize + bottomSpace

                                // Draw Frame & Text
                                ctx.fillStyle = '#ffffff'
                                ctx.fillRect(0, 0, canvas.width, canvas.height)
                                ctx.drawImage(img, renderPadding, renderPadding, tempSize - (renderPadding * 2), tempSize - (renderPadding * 2))

                                ctx.fillStyle = '#000000'
                                ctx.font = `bold ${fontSize}px sans-serif`
                                ctx.textAlign = 'center'
                                ctx.textBaseline = 'middle'

                                const textY = tempSize - renderPadding + (bottomSpace / 1.5)
                                ctx.fillText(item.itemName, tempSize / 2, textY)

                                const framedDataUrl = canvas.toDataURL('image/png')

                                // Calculate Fit dimensions preserving aspect ratio
                                const imgRatio = canvas.height / canvas.width
                                let finalW = safeW
                                let finalH = finalW * imgRatio

                                // If height exceeds bounds, scale down by height
                                if (finalH > safeH) {
                                    finalH = safeH
                                    finalW = finalH / imgRatio
                                }

                                // Center in label
                                const imgX = x + (dims.w - finalW) / 2
                                const imgY = y + (dims.h - finalH) / 2

                                doc.addImage(framedDataUrl, 'PNG', imgX, imgY, finalW, finalH)

                                // Draw Border (Cut Guide)
                                doc.setLineWidth(0.1)
                                doc.setDrawColor(200, 200, 200) // Light Gray
                                doc.rect(x, y, dims.w, dims.h)
                            }
                        }
                    } catch (e) { console.error(e) }

                    currentItem++
                    setProgress(Math.round((currentItem / bulkItems.length) * 100))
                }
            }
        }

        doc.save(`qr_codes_${labelSize}.pdf`)
        setIsProcessing(false)
        setProgress(100)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sand-50 to-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
                            QR Code Generator
                        </h1>
                        <p className="text-muted-foreground">Advanced customization with single or bulk generation</p>
                    </div>
                    {/* Mode Toggle */}
                    <div className="bg-white p-1 rounded-xl border border-sand-200 shadow-sm flex">
                        <button
                            onClick={() => setMode('single')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mode === 'single' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-sand-50'}`}
                        >
                            <Download className="w-4 h-4" /> Single
                        </button>
                        <button
                            onClick={() => setMode('bulk')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${mode === 'bulk' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-sand-50'}`}
                        >
                            <Layers className="w-4 h-4" /> Bulk
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN - CONFIGURATION */}
                <div className="space-y-6">
                    {/* Mode Specific Input */}
                    {mode === 'single' ? (
                        <div className="glass-card p-6 rounded-2xl shadow-xl animate-fade-in">
                            <h2 className="text-xl font-semibold text-primary mb-4">Single Content</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target URL / Data</label>
                                    <input type="text" value={qrContent} onChange={(e) => setQRContent(e.target.value)} placeholder="https://example.com"
                                        className="w-full px-4 py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Item Name (Label Display)</label>
                                    <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Classic Black Abaya - Size M"
                                        className="w-full px-4 py-3 border border-sand-200 rounded-xl focus:ring-2 focus:ring-accent bg-white" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card p-6 rounded-2xl shadow-xl animate-fade-in">
                            <h2 className="text-xl font-semibold text-primary mb-4">Bulk Upload</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm text-muted-foreground">
                                        Upload an Excel or CSV file. The file must have headers: <strong>Link</strong> and <strong>Item Name</strong>.
                                    </p>
                                    <button
                                        onClick={() => {
                                            const csvContent = "Link,Item Name\\nhttps://example.com/product-1,Classic Abaya Black\\nhttps://example.com/product-2,Silk Scarf White"
                                            const blob = new Blob([csvContent], { type: 'text/csv' })
                                            const url = URL.createObjectURL(blob)
                                            const link = document.createElement('a')
                                            link.href = url
                                            link.download = "qr_bulk_template.csv"
                                            document.body.appendChild(link)
                                            link.click()
                                            document.body.removeChild(link)
                                        }}
                                        className="text-xs text-accent hover:text-accent/80 font-medium underline"
                                    >
                                        Download Template
                                    </button>
                                </div>
                                <input ref={bulkInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFileUpload} className="hidden" />
                                <button onClick={() => bulkInputRef.current?.click()}
                                    className="w-full py-8 border-2 border-dashed border-sand-200 rounded-xl hover:border-accent transition-colors flex flex-col items-center gap-2 bg-white/50">
                                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                                    <span className="text-sm font-medium text-primary">Click to upload spreadsheet</span>
                                    <span className="text-xs text-muted-foreground">.xlsx, .csv supported</span>
                                </button>
                                {bulkItems.length > 0 && (
                                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm border border-green-200 flex items-center justify-between">
                                        <span>Ready to generate <strong>{bulkItems.length}</strong> QR codes</span>
                                        <button onClick={() => setBulkItems([])} className="p-1 hover:bg-green-100 rounded-full"><X className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Design Config - Shared */}
                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-semibold text-primary mb-4">Design Configuration</h2>
                        <div className="space-y-6">
                            {/* Dots */}
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dot Pattern</label>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {(['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'] as DotType[]).map((type) => (
                                        <button key={type} onClick={() => setDotType(type)}
                                            className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${dotType === type ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 hover:border-accent/50'}`}>
                                            {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="color" value={dotColor} onChange={(e) => setDotColor(e.target.value)} className="h-10 w-14 rounded-lg cursor-pointer border border-sand-200" />
                                    <input type="text" value={dotColor} onChange={(e) => setDotColor(e.target.value)} className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm" />
                                </div>
                            </div>

                            {/* Center Logo */}
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Center Logo</label>
                                <div className="flex gap-4 items-start">
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 border-2 border-dashed border-sand-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors relative overflow-hidden"
                                    >
                                        {logoImage ? (
                                            <img src={logoImage} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Upload className="w-6 h-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">Size</label>
                                            <input type="range" min="0.1" max="0.5" step="0.05" value={logoSize} onChange={(e) => setLogoSize(parseFloat(e.target.value))} className="w-full" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">Margin</label>
                                            <input type="range" min="0" max="10" value={logoMargin} onChange={(e) => setLogoMargin(parseInt(e.target.value))} className="w-full" />
                                        </div>
                                        {logoImage && (
                                            <button onClick={() => setLogoImage(null)} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove Logo</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Corner Squares (Eyes) */}
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Corner Squares (Outer Eyes)</label>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {(['square', 'extra-rounded', 'dot'] as CornerSquareType[]).map((type) => (
                                        <button key={type} onClick={() => setCornerSquareType(type)}
                                            className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${cornerSquareType === type ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 hover:border-accent/50'}`}>
                                            {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="color" value={cornerSquareColor} onChange={(e) => setCornerSquareColor(e.target.value)} className="h-10 w-14 rounded-lg cursor-pointer border border-sand-200" />
                                    <input type="text" value={cornerSquareColor} onChange={(e) => setCornerSquareColor(e.target.value)} className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm" />
                                </div>
                            </div>

                            {/* Corner Dots (Pupils) */}
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Corner Dots (Inner Pupils)</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {(['square', 'dot'] as CornerDotType[]).map((type) => (
                                        <button key={type} onClick={() => setCornerDotType(type)}
                                            className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${cornerDotType === type ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 hover:border-accent/50'}`}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="color" value={cornerDotColor} onChange={(e) => setCornerDotColor(e.target.value)} className="h-10 w-14 rounded-lg cursor-pointer border border-sand-200" />
                                    <input type="text" value={cornerDotColor} onChange={(e) => setCornerDotColor(e.target.value)} className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm" />
                                </div>
                            </div>

                            {/* Background Color */}
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Background</label>
                                <div className="flex gap-2">
                                    <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 w-14 rounded-lg cursor-pointer border border-sand-200" />
                                    <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1 px-3 py-2 border border-sand-200 rounded-lg text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - PREVIEW */}
                <div className="lg:sticky lg:top-8 lg:h-fit space-y-6">
                    <div className="glass-card p-8 rounded-2xl shadow-xl flex flex-col items-center text-center">
                        <h3 className="text-lg font-semibold text-primary mb-4">
                            {mode === 'single' ? 'Live Preview' : 'Design Preview'}
                        </h3>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-sand-100 inline-block">
                            <div ref={canvasRef} />
                            {(mode === 'single' ? itemName : 'Item Name Preview') && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 w-[400px]">
                                    <p className="text-xl font-bold text-black font-sans truncate px-2">
                                        {mode === 'single' ? itemName : 'Item Name Preview'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-4">
                            {mode === 'single' ? 'Preview of your custom QR code' : 'This design will be applied to all bulk items'}
                        </p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl shadow-xl">
                        <h3 className="text-lg font-semibold text-primary mb-4">Export Options</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Format</label>
                                    <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                        className="w-full px-3 py-2 border border-sand-200 rounded-lg bg-white text-sm">
                                        <option value="png">PNG</option>
                                        <option value="jpeg">JPEG</option>
                                        <option value="webp">WebP</option>
                                        <option value="svg">SVG (Vector)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Size (px)</label>
                                    <input type="number" min="256" max="4096" step="256" value={size} onChange={(e) => setSize(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-sand-200 rounded-lg bg-white text-sm" />
                                </div>
                            </div>

                            {mode === 'single' ? (
                                <GlassButton variant="primary" className="w-full" leftIcon={<Download className="w-5 h-5" />} onClick={handleSingleExport}>
                                    {itemName ? 'Download Labeled QR' : 'Download QR Code'}
                                </GlassButton>
                            ) : (
                                <div className="space-y-3">
                                    {isProcessing && (
                                        <div className="w-full bg-sand-100 rounded-full h-2 overflow-hidden">
                                            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                    )}
                                    <GlassButton
                                        variant="primary"
                                        className="w-full"
                                        leftIcon={isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                        onClick={handleBulkExport}
                                        disabled={bulkItems.length === 0 || isProcessing}
                                    >
                                        {isProcessing
                                            ? `Generating... ${progress}%`
                                            : `Download ${bulkItems.length} QR Codes (ZIP)`
                                        }
                                    </GlassButton>

                                    {/* PDF Download Section */}
                                    <div className="pt-4 border-t border-sand-200 mt-4 space-y-3">
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Print to PDF (A4 Sheet)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['63.5x72mm', '99x68mm'] as LabelSize[]).map(s => (
                                                <button key={s} onClick={() => setLabelSize(s)}
                                                    className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${labelSize === s ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-sand-200 hover:border-accent/50'}`}>
                                                    {s.replace('mm', '')}
                                                </button>
                                            ))}
                                        </div>
                                        <GlassButton
                                            variant="secondary"
                                            className="w-full"
                                            leftIcon={isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                                            onClick={handleBulkPDF}
                                            disabled={bulkItems.length === 0 || isProcessing}
                                        >
                                            {isProcessing ? 'Generating PDF...' : `Download PDF Sheet (${labelSize})`}
                                        </GlassButton>
                                    </div>

                                    {bulkItems.length === 0 && (
                                        <p className="text-xs text-center text-muted-foreground">Upload a sheet to enable bulk download</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
