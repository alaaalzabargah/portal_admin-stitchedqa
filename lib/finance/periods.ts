/**
 * Period Utilities
 * Handles date range calculations for financial periods
 */

import { Period, PeriodType, CompareMode, FinanceQueryParams } from './types'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, format, endOfDay, differenceInDays, subDays, eachWeekOfInterval, startOfWeek, endOfWeek, eachMonthOfInterval } from 'date-fns'

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
        case 'all_time':
            return {
                type,
                // Arbitrary start date far in the past to capture all records
                start: new Date(2000, 0, 1),
                end: endOfDay(new Date()),
                label: 'All Time'
            }
        case 'custom':
            // Custom periods are constructed directly, not via getPeriodForDate
            // This fallback returns a single-day period for the given date
            return {
                type,
                start: date,
                end: endOfDay(date),
                label: format(date, 'MMM d, yyyy')
            }
    }
}

/**
 * Create a custom period from explicit start/end dates
 */
export function createCustomPeriod(start: Date, end: Date): Period {
    return {
        type: 'custom',
        start,
        end: endOfDay(end),
        label: `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
    }
}

/**
 * Get the previous period for comparison
 */
export function getPreviousPeriod(current: Period, compareMode: CompareMode = 'previous'): Period {
    if (compareMode === 'yoy') {
        // Year-over-year: same period but one year ago
        const yoyStart = subYears(current.start, 1)
        const yoyEnd = subYears(current.end, 1)
        return {
            type: current.type,
            start: yoyStart,
            end: yoyEnd,
            label: current.type === 'custom'
                ? `${format(yoyStart, 'MMM d, yyyy')} – ${format(yoyEnd, 'MMM d, yyyy')}`
                : getPeriodForDate(current.type, yoyStart).label
        }
    }

    switch (current.type) {
        case 'month':
            return getPeriodForDate('month', subMonths(current.start, 1))
        case 'quarter':
            return getPeriodForDate('quarter', subQuarters(current.start, 1))
        case 'year':
            return getPeriodForDate('year', subYears(current.start, 1))
        case 'custom': {
            // For custom ranges, shift back by the same number of days
            const days = differenceInDays(current.end, current.start)
            const prevEnd = subDays(current.start, 1)
            const prevStart = subDays(prevEnd, days)
            return {
                type: 'custom',
                start: prevStart,
                end: endOfDay(prevEnd),
                label: `${format(prevStart, 'MMM d, yyyy')} – ${format(prevEnd, 'MMM d, yyyy')}`
            }
        }
        case 'all_time':
            return current
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
        case 'all_time':
            return getPeriodForDate('all_time', new Date())
        case 'custom':
            return getPeriodForDate('custom', new Date(year, 0, 1))
    }
}

/**
 * Get list of sub-periods for breakdown
 * Monthly -> days, Quarterly -> months, Yearly -> months
 */
export function getSubPeriods(period: Period): Period[] {
    const periods: Period[] = []

    // Cap the effective end at today so we never show future empty days/months
    const today = endOfDay(new Date())
    const effectiveEnd = period.end > today ? today : period.end

    // If the entire period is in the future, return empty
    if (period.start > today) return periods

    switch (period.type) {
        case 'month':
            // Return each day up to today (not future days)
            const day = new Date(period.start)
            while (day <= effectiveEnd) {
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
            // Return each month up to today
            let month = new Date(period.start)
            const monthPeriods: Period[] = []
            while (month <= effectiveEnd) {
                monthPeriods.push(getPeriodForDate('month', month))
                month = new Date(month.setMonth(month.getMonth() + 1))
            }
            // If only 1 month exists (e.g. start of a new quarter), show days instead
            if (monthPeriods.length <= 1) {
                const dayStart = new Date(period.start)
                while (dayStart <= effectiveEnd) {
                    periods.push({
                        type: period.type,
                        start: new Date(dayStart),
                        end: endOfDay(dayStart),
                        label: format(dayStart, 'd MMM')
                    })
                    dayStart.setDate(dayStart.getDate() + 1)
                }
            } else {
                periods.push(...monthPeriods)
            }
            break
        case 'all_time':
            // Return each year
            let startY = 2024
            let endY = effectiveEnd.getFullYear()
            for (let y = startY; y <= endY; y++) {
                periods.push(getPeriodForDate('year', new Date(y, 0, 1)))
            }
            break
        case 'custom': {
            // Smart sub-period selection based on range length
            const days = differenceInDays(effectiveEnd, period.start)
            if (days <= 31) {
                // Short range: show each day
                const day = new Date(period.start)
                while (day <= effectiveEnd) {
                    periods.push({
                        type: 'custom',
                        start: new Date(day),
                        end: endOfDay(day),
                        label: format(day, 'd MMM')
                    })
                    day.setDate(day.getDate() + 1)
                }
            } else if (days <= 180) {
                // Medium range: show each week
                const weeks = eachWeekOfInterval({ start: period.start, end: effectiveEnd })
                for (const weekStart of weeks) {
                    const wEnd = endOfWeek(weekStart)
                    periods.push({
                        type: 'custom',
                        start: weekStart < period.start ? period.start : weekStart,
                        end: wEnd > effectiveEnd ? effectiveEnd : endOfDay(wEnd),
                        label: format(weekStart < period.start ? period.start : weekStart, 'd MMM')
                    })
                }
            } else {
                // Long range: show each month
                const months = eachMonthOfInterval({ start: period.start, end: effectiveEnd })
                for (const m of months) {
                    periods.push(getPeriodForDate('month', m))
                }
            }
            break
        }
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
