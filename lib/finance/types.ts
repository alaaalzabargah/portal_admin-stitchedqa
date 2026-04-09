/**
 * Finance Types
 * All monetary values are in MINOR units (QAR * 100)
 */

export type PeriodType = 'month' | 'quarter' | 'year' | 'all_time' | 'custom'

export type CompareMode = 'previous' | 'yoy' // previous period or year-over-year

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
    depositOrderCount: number // Orders that were originally deposits (was_deposit=true)
    depositRevenue: number    // Revenue collected from deposits
    outstandingDeposits: number // Deposits still awaiting full payment
    collectedDeposits: number   // Deposits that have been fully paid
    aov: number              // Average order value
}

export interface FinancialComparison {
    current: FinancialMetrics
    previous: FinancialMetrics
    changes: {
        revenue: number      // % change (basis points)
        expenses: number
        netProfit: number
        orderCount: number
        depositOrderCount: number
        depositRevenue: number
        outstandingDeposits: number
        collectedDeposits: number
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
    // Deposit breakdown
    depositOrders: number
    directOrders: number
    collectedDeposits: number  // Deposits that have been converted to fully paid
    // Revenue by source
    revenueBySource: Record<string, number>
    // Expense by category
    expensesByCategory: Record<string, number>
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
