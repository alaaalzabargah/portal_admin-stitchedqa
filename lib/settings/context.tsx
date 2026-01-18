'use client'

/**
 * Currency Context
 * Provides currency configuration throughout the app
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Currency } from './types'
import { getCurrency } from './queries'

interface CurrencyContextType {
    currency: Currency
    refreshCurrency: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrency] = useState<Currency>({
        code: 'QAR',
        symbol: 'ر.ق',
        name: 'Qatari Riyal',
        decimal_places: 2
    })

    const supabase = createClient()

    const loadCurrency = async () => {
        const currencyData = await getCurrency(supabase)
        requestAnimationFrame(() => setCurrency(currencyData))
    }

    useEffect(() => {
        loadCurrency()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const refreshCurrency = async () => {
        await loadCurrency()
    }

    return (
        <CurrencyContext.Provider value={{ currency, refreshCurrency }}>
            {children}
        </CurrencyContext.Provider>
    )
}

export function useCurrency() {
    const context = useContext(CurrencyContext)
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider')
    }
    return context
}
