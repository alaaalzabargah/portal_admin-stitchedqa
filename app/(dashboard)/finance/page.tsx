'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/context'
import {
    PeriodType,
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
import { TrendingUp, AlertCircle, FileDown } from 'lucide-react'
import { useDialog } from '@/lib/dialog'
import { PageHeader } from '@/components/ui/PageHeader'

export default function FinancePage() {
    const { t } = useLanguage()
    const dialog = useDialog()

    // State
    const [periodType, setPeriodType] = useState<PeriodType>('month')
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [comparison, setComparison] = useState<FinancialComparison | null>(null)
    const [revenueBySource, setRevenueBySource] = useState<RevenueBySource[]>([])
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([])
    const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])

    // Derived State
    const currentPeriodLabel = (() => {
        let date: Date
        if (periodType === 'month') {
            date = new Date(year, month - 1, 1)
        } else if (periodType === 'quarter') {
            date = new Date(year, (quarter - 1) * 3, 1)
        } else {
            date = new Date(year, 0, 1)
        }
        return getPeriodForDate(periodType, date).label
    })()

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            // Determine date for building the period
            let date: Date
            if (periodType === 'month') {
                date = new Date(year, month - 1, 1)
            } else if (periodType === 'quarter') {
                date = new Date(year, (quarter - 1) * 3, 1)
            } else {
                date = new Date(year, 0, 1)
            }

            const currentPeriod = getPeriodForDate(periodType, date)
            const previousPeriod = getPreviousPeriod(currentPeriod)
            const subPeriods = getSubPeriods(currentPeriod)

            // Parallel fetching (only what's needed for dashboard display)
            const [currentMetrics, previousMetrics, sourceData, categoryData, seriesData, topProductsData] = await Promise.all([
                fetchFinancialMetrics(supabase, currentPeriod),
                fetchFinancialMetrics(supabase, previousPeriod),
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
    }, [periodType, year, month, quarter])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handlePeriodChange = useCallback((params: { periodType: PeriodType; year: number; month?: number; quarter?: number }) => {
        setPeriodType(params.periodType)
        setYear(params.year)
        if (params.month !== undefined) setMonth(params.month)
        if (params.quarter !== undefined) setQuarter(params.quarter)
    }, [])

    // Removed handleExport - now done inline in buttons with on-demand data fetching

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

            {/* Period Selector */}
            <div className="flex justify-center">
                <PeriodSelector
                    periodType={periodType}
                    year={year}
                    month={month}
                    quarter={quarter}
                    onPeriodChange={handlePeriodChange}
                />
            </div>

            {/* Export Buttons - Below Filter, Same Width */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={async (e) => {
                        if (!comparison?.current || timeSeries.length === 0) return
                        try {
                            const btn = e.currentTarget
                            btn.disabled = true
                            btn.innerHTML = '<svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Loading...</span>'

                            const supabase = createClient()
                            const currentPeriod = getPeriodForDate(periodType, new Date(year, periodType === 'month' ? month - 1 : periodType === 'quarter' ? (quarter - 1) * 3 : 0, 1))
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
                            const currentPeriod = getPeriodForDate(periodType, new Date(year, periodType === 'month' ? month - 1 : periodType === 'quarter' ? (quarter - 1) * 3 : 0, 1))
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

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Row 1: Key Financials */}
                <KPICard
                    label={t('finance.revenue')}
                    value={comparison?.current.revenue ?? null}
                    changePercent={comparison?.changes.revenue}
                    type="currency"
                    loading={loading}
                    variant="revenue"
                />

                <KPICard
                    label={t('finance.net_profit')}
                    value={comparison?.current.netProfit ?? null}
                    changePercent={comparison?.changes.netProfit}
                    type="currency"
                    highlighted
                    loading={loading}
                    variant="profit"
                />

                {/* Row 2: Costs & Volume */}
                <KPICard
                    label={t('finance.expenses')}
                    value={comparison?.current.expenses ?? null}
                    changePercent={comparison?.changes.expenses}
                    type="currency"
                    loading={loading}
                    variant="expense"
                />

                <KPICard
                    label={t('finance.orders')}
                    value={comparison?.current.orderCount ?? null}
                    changePercent={comparison?.changes.orderCount}
                    type="number"
                    loading={loading}
                    variant="orders"
                    href="/finance/orders"
                />

                {/* Row 3: Efficiency */}
                <KPICard
                    label={t('finance.aov')}
                    value={comparison?.current.aov ?? null}
                    changePercent={comparison?.changes.aov}
                    type="currency"
                    loading={loading}
                />

                <KPICard
                    label={t('finance.margin')}
                    value={
                        comparison?.current.revenue && comparison.current.netProfit
                            ? (comparison.current.netProfit / comparison.current.revenue) * 100
                            : null
                    }
                    type="percentage"
                    loading={loading}
                    variant="profit"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Combined P&L Overview */}
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

                {/* Revenue by Source - Pie Chart */}
                <FinanceChart
                    title={t('finance.breakdown_by_source')}
                    data={revenueBySource.map(s => ({ name: t(`finance.${s.source}`) || s.source, value: s.amount }))}
                    type="pie"
                    loading={loading}
                />

                {/* Revenue Trend */}
                <FinanceChart
                    title={t('finance.revenue_trend') || `${t('finance.revenue')} Trend`}
                    data={timeSeries.map(p => ({ name: p.period, value: p.revenue }))}
                    type="area"
                    loading={loading}
                    variant="profit"
                />

                {/* Top Selling Products */}
                <TopProductsList
                    data={topProducts}
                    loading={loading}
                />
            </div>
        </div>
    )
}
