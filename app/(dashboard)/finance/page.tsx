'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/context'
import {
    PeriodType,
    CompareMode,
    FinancialComparison,
    getCurrentPeriod,
    getPreviousPeriod,
    getSubPeriods,
    fetchFinancialMetrics,
    buildComparison,
    fetchRevenueBySource,
    fetchExpensesByCategory,
    fetchTimeSeries,
    fetchDetailedOrders,
    RevenueBySource,
    ExpenseByCategory,
    getPeriodForDate,
    createCustomPeriod,
    TimeSeriesPoint,
    exportToCSV,
    exportToExcel,
    exportToPDF,
    fetchTopProducts,
    type TopProduct
} from '@/lib/finance'
import { PeriodSelector } from '@/components/finance/PeriodSelector'
import { KPICard } from '@/components/finance/KPICard'
import { FinanceChart } from '@/components/finance/FinanceChart'
import { TopProductsList } from '@/components/finance/TopProductsList'
import { TrendingUp, AlertCircle, FileDown, Landmark, BadgePercent, Receipt } from 'lucide-react'
import { useDialog } from '@/lib/dialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { subMonths } from 'date-fns'

export default function FinancePage() {
    const { t } = useLanguage()
    const dialog = useDialog()

    // State
    const [periodType, setPeriodType] = useState<PeriodType>('month')
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
    const [customStart, setCustomStart] = useState<Date>(subMonths(new Date(), 1))
    const [customEnd, setCustomEnd] = useState<Date>(new Date())
    const [compareMode, setCompareMode] = useState<CompareMode>('previous')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [comparison, setComparison] = useState<FinancialComparison | null>(null)
    const [revenueBySource, setRevenueBySource] = useState<RevenueBySource[]>([])
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([])
    const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
    const [previousPeriodLabel, setPreviousPeriodLabel] = useState<string>('')

    // Build current period
    const currentPeriod = useMemo(() => {
        if (periodType === 'custom') {
            return createCustomPeriod(customStart, customEnd)
        }
        let date: Date
        if (periodType === 'month') {
            date = new Date(year, month - 1, 1)
        } else if (periodType === 'quarter') {
            date = new Date(year, (quarter - 1) * 3, 1)
        } else if (periodType === 'all_time') {
            date = new Date()
        } else {
            date = new Date(year, 0, 1)
        }
        return getPeriodForDate(periodType, date)
    }, [periodType, year, month, quarter, customStart, customEnd])

    const currentPeriodLabel = currentPeriod.label

    // Compute margin change for the profit margin card
    const currentMargin = comparison?.current.revenue
        ? (comparison.current.netProfit / comparison.current.revenue) * 100
        : null
    const previousMargin = comparison?.previous.revenue
        ? (comparison.previous.netProfit / comparison.previous.revenue) * 100
        : null
    const marginChange = currentMargin !== null && previousMargin !== null && previousMargin !== 0
        ? ((currentMargin - previousMargin) / Math.abs(previousMargin)) * 100
        : undefined

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()

            const prevPeriod = getPreviousPeriod(currentPeriod, compareMode)
            setPreviousPeriodLabel(prevPeriod.label)
            const subPeriods = getSubPeriods(currentPeriod)

            const [currentMetrics, previousMetrics, sourceData, categoryData, seriesData, topProductsData] = await Promise.all([
                fetchFinancialMetrics(supabase, currentPeriod),
                fetchFinancialMetrics(supabase, prevPeriod),
                fetchRevenueBySource(supabase, currentPeriod),
                fetchExpensesByCategory(supabase, currentPeriod),
                fetchTimeSeries(supabase, subPeriods),
                fetchTopProducts(supabase, currentPeriod)
            ])

            setComparison(buildComparison(currentMetrics, previousMetrics))
            setRevenueBySource(sourceData)
            setExpensesByCategory(categoryData)
            setTimeSeries(seriesData)
            setTopProducts(topProductsData)

        } catch (err: any) {
            console.error('Error fetching finance data:', err)
            setError(err.message || 'Failed to load financial data')
        } finally {
            setLoading(false)
        }
    }, [currentPeriod, compareMode])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handlePeriodChange = useCallback((params: {
        periodType: PeriodType
        year: number
        month?: number
        quarter?: number
        customStart?: Date
        customEnd?: Date
    }) => {
        setPeriodType(params.periodType)
        setYear(params.year)
        if (params.month !== undefined) setMonth(params.month)
        if (params.quarter !== undefined) setQuarter(params.quarter)
        if (params.customStart) setCustomStart(params.customStart)
        if (params.customEnd) setCustomEnd(params.customEnd)
    }, [])

    // Build revenue by source time series data
    const sourceTimeSeriesData = useMemo(() => {
        if (timeSeries.length === 0) return { data: [], keys: [] as string[] }
        // Collect all source keys
        const sourceKeys = new Set<string>()
        timeSeries.forEach(p => {
            Object.keys(p.revenueBySource).forEach(k => sourceKeys.add(k))
        })
        const keys = Array.from(sourceKeys)
        const data = timeSeries.map(p => {
            const point: { name: string; [key: string]: string | number } = { name: p.period }
            for (const key of keys) {
                point[key] = p.revenueBySource[key] || 0
            }
            return point
        })
        return { data, keys }
    }, [timeSeries])

    // Build expense category time series data
    const expenseTimeSeriesData = useMemo(() => {
        if (timeSeries.length === 0) return { data: [], keys: [] as string[] }
        const catKeys = new Set<string>()
        timeSeries.forEach(p => {
            Object.keys(p.expensesByCategory).forEach(k => catKeys.add(k))
        })
        const keys = Array.from(catKeys)
        const data = timeSeries.map(p => {
            const point: { name: string; [key: string]: string | number } = { name: p.period }
            for (const key of keys) {
                point[key] = p.expensesByCategory[key] || 0
            }
            return point
        })
        return { data, keys }
    }, [timeSeries])

    // Build deposit vs direct orders time series (3 categories)
    const depositTimeSeriesData = useMemo(() => {
        return timeSeries.map(p => ({
            name: p.period,
            'Deposit (Outstanding)': p.depositOrders - p.collectedDeposits,
            'Deposit (Collected)': p.collectedDeposits,
            'Direct Orders': p.directOrders,
        }))
    }, [timeSeries])

    if (error) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[50vh]">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-serif text-primary mb-2">{t('finance.error')}</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <button
                    onClick={loadData}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                label="FINANCE"
                title={t('finance.title')}
                subtitle={t('finance.subtitle')}
            />

            {/* Period Selector + Compare Mode */}
            <div className="flex justify-center">
                <PeriodSelector
                    periodType={periodType}
                    year={year}
                    month={month}
                    quarter={quarter}
                    customStart={customStart}
                    customEnd={customEnd}
                    compareMode={compareMode}
                    previousPeriodLabel={previousPeriodLabel}
                    onPeriodChange={handlePeriodChange}
                    onCompareModeChange={setCompareMode}
                />
            </div>

            {/* Export Buttons */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={async (e) => {
                        if (!comparison?.current || timeSeries.length === 0) return
                        try {
                            const btn = e.currentTarget
                            btn.disabled = true
                            btn.innerHTML = '<svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Loading...</span>'

                            const supabase = createClient()
                            const ordersData = await fetchDetailedOrders(supabase, currentPeriod)
                            await exportToExcel(currentPeriodLabel, comparison.current, timeSeries, ordersData)

                            btn.innerHTML = '<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Excel Report</span>'
                            btn.disabled = false
                        } catch (error) {
                            console.error('Export failed:', error)
                            await dialog.alert('Failed to export report. Please try again.', 'Export Failed')
                        }
                    }}
                    disabled={loading || !comparison}
                    className="flex-1 max-w-xs flex items-center justify-center gap-2 glass-panel px-4 py-2.5 rounded-lg hover:shadow-md transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export detailed report with multiple sheets"
                >
                    <FileDown className="w-4 h-4" />
                    <span>Excel Report</span>
                </button>

                <button
                    onClick={async (e) => {
                        if (!comparison?.current || timeSeries.length === 0) return
                        try {
                            const btn = e.currentTarget
                            btn.disabled = true
                            btn.innerHTML = '<svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Loading...</span>'

                            const supabase = createClient()
                            const ordersData = await fetchDetailedOrders(supabase, currentPeriod)
                            await exportToPDF(currentPeriodLabel, comparison.current, timeSeries, ordersData)

                            btn.innerHTML = '<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>PDF Summary</span>'
                            btn.disabled = false
                        } catch (error) {
                            console.error('Export failed:', error)
                            await dialog.alert('Failed to export report. Please try again.', 'Export Failed')
                        }
                    }}
                    disabled={loading || !comparison}
                    className="flex-1 max-w-xs flex items-center justify-center gap-2 glass-panel px-4 py-2.5 rounded-lg hover:shadow-md transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export visual summary report as PDF"
                >
                    <FileDown className="w-4 h-4" />
                    <span>PDF Summary</span>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════
                SECTION 1: Key Financial KPIs
            ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KPICard
                    label={t('finance.revenue')}
                    value={comparison?.current.revenue ?? null}
                    changePercent={comparison?.changes.revenue !== undefined ? comparison.changes.revenue / 100 : undefined}
                    type="currency"
                    loading={loading}
                    variant="revenue"
                />

                <KPICard
                    label={t('finance.net_profit')}
                    value={comparison?.current.netProfit ?? null}
                    changePercent={comparison?.changes.netProfit !== undefined ? comparison.changes.netProfit / 100 : undefined}
                    type="currency"
                    highlighted
                    loading={loading}
                    variant="profit"
                />

                <KPICard
                    label={t('finance.expenses')}
                    value={comparison?.current.expenses ?? null}
                    changePercent={comparison?.changes.expenses !== undefined ? comparison.changes.expenses / 100 : undefined}
                    type="currency"
                    loading={loading}
                    variant="expense"
                />

                <KPICard
                    label={t('finance.margin')}
                    value={currentMargin}
                    changePercent={marginChange}
                    type="percentage"
                    loading={loading}
                    variant="profit"
                    icon={BadgePercent}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════
                SECTION 2: Orders & Deposit KPIs
            ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KPICard
                    label={t('finance.orders')}
                    value={comparison?.current.orderCount ?? null}
                    changePercent={comparison?.changes.orderCount !== undefined ? comparison.changes.orderCount / 100 : undefined}
                    type="number"
                    loading={loading}
                    variant="orders"
                    href="/finance/orders"
                />

                <KPICard
                    label={t('finance.aov')}
                    value={comparison?.current.aov ?? null}
                    changePercent={comparison?.changes.aov !== undefined ? comparison.changes.aov / 100 : undefined}
                    type="currency"
                    loading={loading}
                />

                <KPICard
                    label="Total Deposit Orders"
                    value={comparison?.current.depositOrderCount ?? null}
                    changePercent={comparison?.changes.depositOrderCount !== undefined ? comparison.changes.depositOrderCount / 100 : undefined}
                    type="number"
                    loading={loading}
                    variant="orders"
                    icon={Landmark}
                    href="/finance/orders"
                />

                <KPICard
                    label="Outstanding Deposits"
                    value={comparison?.current.outstandingDeposits ?? null}
                    changePercent={comparison?.changes.outstandingDeposits !== undefined ? comparison.changes.outstandingDeposits / 100 : undefined}
                    type="number"
                    loading={loading}
                    variant="expense"
                    icon={Receipt}
                />
            </div>

            {/* Deposit Collection Rate — inline mini-stat */}
            {comparison && comparison.current.depositOrderCount > 0 && (
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-3 bg-white/65 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-3 shadow-sm text-sm">
                        <span className="text-gray-500 uppercase text-[10px] font-semibold tracking-wider">Deposit Collection Rate</span>
                        <span className="font-mono font-bold text-lg text-emerald-700">
                            {((comparison.current.collectedDeposits / comparison.current.depositOrderCount) * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-gray-400">
                            ({comparison.current.collectedDeposits} of {comparison.current.depositOrderCount} collected)
                        </span>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                SECTION 3: Primary Charts
            ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* P&L Overview — Line Chart */}
                <FinanceChart
                    title={t('finance.pl_overview') || 'P&L Overview'}
                    data={timeSeries.map(p => ({
                        name: p.period,
                        [t('finance.revenue')]: p.revenue,
                        [t('finance.expenses')]: p.expenses,
                        [t('finance.net_profit')]: p.netProfit
                    }))}
                    type="line"
                    dataKeys={[t('finance.revenue'), t('finance.expenses'), t('finance.net_profit')]}
                    loading={loading}
                />

                {/* Revenue by Source — Horizontal Bar */}
                <FinanceChart
                    title={t('finance.breakdown_by_source')}
                    data={revenueBySource.map(s => ({
                        name: t(`finance.${s.source}`) || s.source,
                        value: s.amount
                    }))}
                    type="horizontal_bar"
                    loading={loading}
                />



                {/* Expenses Trend — Area Chart */}
                <FinanceChart
                    title="Expenses Trend"
                    data={timeSeries.map(p => ({ name: p.period, value: p.expenses }))}
                    type="area"
                    loading={loading}
                    variant="expense"
                />

                {/* Deposit vs Direct Orders — Stacked Bar over time */}
                <FinanceChart
                    title="Deposit vs Direct Orders"
                    data={depositTimeSeriesData}
                    type="stacked_bar"
                    dataKeys={['Deposit (Outstanding)', 'Deposit (Collected)', 'Direct Orders']}
                    loading={loading}
                    colors={['#D4AF37', '#10B981', '#A78B5A']}
                    valueType="count"
                />

                {/* Revenue by Source over time — Stacked Area */}
                {sourceTimeSeriesData.keys.length > 0 && (
                    <FinanceChart
                        title="Revenue by Channel (Trend)"
                        data={sourceTimeSeriesData.data}
                        type="stacked_area"
                        dataKeys={sourceTimeSeriesData.keys}
                        loading={loading}
                    />
                )}

                {/* Top Selling Products */}
                <TopProductsList
                    data={topProducts}
                    loading={loading}
                />

                {/* Expenses by Category over time — Stacked Area (if categories exist) */}
                {expenseTimeSeriesData.keys.length > 0 && (
                    <FinanceChart
                        title="Expenses by Category (Trend)"
                        data={expenseTimeSeriesData.data}
                        type="stacked_area"
                        dataKeys={expenseTimeSeriesData.keys}
                        loading={loading}
                        variant="expense"
                    />
                )}
            </div>
        </div>
    )
}
