/**
 * Period Utilities
 * Handles date range calculations for financial periods
 */

import { Period, PeriodType, FinanceQueryParams } from './types'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, format, endOfDay } from 'date-fns'

/**
 * Get the current period based on type
 */
export function getCurrentPeriod(type: PeriodType): Period {
    const now = new Date()
    return getPeriodForDate(type, now)
}

/**
 * Get period for a specific date
 */
export function getPeriodForDate(type: PeriodType, date: Date): Period {
    switch (type) {
        case 'month':
            return {
                type,
                start: startOfMonth(date),
                end: endOfMonth(date),
                label: format(date, 'MMMM yyyy')
            }
        case 'quarter':
            const quarter = Math.ceil((date.getMonth() + 1) / 3)
            return {
                type,
                start: startOfQuarter(date),
                end: endOfQuarter(date),
                label: `Q${quarter} ${format(date, 'yyyy')}`
            }
        case 'year':
            return {
                type,
                start: startOfYear(date),
                end: endOfYear(date),
                label: format(date, 'yyyy')
            }
    }
}

/**
 * Get the previous period for comparison
 */
export function getPreviousPeriod(current: Period): Period {
    switch (current.type) {
        case 'month':
            return getPeriodForDate('month', subMonths(current.start, 1))
        case 'quarter':
            return getPeriodForDate('quarter', subQuarters(current.start, 1))
        case 'year':
            return getPeriodForDate('year', subYears(current.start, 1))
    }
}

/**
 * Get period from query params
 */
export function getPeriodFromParams(params: FinanceQueryParams): Period {
    const { periodType, year, month, quarter } = params

    switch (periodType) {
        case 'month':
            const monthDate = new Date(year, (month || 1) - 1, 1)
            return getPeriodForDate('month', monthDate)
        case 'quarter':
            const quarterMonth = ((quarter || 1) - 1) * 3
            const quarterDate = new Date(year, quarterMonth, 1)
            return getPeriodForDate('quarter', quarterDate)
        case 'year':
            return getPeriodForDate('year', new Date(year, 0, 1))
    }
}

/**
 * Get list of sub-periods for breakdown
 * Monthly -> days, Quarterly -> months, Yearly -> months
 */
export function getSubPeriods(period: Period): Period[] {
    const periods: Period[] = []

    switch (period.type) {
        case 'month':
            // Return each day
            const day = new Date(period.start)
            while (day <= period.end) {
                periods.push({
                    type: 'month',
                    start: new Date(day),
                    end: endOfDay(day),
                    label: format(day, 'd')
                })
                day.setDate(day.getDate() + 1)
            }
            break
        case 'quarter':
        case 'year':
            // Return each month
            let month = new Date(period.start)
            while (month <= period.end) {
                periods.push(getPeriodForDate('month', month))
                month = new Date(month.setMonth(month.getMonth() + 1))
            }
            break
    }

    return periods
}

/**
 * Format date range for SQL queries
 */
export function toISORange(period: Period): { start: string; end: string } {
    return {
        start: period.start.toISOString(),
        end: period.end.toISOString()
    }
}
