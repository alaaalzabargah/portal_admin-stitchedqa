/**
 * Financial Calculations
 * Pure functions with NO floating point arithmetic
 * All values are in MINOR units (QAR * 100)
 */

import { FinancialMetrics, FinancialComparison } from './types'

/**
 * Calculate gross profit
 * Returns null if COGS is unavailable
 */
export function calculateGrossProfit(revenue: number, cogs: number | null): number | null {
    if (cogs === null) return null
    return revenue - cogs
}

/**
 * Calculate net profit
 * If COGS is unavailable, uses Revenue - Expenses
 */
export function calculateNetProfit(revenue: number, cogs: number | null, expenses: number): number {
    const grossProfit = calculateGrossProfit(revenue, cogs)
    if (grossProfit !== null) {
        return grossProfit - expenses
    }
    // Fallback: Revenue - Expenses (no COGS)
    return revenue - expenses
}

/**
 * Calculate average order value
 */
export function calculateAOV(revenue: number, orderCount: number): number {
    if (orderCount === 0) return 0
    // Integer division to avoid floating point
    return Math.round(revenue / orderCount)
}

/**
 * Calculate profit margin as basis points (100 = 1%)
 * Returns null if unavailable
 */
export function calculateMarginBasisPoints(profit: number | null, revenue: number): number | null {
    if (profit === null || revenue === 0) return null
    return Math.round((profit / revenue) * 10000)
}

/**
 * Convert basis points to percentage string
 */
export function basisPointsToPercent(bps: number | null): string {
    if (bps === null) return 'N/A'
    return (bps / 100).toFixed(1) + '%'
}

/**
 * Calculate percentage change between two values
 * Returns change as basis points
 */
export function calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) {
        return current > 0 ? 10000 : 0 // 100% or 0%
    }
    return Math.round(((current - previous) / Math.abs(previous)) * 10000)
}

/**
 * Build financial comparison between two periods
 */
export function buildComparison(current: FinancialMetrics, previous: FinancialMetrics): FinancialComparison {
    return {
        current,
        previous,
        changes: {
            revenue: calculatePercentChange(current.revenue, previous.revenue),
            expenses: calculatePercentChange(current.expenses, previous.expenses),
            netProfit: calculatePercentChange(current.netProfit, previous.netProfit),
            orderCount: calculatePercentChange(current.orderCount, previous.orderCount),
            aov: calculatePercentChange(current.aov, previous.aov)
        }
    }
}

/**
 * Aggregate financial metrics from raw data
 */
export function aggregateMetrics(
    orders: { total_amount_minor: number; total_shipping_minor?: number }[],
    expenses: { amount_minor: number }[],
    orderItems: { quantity: number; unit_cost_minor: number | null }[] = []
): FinancialMetrics {
    // Calculate revenue (including shipping fees)
    const revenue = orders.reduce((sum, o) =>
        sum + o.total_amount_minor + (o.total_shipping_minor || 0), 0)

    // Calculate shipping total (for expenses)
    const shippingExpenses = orders.reduce((sum, o) =>
        sum + (o.total_shipping_minor || 0), 0)

    // Calculate COGS if available
    let cogs: number | null = null
    const itemsWithCost = orderItems.filter(item => item.unit_cost_minor !== null)
    if (itemsWithCost.length > 0) {
        cogs = itemsWithCost.reduce((sum, item) => sum + (item.quantity * (item.unit_cost_minor || 0)), 0)
    }

    // Calculate expenses (shipping + other expenses)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount_minor, 0) + shippingExpenses

    // Calculate derived metrics
    const grossProfit = calculateGrossProfit(revenue, cogs)
    const netProfit = calculateNetProfit(revenue, cogs, totalExpenses)
    const orderCount = orders.length
    const aov = calculateAOV(revenue, orderCount)

    return {
        revenue,
        cogs,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
        orderCount,
        aov
    }
}

/**
 * Calculate percentage share for breakdowns
 */
export function calculateShare(value: number, total: number): number {
    if (total === 0) return 0
    return Math.round((value / total) * 10000) // basis points
}
