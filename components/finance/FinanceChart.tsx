'use client'

import { useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';

interface ChartDataPoint {
    name: string
    value?: number
    [key: string]: string | number | undefined
}

interface FinanceChartProps {
    title: string
    data: ChartDataPoint[]
    type?: 'bar' | 'area' | 'pie' | 'line' | 'horizontal_bar' | 'stacked_bar' | 'stacked_area'
    loading?: boolean
    variant?: 'default' | 'profit' | 'expense'
    dataKeys?: string[]
    colors?: string[]
    height?: string // e.g. 'h-80' or 'h-96'
    valueType?: 'currency' | 'count' // 'count' shows plain numbers, 'currency' formats as QAR
}

interface TooltipPayloadEntry {
    name: string
    value: number
    color?: string
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
}

const CustomTooltip = ({ active, payload, label, valueType = 'currency' }: CustomTooltipProps & { valueType?: 'currency' | 'count' }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-xl rounded-xl shadow-xl border border-sand-200/50 p-3 md:p-4">
                <p className="font-semibold text-primary text-sm mb-2">{label}</p>
                {payload.map((entry, index) => {
                    const value = entry.value
                    const isNegative = value < 0
                    const formattedValue = valueType === 'count'
                        ? value.toLocaleString('en-US')
                        : formatCurrency(value)
                    return (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs text-muted-foreground">{entry.name}:</span>
                            </div>
                            <span className={`text-sm font-mono font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formattedValue}
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }
    return null
}

const formatYAxis = (val: number): string => {
    if (typeof val !== 'number') return String(val)
    const absVal = Math.abs(val)
    if (absVal >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (absVal >= 1000) return `${(val / 1000).toFixed(0)}k`
    return formatCurrency(val, false)
}

const CHART_COLORS = {
    default: ['#D4AF37', '#1E293B', '#10B981', '#8B5CF6', '#F43F5E', '#0F172A', '#C5A028'],
    profit: ['#10B981', '#059669', '#34D399', '#047857', '#6EE7B7'],
    expense: ['#F43F5E', '#E11D48', '#FB7185', '#BE123C', '#FDA4AF']
}

const MULTI_LINE_COLORS = ['#10B981', '#F43F5E', '#D4AF37', '#3B82F6', '#8B5CF6']

const STACKED_COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#F59E0B', '#EC4899']

export function FinanceChart({
    title,
    data,
    type = 'bar',
    loading = false,
    variant = 'default',
    dataKeys,
    colors: customColors,
    height = 'h-80 md:h-96',
    valueType = 'currency'
}: FinanceChartProps) {
    const { t } = useLanguage()
    const colors = customColors || CHART_COLORS[variant]
    const isMultiLine = dataKeys && dataKeys.length > 1

    // Compute totals per dataKey for legend display
    const keyTotals = useMemo(() => {
        const totals: Record<string, number> = {}
        if (dataKeys) {
            for (const key of dataKeys) {
                totals[key] = data.reduce((sum, d) => sum + (Number(d[key]) || 0), 0)
            }
        } else {
            totals['value'] = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
        }
        return totals
    }, [data, dataKeys])

    // Legend formatter that appends totals
    const legendFormatter = useCallback((value: string) => {
        const total = keyTotals[value] ?? 0
        const formattedTotal = valueType === 'count'
            ? total.toLocaleString('en-US')
            : formatCurrency(total)
        return <span className="text-muted-foreground capitalize">{value} ({formattedTotal})</span>
    }, [keyTotals, valueType])

    if (loading) {
        return (
            <div className={`bg-white/65 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ${height} flex flex-col animate-pulse`}>
                <div className="h-4 bg-gray-300/50 rounded w-1/3 mb-6"></div>
                <div className="flex-1 bg-gray-200/30 rounded-xl"></div>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className={`bg-white/65 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ${height} flex flex-col`}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-4">{title}</h3>
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p className="text-sm">{t('finance.no_data')}</p>
                </div>
            </div>
        )
    }

    const renderChart = () => {
        switch (type) {
            case 'horizontal_bar':
                return (
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E6E2D8" opacity={0.5} />
                        <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            tickFormatter={formatYAxis}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 11 }}
                            width={80}
                        />
                        <Tooltip content={<CustomTooltip valueType={valueType} />} cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                )

            case 'stacked_bar':
                return (
                    <BarChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D8" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            dy={10}
                            interval={data.length > 15 ? Math.ceil(data.length / 8) - 1 : 0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            width={35}
                            allowDecimals={valueType !== 'count'}
                        />
                        <Tooltip content={<CustomTooltip valueType={valueType} />} cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={legendFormatter} />
                        {dataKeys?.map((key, index) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="stack"
                                fill={customColors ? customColors[index % customColors.length] : STACKED_COLORS[index % STACKED_COLORS.length]}
                                radius={index === (dataKeys.length - 1) ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                maxBarSize={45}
                                name={key}
                            />
                        ))}
                    </BarChart>
                )

            case 'stacked_area':
                return (
                    <AreaChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                        <defs>
                            {dataKeys?.map((key, index) => (
                                <linearGradient key={key} id={`stackGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={STACKED_COLORS[index % STACKED_COLORS.length]} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={STACKED_COLORS[index % STACKED_COLORS.length]} stopOpacity={0.05} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D8" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            dy={10}
                            interval={data.length > 15 ? Math.ceil(data.length / 8) - 1 : 0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            tickFormatter={formatYAxis}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip valueType={valueType} />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={legendFormatter} />
                        {dataKeys?.map((key, index) => (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stackId="stack"
                                stroke={STACKED_COLORS[index % STACKED_COLORS.length]}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#stackGrad-${index})`}
                                name={key}
                            />
                        ))}
                    </AreaChart>
                )

            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="35%"
                            outerRadius="55%"
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip valueType={valueType} />} />
                        <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            formatter={(value, entry: any) => {
                                const { payload } = entry
                                const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
                                const percent = total > 0 ? (payload.value / total) * 100 : 0
                                return <span className="text-muted-foreground ml-1">{value} ({percent.toFixed(0)}%)</span>
                            }}
                        />
                    </PieChart>
                )

            case 'line':
                return (
                    <LineChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D8" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            dy={10}
                            interval={data.length > 15 ? Math.ceil(data.length / 8) - 1 : 0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            tickFormatter={formatYAxis}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip valueType={valueType} />} />
                        <Legend
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                            formatter={legendFormatter}
                        />
                        {dataKeys ? (
                            dataKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={MULTI_LINE_COLORS[index % MULTI_LINE_COLORS.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name={key}
                                />
                            ))
                        ) : (
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={variant === 'expense' ? '#F43F5E' : variant === 'profit' ? '#10B981' : '#D4AF37'}
                                strokeWidth={2.5}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                    </LineChart>
                )

            case 'bar':
                return (
                    <BarChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D8" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            dy={10}
                            interval={0}
                            angle={data.length > 5 ? -45 : 0}
                            textAnchor={data.length > 5 ? 'end' : 'middle'}
                            height={data.length > 5 ? 60 : 30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            tickFormatter={formatYAxis}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip valueType={valueType} />} cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.value && entry.value < 0 ? '#F43F5E' : colors[index % colors.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                )

            case 'area':
            default:
                return (
                    <AreaChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`colorGradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={variant === 'expense' ? '#F43F5E' : variant === 'profit' ? '#10B981' : '#D4AF37'} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={variant === 'expense' ? '#F43F5E' : variant === 'profit' ? '#10B981' : '#D4AF37'} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D8" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            dy={10}
                            interval={data.length > 15 ? Math.ceil(data.length / 8) - 1 : 0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#999', fontSize: 10 }}
                            tickFormatter={formatYAxis}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip valueType={valueType} />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={variant === 'expense' ? '#F43F5E' : variant === 'profit' ? '#10B981' : '#D4AF37'}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#colorGradient-${variant})`}
                        />
                    </AreaChart>
                )
        }
    }

    return (
        <div className={`bg-white/65 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] ${height} flex flex-col group hover:bg-white/75 transition-all duration-300`}>
            <h3 className="text-[10px] md:text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-4">{title}</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    )
}
