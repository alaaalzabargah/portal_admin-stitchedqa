import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format currency with configurable currency code and symbol
 * @param amountMinor - Amount in minor units (e.g., cents, fils)
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @param currencyCode - Currency code (default: 'QAR')
 */
export function formatCurrency(
    amountMinor: number,
    showSymbol: boolean | string = true,
    currencyCode: string = 'QAR'
) {
    const amount = amountMinor / 100

    // If showSymbol is a string, it's the old currencyCode param
    if (typeof showSymbol === 'string') {
        currencyCode = showSymbol
        showSymbol = true
    }

    if (!showSymbol) {
        // Just return the number without symbol
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })
    }

    // Use Intl.NumberFormat with currency
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)
}

/**
 * Get contrast color (black or white) for a given hex background color
 */
export function getContrastColor(hexcolor: string) {
    // If invalid hex, default to black text for safety
    if (!hexcolor || !hexcolor.startsWith('#')) return '#000000';

    // Convert to RGB value
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);

    // Get YIQ ratio
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    // Check contrast
    return (yiq >= 128) ? '#000000' : '#ffffff';
}
