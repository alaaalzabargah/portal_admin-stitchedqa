'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { PeriodType } from '@/lib/finance/types'
import { useLanguage } from '@/lib/i18n/context'

interface PeriodSelectorProps {
    periodType: PeriodType
    year: number
    month?: number
    quarter?: number
    onPeriodChange: (params: { periodType: PeriodType; year: number; month?: number; quarter?: number }) => void
}

export function PeriodSelector({ periodType, year, month, quarter, onPeriodChange }: PeriodSelectorProps) {
    const { t } = useLanguage()
    const [open, setOpen] = useState(false)

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
        }
    }

    return (
        <div className="relative">
            <div className="flex items-center gap-2 bg-background dark:bg-sand-100 p-2 rounded-xl border border-sand-200 dark:border-sand-300 flex-wrap">
                {/* Period Type Tabs */}
                <div className="flex bg-sand-100 rounded-lg p-1">
                    {(['month', 'quarter', 'year'] as PeriodType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => onPeriodChange({ periodType: type, year, month, quarter })}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${periodType === type
                                ? 'bg-sand-50 dark:bg-sand-200 text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-secondary'
                                }`}
                        >
                            {type === 'month' ? t('finance.monthly') || 'Monthly' :
                                type === 'quarter' ? t('finance.quarterly') || 'Quarterly' :
                                    t('finance.yearly') || 'Yearly'}
                        </button>
                    ))}
                </div>

                {/* Year Selector */}
                <select
                    value={year}
                    onChange={(e) => onPeriodChange({ periodType, year: parseInt(e.target.value), month, quarter })}
                    className="bg-sand-50 dark:bg-sand-200 dark:text-primary border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {/* Month Selector (when monthly) */}
                {periodType === 'month' && (
                    <select
                        value={month}
                        onChange={(e) => onPeriodChange({ periodType, year, month: parseInt(e.target.value) })}
                        className="bg-sand-50 dark:bg-sand-200 dark:text-primary border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
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
                        className="bg-sand-50 dark:bg-sand-200 dark:text-primary border-none text-sm rounded-lg py-1.5 px-2 focus:ring-0"
                    >
                        {quarters.map((q, i) => (
                            <option key={i} value={i + 1}>{q}</option>
                        ))}
                    </select>
                )}

                {/* Current Period Label */}
                <div className="flex items-center gap-1 ms-2 text-sm font-medium text-secondary">
                    <Calendar className="w-4 h-4" />
                    {getLabel()}
                </div>
            </div>
        </div>
    )
}
