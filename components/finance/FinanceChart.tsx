'use client'

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
    type?: 'bar' | 'area' | 'pie' | 'line'
    loading?: boolean
    variant?: 'default' | 'profit' | 'expense'
    dataKeys?: string[]  // For multi-line charts
    colors?: string[]     // Custom colors for multi-line
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

// Moved outside component to prevent recreation on each render
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 dark:bg-sand-50/95 backdrop-blur-xl rounded-xl shadow-xl border border-sand-200/50 dark:border-sand-300/50 p-3 md:p-4">
                <p className="font-semibold text-primary text-sm mb-2">{label}</p>
                {payload.map((entry, index) => {
                    const value = entry.value
                    const isNegative = value < 0
                    return (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">{entry.name}:</span>
                            <span className={`text-base font-mono font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formatCurrency(value)}
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }
    return null
}

// Moved outside component
const formatYAxis = (val: number): string => {
    if (typeof val !== 'number') return String(val)
    const absVal = Math.abs(val)
    if (absVal >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (absVal >= 1000) return `${(val / 1000).toFixed(0)}k`
    return formatCurrency(val, false)
}

const CHART_COLORS = {
    // Luxury Mix: Gold, Navy, Emerald, Violet, Rose
    default: ['#D4AF37', '#1E293B', '#10B981', '#8B5CF6', '#F43F5E', '#0F172A', '#C5A028'],
    profit: ['#10B981', '#059669', '#34D399', '#047857', '#6EE7B7'],
    expense: ['#F43F5E', '#E11D48', '#FB7185', '#BE123C', '#FDA4AF']
}

const MULTI_LINE_COLORS = ['#10B981', '#F43F5E', '#D4AF37', '#3B82F6', '#8B5CF6']

export function FinanceChart({
    title,
    data,
    type = 'bar',
    loading = false,
    variant = 'default',
    dataKeys,
    colors: customColors
}: FinanceChartProps) {
    const { t } = useLanguage()
    const colors = customColors || CHART_COLORS[variant]
    const isMultiLine = dataKeys && dataKeys.length > 1

    if (loading) {
        return (
            <div className="bg-white/65 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] h-80 md:h-96 flex flex-col animate-pulse">
                <div className="h-4 bg-gray-300/50 rounded w-1/3 mb-6"></div>
                <div className="flex-1 bg-gray-200/30 rounded-xl"></div>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white/65 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] h-80 md:h-96 flex flex-col">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-4">{title}</h3>
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p className="text-sm">{t('finance.no_data')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white/65 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-3xl p-5 md:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] h-80 md:h-96 flex flex-col group hover:bg-white/75 dark:hover:bg-white/15 transition-all duration-300">
            <h3 className="text-[10px] md:text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'pie' ? (
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
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
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
                    ) : type === 'line' || isMultiLine ? (
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
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                formatter={(value) => <span className="text-muted-foreground capitalize">{value}</span>}
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
                    ) : type === 'bar' ? (
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
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.value && entry.value < 0 ? '#F43F5E' : colors[index % colors.length]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
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
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={variant === 'expense' ? '#F43F5E' : variant === 'profit' ? '#10B981' : '#D4AF37'}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill={`url(#colorGradient-${variant})`}
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    )
}
