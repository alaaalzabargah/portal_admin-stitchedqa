/**
 * QR Code Export Utilities
 */

export type ExportFormat = 'png' | 'svg' | 'jpeg' | 'webp'

export interface ExportOptions {
    format: ExportFormat
    size: number
    quality?: number
    name?: string
}

export function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export async function exportQRCode(
    qrCodeRef: any,
    options: ExportOptions
): Promise<void> {
    if (!qrCodeRef?.current) {
        throw new Error('QR code reference not available')
    }

    const { format, name = 'qr-code' } = options
    const filename = `${name}.${format}`

    try {
        const blob = await qrCodeRef.current.getRawData(format)
        if (blob) {
            downloadFile(blob, filename)
        }
    } catch (error) {
        console.error('Export failed:', error)
        throw error
    }
}

export function getFormatLabel(format: ExportFormat): string {
    const labels: Record<ExportFormat, string> = {
        png: 'PNG (Raster)',
        svg: 'SVG (Vector)',
        jpeg: 'JPEG (Compressed)',
        webp: 'WebP (Modern)'
    }
    return labels[format]
}

export function getRecommendedSize(format: ExportFormat): number {
    if (format === 'svg') return 1024
    if (format === 'png') return 2048
    return 1024
}
