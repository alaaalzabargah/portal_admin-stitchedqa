'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ArrowLeftRight } from 'lucide-react'
import { PeriodType, CompareMode } from '@/lib/finance/types'
import { useLanguage } from '@/lib/i18n/context'
import { format } from 'date-fns'

interface PeriodSelectorProps {
    periodType: PeriodType
    year: number
    month?: number
    quarter?: number
    customStart?: Date
    customEnd?: Date
    compareMode: CompareMode
    previousPeriodLabel?: string
    onPeriodChange: (params: {
        periodType: PeriodType
        year: number
        month?: number
        quarter?: number
        customStart?: Date
        customEnd?: Date
    }) => void
    onCompareModeChange: (mode: CompareMode) => void
}

export function PeriodSelector({
    periodType,
    year,
    month,
    quarter,
    customStart,
    customEnd,
    compareMode,
    previousPeriodLabel,
    onPeriodChange,
    onCompareModeChange
}: PeriodSelectorProps) {
    const { t } = useLanguage()

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

    const getLabel = () => {
        switch (periodType) {
            case 'month':
                return `${months[(month || 1) - 1]} ${year}`
            case 'quarter':
                return `Q${quarter} ${year}`
            case 'year':
                return `${year}`
            case 'all_time':
                return t('finance.all_time') || 'All Time'
            case 'custom':
                if (customStart && customEnd) {
                    return `${format(customStart, 'MMM d, yyyy')} – ${format(customEnd, 'MMM d, yyyy')}`
                }
                return 'Custom Range'
        }
    }

    const periodTypes: PeriodType[] = ['month', 'quarter', 'year', 'all_time', 'custom']

    return (
        <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
            <div className="flex items-center gap-2 bg-background p-2 rounded-xl border border-sand-200 flex-wrap w-full">
                {/* Period Type Tabs */}
                <div className="flex bg-sand-100 rounded-lg p-1">
                    {periodTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => onPeriodChange({ periodType: type, year, month, quarter, customStart, customEnd })}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${periodType === type
                                ? 'bg-sand-50 text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-secondary'
                                }`}
                        >
                            {type === 'month' ? t('finance.monthly') || 'Monthly' :
                                type === 'quarter' ? t('finance.quarterly') || 'Quarterly' :
                                    type === 'all_time' ? t('finance.all_time') || 'All Time' :
                                        type === 'custom' ? 'Custom' :
                                            t('finance.yearly') || 'Yearly'}
                        </button>
                    ))}
                </div>

                {/* Year Selector — only for month/quarter/year */}
                {periodType !== 'all_time' && periodType !== 'custom' && (
                    <select
                        value={year}
                        onChange={(e) => onPeriodChange({ periodType, year: parseInt(e.target.value), month, quarter })}
                        className="bg-sand-50 border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                    >
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                )}

                {/* Month Selector (when monthly) */}
                {periodType === 'month' && (
                    <select
                        value={month}
                        onChange={(e) => onPeriodChange({ periodType, year, month: parseInt(e.target.value) })}
                        className="bg-sand-50 border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                )}

                {/* Quarter Selector (when quarterly) */}
                {periodType === 'quarter' && (
                    <select
                        value={quarter}
                        onChange={(e) => onPeriodChange({ periodType, year, quarter: parseInt(e.target.value) })}
                        className="bg-sand-50 border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                    >
                        {quarters.map((q, i) => (
                            <option key={i} value={i + 1}>{q}</option>
                        ))}
                    </select>
                )}

                {/* Custom Date Range Inputs */}
                {periodType === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customStart ? format(customStart, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined
                                if (d && customEnd) {
                                    onPeriodChange({ periodType, year, customStart: d, customEnd })
                                }
                            }}
                            className="bg-sand-50 border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <input
                            type="date"
                            value={customEnd ? format(customEnd, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined
                                if (d && customStart) {
                                    onPeriodChange({ periodType, year, customStart, customEnd: d })
                                }
                            }}
                            className="bg-sand-50 border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                        />
                    </div>
                )}

                {/* Current Period Label */}
                {periodType !== 'custom' && (
                    <div className="flex items-center gap-1 ms-2 text-sm font-medium text-secondary">
                        <Calendar className="w-4 h-4" />
                        {getLabel()}
                    </div>
                )}
            </div>

            {/* Compare Mode Toggle */}
            {periodType !== 'all_time' && (
                <div className="flex items-center gap-2 text-xs">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Compare to:</span>
                    <div className="flex bg-sand-100 rounded-lg p-0.5">
                        <button
                            onClick={() => onCompareModeChange('previous')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                compareMode === 'previous'
                                    ? 'bg-sand-50 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-secondary'
                            }`}
                        >
                            Previous Period
                        </button>
                        <button
                            onClick={() => onCompareModeChange('yoy')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                compareMode === 'yoy'
                                    ? 'bg-sand-50 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-secondary'
                            }`}
                        >
                            Same Period Last Year
                        </button>
                    </div>
                    {previousPeriodLabel && (
                        <span className="text-muted-foreground/70 italic">
                            vs {previousPeriodLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
