/**
 * QR Code Contrast Checker
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        }
        : null
}

function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c /= 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function calculateContrast(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)

    if (!rgb1 || !rgb2) return 0

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)

    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)
}

export const MIN_QR_CONTRAST = 3

export interface ContrastResult {
    ratio: number
    isGood: boolean
    level: 'excellent' | 'good' | 'acceptable' | 'poor'
    message: string
}

export function checkQRContrast(foreground: string, background: string): ContrastResult {
    const ratio = calculateContrast(foreground, background)

    let level: ContrastResult['level']
    let message: string
    let isGood: boolean

    if (ratio >= 7) {
        level = 'excellent'
        message = 'Excellent contrast - QR code will scan perfectly'
        isGood = true
    } else if (ratio >= 4.5) {
        level = 'good'
        message = 'Good contrast - QR code should scan reliably'
        isGood = true
    } else if (ratio >= MIN_QR_CONTRAST) {
        level = 'acceptable'
        message = 'Acceptable contrast - QR code may scan in good lighting'
        isGood = true
    } else {
        level = 'poor'
        message = 'Poor contrast - QR code may not scan reliably!'
        isGood = false
    }

    return { ratio, isGood, level, message }
}
