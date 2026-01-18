/**
 * Finance Types
 * All monetary values are in MINOR units (QAR * 100)
 */

export type PeriodType = 'month' | 'quarter' | 'year'

export interface Period {
    type: PeriodType
    start: Date
    end: Date
    label: string
}

export interface FinancialMetrics {
    revenue: number          // Total revenue from completed orders
    cogs: number | null      // Cost of goods sold (null if unavailable)
    grossProfit: number | null // Revenue - COGS
    expenses: number         // Total expenses
    netProfit: number        // Gross Profit - Expenses (or Revenue - Expenses if no COGS)
    orderCount: number
    aov: number              // Average order value
}

export interface FinancialComparison {
    current: FinancialMetrics
    previous: FinancialMetrics
    changes: {
        revenue: number      // % change
        expenses: number
        netProfit: number
        orderCount: number
        aov: number
    }
}

export interface RevenueBySource {
    source: 'shopify' | 'whatsapp' | 'website' | 'walk_in'
    amount: number
    percentage: number
    orderCount: number
}

export interface ExpenseByCategory {
    category: string
    amount: number
    percentage: number
}

export interface TimeSeriesPoint {
    period: string           // Label like "Jan" or "2025-01"
    date: Date
    revenue: number
    expenses: number
    grossProfit: number | null
    netProfit: number
}

export interface ProfitByProduct {
    productName: string
    revenue: number
    cost: number | null
    profit: number | null
    quantity: number
}

// Query parameters
export interface FinanceQueryParams {
    periodType: PeriodType
    year: number
    month?: number           // 1-12
    quarter?: number         // 1-4
}
