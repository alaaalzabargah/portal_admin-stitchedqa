/**
 * Finance Data Queries
 * Server-side Supabase queries for financial data
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Period, FinancialMetrics, RevenueBySource, ExpenseByCategory, TimeSeriesPoint } from './types'
import { toISORange } from './periods'
import { aggregateMetrics, calculateShare } from './calculations'

// Valid order statuses for revenue calculation
const REVENUE_STATUSES = ['paid', 'completed', 'shipped']

/**
 * Fetch financial metrics for a period
 */
export async function fetchFinancialMetrics(
    supabase: SupabaseClient,
    period: Period
): Promise<FinancialMetrics> {
    const range = toISORange(period)

    // Fetch completed orders (including shipping)
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount_minor, total_shipping_minor')
        .gte('created_at', range.start)
        .lte('created_at', range.end)
        .in('status', REVENUE_STATUSES)

    if (ordersError) {
        console.error('[Finance] Error fetching orders:', ordersError.message)
        throw new Error('Failed to fetch orders')
    }

    // Fetch expenses
    const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_minor')
        .gte('incurred_at', range.start)
        .lte('incurred_at', range.end)

    if (expensesError) {
        console.error('[Finance] Error fetching expenses:', expensesError.message)
        throw new Error('Failed to fetch expenses')
    }

    // Fetch order items for COGS (if available)
    const orderIds = orders?.map(o => o.id) || []
    let orderItems: { quantity: number; unit_cost_minor: number | null }[] = []

    if (orderIds.length > 0) {
        const { data: items } = await supabase
            .from('order_items')
            .select('quantity, unit_cost_minor')
            .in('order_id', orderIds)

        if (items) {
            orderItems = items
        }
    }

    return aggregateMetrics(orders || [], expenses || [], orderItems)
}

/**
 * Fetch revenue breakdown by source
 */
export async function fetchRevenueBySource(
    supabase: SupabaseClient,
    period: Period
): Promise<RevenueBySource[]> {
    const range = toISORange(period)

    const { data, error } = await supabase
        .from('orders')
        .select('source, total_amount_minor, total_shipping_minor')
        .gte('created_at', range.start)
        .lte('created_at', range.end)
        .in('status', REVENUE_STATUSES)

    if (error) {
        console.error('[Finance] Error fetching revenue by source:', error.message)
        throw new Error('Failed to fetch revenue by source')
    }

    // Aggregate by source (including shipping)
    const sourceMap = new Map<string, { amount: number; count: number }>()
    let totalRevenue = 0

    for (const order of data || []) {
        const source = order.source || 'walk_in'
        const orderRevenue = order.total_amount_minor + (order.total_shipping_minor || 0)
        const existing = sourceMap.get(source) || { amount: 0, count: 0 }
        existing.amount += orderRevenue
        existing.count += 1
        sourceMap.set(source, existing)
        totalRevenue += orderRevenue
    }

    const result: RevenueBySource[] = []
    for (const [source, data] of sourceMap.entries()) {
        result.push({
            source: source as RevenueBySource['source'],
            amount: data.amount,
            percentage: calculateShare(data.amount, totalRevenue) / 100,
            orderCount: data.count
        })
    }

    return result.sort((a, b) => b.amount - a.amount)
}

/**
 * Fetch expenses breakdown by category
 */
export async function fetchExpensesByCategory(
    supabase: SupabaseClient,
    period: Period
): Promise<ExpenseByCategory[]> {
    const range = toISORange(period)

    const { data, error } = await supabase
        .from('expenses')
        .select('category, amount_minor')
        .gte('incurred_at', range.start)
        .lte('incurred_at', range.end)

    if (error) {
        console.error('[Finance] Error fetching expenses by category:', error.message)
        throw new Error('Failed to fetch expenses by category')
    }

    // Aggregate by category
    const categoryMap = new Map<string, number>()
    let totalExpenses = 0

    for (const expense of data || []) {
        const category = expense.category || 'Other'
        const existing = categoryMap.get(category) || 0
        categoryMap.set(category, existing + expense.amount_minor)
        totalExpenses += expense.amount_minor
    }

    const result: ExpenseByCategory[] = []
    for (const [category, amount] of categoryMap.entries()) {
        result.push({
            category,
            amount,
            percentage: calculateShare(amount, totalExpenses) / 100
        })
    }

    return result.sort((a, b) => b.amount - a.amount)
}

/**
 * Fetch time series data for charts
 */
export async function fetchTimeSeries(
    supabase: SupabaseClient,
    periods: Period[]
): Promise<TimeSeriesPoint[]> {
    const results: TimeSeriesPoint[] = []

    for (const period of periods) {
        const metrics = await fetchFinancialMetrics(supabase, period)
        results.push({
            period: period.label,
            date: period.start,
            revenue: metrics.revenue,
            expenses: metrics.expenses,
            grossProfit: metrics.grossProfit,
            netProfit: metrics.netProfit
        })
    }

    return results
}

/**
 * Fetch detailed orders for export
 */
export async function fetchDetailedOrders(
    supabase: SupabaseClient,
    period: Period
) {
    const range = toISORange(period)

    const { data, error } = await supabase
        .from('orders')
        .select(`
            id,
            shopify_order_number,
            created_at,
            status,
            source,
            total_amount_minor,
            total_shipping_minor,
            total_tax_minor,
            customer:customer_id (
                id,
                full_name,
                email,
                phone
            ),
            order_items (
                id,
                product_name,
                variant_title,
                quantity,
                unit_price_minor,
                size,
                color,
                measurements
            )
        `)
        .gte('created_at', range.start)
        .lte('created_at', range.end)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[Finance] Error fetching detailed orders:', error.message)
        throw new Error('Failed to fetch detailed orders')
    }

    return data || []
}
