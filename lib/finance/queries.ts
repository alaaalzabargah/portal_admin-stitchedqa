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
 * OPTIMIZED: Batch fetches all data in 4 queries instead of N×3 queries
 */
export async function fetchTimeSeries(
    supabase: SupabaseClient,
    periods: Period[]
): Promise<TimeSeriesPoint[]> {
    if (periods.length === 0) return []

    // Find overall date range spanning all periods - convert to ISO strings for Supabase
    const minDateISO = periods[0].start.toISOString()
    const maxDateISO = periods[periods.length - 1].end.toISOString()

    // OPTIMIZATION: Fetch ALL data for the entire range in batch (3 queries instead of N×3)
    const [orders, expenses] = await Promise.all([
        // Query 1: All orders in the entire date range
        supabase
            .from('orders')
            .select('id, total_amount_minor, total_shipping_minor, created_at')
            .gte('created_at', minDateISO)
            .lte('created_at', maxDateISO)
            .in('status', REVENUE_STATUSES)
            .then(r => {
                if (r.error) {
                    console.error('[Finance] Orders query error:', r.error.message)
                    throw new Error(`Failed to fetch orders: ${r.error.message}`)
                }
                return r.data || []
            }),

        // Query 2: All expenses in the entire date range
        supabase
            .from('expenses')
            .select('amount_minor, incurred_at')
            .gte('incurred_at', minDateISO)
            .lte('incurred_at', maxDateISO)
            .then(r => {
                if (r.error) {
                    console.error('[Finance] Expenses query error:', r.error.message)
                    throw new Error(`Failed to fetch expenses: ${r.error.message}`)
                }
                return r.data || []
            })
    ])

    // Query 3: Fetch all order items for all orders at once
    const orderIds = orders.map(o => o.id)
    let allOrderItems: { order_id: string; quantity: number; unit_cost_minor: number | null }[] = []

    if (orderIds.length > 0) {
        const { data, error } = await supabase
            .from('order_items')
            .select('order_id, quantity, unit_cost_minor')
            .in('order_id', orderIds)

        if (error) {
            console.error('[Finance] Error fetching order items for time series:', error.message)
            // Continue without COGS data rather than failing completely
        } else {
            allOrderItems = data || []
        }
    }

    // Build lookup map: order_id -> items (for fast O(1) access)
    const itemsByOrderMap = new Map<string, typeof allOrderItems>()
    for (const item of allOrderItems) {
        if (!itemsByOrderMap.has(item.order_id)) {
            itemsByOrderMap.set(item.order_id, [])
        }
        itemsByOrderMap.get(item.order_id)!.push(item)
    }

    // Group data by period in memory (fast JavaScript filtering)
    const results: TimeSeriesPoint[] = []

    for (const period of periods) {
        // Convert period dates to ISO for comparison with database strings
        const periodStartISO = period.start.toISOString()
        const periodEndISO = period.end.toISOString()

        // Filter orders for this specific period
        const periodOrders = orders.filter(o =>
            o.created_at >= periodStartISO && o.created_at <= periodEndISO
        )

        // Filter expenses for this specific period
        const periodExpenses = expenses.filter(e =>
            e.incurred_at >= periodStartISO && e.incurred_at <= periodEndISO
        )

        // Get order items for this period's orders
        const periodOrderItems = periodOrders.flatMap(o =>
            itemsByOrderMap.get(o.id) || []
        )

        // Calculate metrics using existing aggregation logic
        const metrics = aggregateMetrics(periodOrders, periodExpenses, periodOrderItems)

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

export interface TopProduct {
    name: string
    revenue: number
    quantity: number
}

/**
 * Fetch top selling products by revenue
 */
export async function fetchTopProducts(
    supabase: SupabaseClient,
    period: Period
): Promise<TopProduct[]> {
    const range = toISORange(period)

    // 1. Fetch valid orders in range
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', range.start)
        .lte('created_at', range.end)
        .in('status', ['paid', 'shipped', 'completed'])

    if (orderError) {
        console.error('[Finance] Error fetching orders for top products:', orderError)
        return []
    }

    if (!orders || orders.length === 0) return []

    const orderIds = orders.map(o => o.id)

    // 2. Fetch order items for these orders
    const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit_price_minor')
        .in('order_id', orderIds)

    if (itemsError) {
        console.error('[Finance] Error fetching order items:', itemsError)
        return []
    }

    // 3. Aggregate in memory
    const productMap = new Map<string, { revenue: number; quantity: number }>()

    for (const item of items || []) {
        const name = item.product_name || 'Unknown Product'
        const current = productMap.get(name) || { revenue: 0, quantity: 0 }

        current.revenue += (item.unit_price_minor || 0) * (item.quantity || 1)
        current.quantity += (item.quantity || 1)

        productMap.set(name, current)
    }

    // 4. Convert to array and sort
    return Array.from(productMap.entries())
        .map(([name, stats]) => ({
            name,
            revenue: stats.revenue,
            quantity: stats.quantity
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
}
