'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthUser } from '@/lib/auth'
import { useThemeSystem } from '@/lib/themes/context'
import { Search, Plus, AlertTriangle, Clock, Settings, Package } from 'lucide-react'
import type { ProductionSettings } from '@/lib/types/production'

export default function ProductionPage() {
    const supabase = createClient()
    const router = useRouter()
    const { profile } = useAuthUser()
    const { themeConfig } = useThemeSystem()
    const [loading, setLoading] = useState(true)
    const [assignments, setAssignments] = useState<any[]>([])
    const [settings, setSettings] = useState<ProductionSettings | null>(null)
    const [activeTab, setActiveTab] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadSettings()
        loadAssignments()
    }, [])

    async function loadSettings() {
        const response = await fetch('/api/production/settings')
        if (response.ok) {
            const data = await response.json()
            setSettings(data)
        }
    }

    async function loadAssignments() {
        const { data, error } = await supabase
            .from('production_assignments')
            .select(`
                *,
                order_items (
                    id,
                    product_name,
                    quantity,
                    unit_price_minor,
                    variant_title,
                    size,
                    color,
                    orders (
                        id,
                        external_id,
                        customers (
                            full_name,
                            phone
                        )
                    )
                ),
                tailors (
                    id,
                    full_name,
                    phone,
                    specialty
                )
            `)
            .not('stage', 'eq', 'delivered')
            .order('target_due_at', { ascending: true })

        if (!error && data) {
            setAssignments(data)
        }
        setLoading(false)
    }

    const getStageStats = () => {
        const stats = {
            pending: 0,
            cutting: 0,
            sewing: 0,
            qc: 0,
            ready: 0,
            all: assignments.length
        }

        assignments.forEach(a => {
            if (stats.hasOwnProperty(a.stage)) {
                stats[a.stage as keyof typeof stats]++
            }
        })

        return stats
    }

    const getHealthStatus = (assignment: any) => {
        if (!assignment.assigned_at || !assignment.target_due_at || !settings) {
            return { label: 'No Deadline', color: 'text-gray-500', barColor: 'bg-gray-300', percent: 0 }
        }

        const now = new Date().getTime()
        const assigned = new Date(assignment.assigned_at).getTime()
        const due = new Date(assignment.target_due_at).getTime()
        const elapsed = now - assigned
        const total = due - assigned
        const percent = Math.min((elapsed / total) * 100, 100)

        const remaining = due - now
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24))

        const warningThreshold = settings.alert_thresholds.warning
        const criticalThreshold = settings.alert_thresholds.critical

        if (remaining < 0) {
            return { label: 'Overdue', color: 'text-red-600', barColor: 'bg-red-500', percent: 100 }
        } else if (days === 0) {
            return { label: 'Due Today', color: 'text-red-600', barColor: 'bg-red-500', percent }
        } else if (days === 1) {
            return { label: 'Due Tomorrow', color: 'text-red-600', barColor: 'bg-red-500', percent }
        } else if (percent >= criticalThreshold) {
            return { label: `${days} Days Left`, color: 'text-red-600', barColor: 'bg-red-500', percent }
        } else if (percent >= warningThreshold) {
            return { label: `${days} Days Left`, color: 'text-yellow-600', barColor: 'bg-yellow-500', percent }
        } else {
            return { label: 'On Schedule', color: 'text-green-600', barColor: 'bg-green-500', percent }
        }
    }

    const getStageDuration = (assignment: any) => {
        if (!assignment.assigned_at || !settings) return null

        const now = new Date().getTime()
        const assigned = new Date(assignment.assigned_at).getTime()
        const daysPassed = Math.floor((now - assigned) / (1000 * 60 * 60 * 24))
        const expectedDays = settings.stage_durations[assignment.stage as keyof typeof settings.stage_durations] || 0

        return { daysPassed, expectedDays }
    }

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
    }

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-pink-500',
            'bg-purple-500',
            'bg-orange-500',
            'bg-teal-500',
        ]
        const index = name?.charCodeAt(0) % colors.length || 0
        return colors[index]
    }

    const getStageColor = (stage: string) => {
        if (!settings) return 'bg-gray-100 text-gray-700'

        const colorMap: Record<string, string> = {
            gray: 'bg-gray-100 text-gray-700',
            pink: 'bg-pink-100 text-pink-700',
            blue: 'bg-blue-100 text-blue-700',
            green: 'bg-green-100 text-green-700',
            emerald: 'bg-emerald-100 text-emerald-700',
            purple: 'bg-purple-100 text-purple-700',
            orange: 'bg-orange-100 text-orange-700',
            red: 'bg-red-100 text-red-700',
        }

        const color = settings.stage_colors[stage as keyof typeof settings.stage_colors] || 'gray'
        return colorMap[color] || 'bg-gray-100 text-gray-700'
    }

    const getNextStage = (currentStage: string) => {
        const stageOrder = ['pending', 'cutting', 'sewing', 'qc', 'ready']
        const currentIndex = stageOrder.indexOf(currentStage)
        return stageOrder[Math.min(currentIndex + 1, stageOrder.length - 1)]
    }

    const handleMoveStage = async (assignmentId: string, currentStage: string) => {
        const nextStage = getNextStage(currentStage)

        const response = await fetch(`/api/production/assignments/${assignmentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: nextStage })
        })

        if (response.ok) {
            await loadAssignments()
        } else {
            const errorData = await response.json()
            alert(`Failed to move stage: ${errorData.error || 'Unknown error'}`)
        }
    }

    const handleMarkPaid = async (assignmentId: string) => {
        const response = await fetch(`/api/production/assignments/${assignmentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_paid: true })
        })

        if (response.ok) {
            await loadAssignments()
        } else {
            alert('Failed to mark as paid')
        }
    }

    const filteredAssignments = assignments.filter(a => {
        const matchesTab = activeTab === 'all' || a.stage === activeTab
        const matchesSearch = !searchQuery ||
            a.order_items?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.order_items?.orders?.external_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.order_items?.orders?.customers?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesSearch
    })

    const tabs = settings ? [
        { id: 'all', label: 'All Active' },
        { id: 'pending', label: settings.stage_labels.pending },
        { id: 'cutting', label: settings.stage_labels.cutting },
        { id: 'sewing', label: settings.stage_labels.sewing },
        { id: 'qc', label: settings.stage_labels.qc },
    ] : [
        { id: 'all', label: 'All Active' },
        { id: 'pending', label: 'Pending' },
        { id: 'cutting', label: 'Cutting' },
        { id: 'sewing', label: 'Sewing' },
        { id: 'qc', label: 'QC Check' },
    ]

    const stats = getStageStats()

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p
                        className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1 sm:mb-2"
                        style={{ color: themeConfig.colors.accent }}
                    >
                        PRODUCTION
                    </p>
                    <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900">Production Orders</h1>
                    <p className="text-xs sm:text-base text-gray-600 mt-1 sm:mt-2">Manage bespoke orders and workflow status</p>
                </div>
                <div className="flex items-center gap-3">
                    {(profile?.role === 'owner' || profile?.role === 'admin') && (
                        <button
                            onClick={() => router.push('/production/settings')}
                            className="flex items-center gap-2 border rounded-lg px-4 py-2 transition-colors font-medium"
                            style={{ borderColor: themeConfig.colors.primary, color: themeConfig.colors.primary }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = `${themeConfig.colors.primary}10`}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                    )}
                    <button
                        className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                        style={{ backgroundColor: themeConfig.colors.primary }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primaryDark}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primary}
                    >
                        <Plus className="w-4 h-4" />
                        New Order
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search order #, client..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl focus:glass-input-focus"
                />
            </div>

            {/* Glass Stat Cards - Responsive Layout */}
            {settings && (
                <>
                    {/* Mobile: Vertical Stack - Clickable Filters */}
                    <div className="flex flex-col gap-3 sm:hidden">
                        {/* TOTAL Card */}
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`relative overflow-hidden p-3 h-16 rounded-xl ${activeTab === 'all' ? 'ring-2' : ''
                                }`}
                            style={{
                                background: `linear-gradient(135deg, ${themeConfig.colors.gradientFrom}, ${themeConfig.colors.gradientTo})`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                ['--tw-ring-color' as any]: themeConfig.colors.primary
                            }}
                        >
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/20 to-transparent" />
                            <div className="relative z-10 flex items-center justify-between h-full">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                        <Package className="w-4 h-4" style={{ color: themeConfig.colors.textPrimary }} />
                                    </div>
                                    <span
                                        className="text-xs uppercase tracking-wide font-semibold"
                                        style={{ color: themeConfig.colors.textSecondary }}
                                    >
                                        TOTAL
                                    </span>
                                </div>
                                <p
                                    className="text-2xl font-bold font-mono"
                                    style={{ color: themeConfig.colors.textPrimary }}
                                >
                                    {stats.all}
                                </p>
                            </div>
                        </button>

                        {/* Stage Cards - 5 column grid */}
                        <div className="grid grid-cols-5 gap-2">
                            {(['pending', 'cutting', 'sewing', 'qc', 'ready'] as const).map(stage => {
                                const stageLabel = settings.stage_labels[stage]
                                const count = stats[stage]
                                const color = settings.stage_colors[stage]

                                const borderColorMap: Record<string, string> = {
                                    gray: '#9ca3af',
                                    pink: '#ec4899',
                                    blue: '#3b82f6',
                                    green: '#10b981',
                                    emerald: '#059669',
                                    purple: '#a855f7',
                                    orange: '#f97316',
                                    red: '#ef4444',
                                }

                                const borderColor = borderColorMap[color] || '#9ca3af'

                                return (
                                    <button
                                        key={stage}
                                        onClick={() => setActiveTab(stage)}
                                        className={`relative overflow-hidden p-2 aspect-square rounded-lg bg-white border-2 border-gray-200 flex flex-col justify-between ${activeTab === stage ? 'ring-2' : ''
                                            }`}
                                        style={{
                                            ['--tw-ring-color' as any]: borderColor
                                        }}
                                    >
                                        <div
                                            className="absolute top-0 left-0 right-0 h-1"
                                            style={{ backgroundColor: borderColor }}
                                        />
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                            <div
                                                className="w-1 h-1 rounded-full"
                                                style={{ backgroundColor: borderColor }}
                                            />
                                            <span className="text-[8px] uppercase tracking-wide text-gray-500 font-medium truncate">
                                                {stageLabel}
                                            </span>
                                        </div>
                                        <p
                                            className="text-xl font-bold font-mono self-end leading-none"
                                            style={{ color: borderColor }}
                                        >
                                            {count}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Desktop: Horizontal Row Layout */}
                    <div className="hidden sm:flex flex-row gap-4 overflow-x-auto pb-4 hide-scrollbar">
                        {/* TOTAL Card - Hero Card */}
                        <div
                            className="relative overflow-hidden p-6 min-w-[160px] flex-shrink-0 rounded-2xl"
                            style={{
                                background: `linear-gradient(145deg, ${themeConfig.colors.gradientFrom}, ${themeConfig.colors.gradientVia}, ${themeConfig.colors.gradientTo})`,
                                boxShadow: `0 8px 24px -4px ${themeConfig.colors.primary}30`
                            }}
                        >
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Package className="w-4 h-4" style={{ color: themeConfig.colors.textPrimary }} />
                                    </div>
                                    <span
                                        className="text-xs uppercase tracking-widest font-semibold"
                                        style={{ color: themeConfig.colors.textSecondary }}
                                    >
                                        TOTAL
                                    </span>
                                </div>
                                <p
                                    className="text-4xl font-bold font-mono tracking-tight"
                                    style={{ color: themeConfig.colors.textPrimary }}
                                >
                                    {stats.all}
                                </p>
                            </div>
                        </div>

                        {/* Per-Stage Cards */}
                        {(['pending', 'cutting', 'sewing', 'qc', 'ready'] as const).map(stage => {
                            const stageLabel = settings.stage_labels[stage]
                            const count = stats[stage]
                            const color = settings.stage_colors[stage]

                            const borderColorMap: Record<string, string> = {
                                gray: '#9ca3af',
                                pink: '#ec4899',
                                blue: '#3b82f6',
                                green: '#10b981',
                                emerald: '#059669',
                                purple: '#a855f7',
                                orange: '#f97316',
                                red: '#ef4444',
                            }

                            const borderColor = borderColorMap[color] || '#9ca3af'

                            return (
                                <div
                                    key={stage}
                                    className="relative overflow-hidden p-6 min-w-[160px] flex-shrink-0 rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group hover:scale-[1.02]"
                                >
                                    <div
                                        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                                        style={{ backgroundColor: borderColor }}
                                    />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div
                                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: `${borderColor}15` }}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: borderColor }}
                                                />
                                            </div>
                                            <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold truncate">
                                                {stageLabel}
                                            </span>
                                        </div>
                                        <p
                                            className="text-4xl font-bold font-mono tracking-tight"
                                            style={{ color: borderColor }}
                                        >
                                            {count}
                                        </p>
                                    </div>
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                        style={{
                                            background: `radial-gradient(circle at center, ${borderColor}08 0%, transparent 70%)`
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Tabs */}
            <div className="hidden sm:block luxury-gradient-card p-1 rounded-xl">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all rounded-lg
                                ${activeTab === tab.id ? 'glass-menu-active' : 'glass-menu-hover'}`}
                            style={activeTab === tab.id ? {
                                color: themeConfig.colors.primary
                            } : { color: '#6b7280' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Glass Order Cards Grid */}
            {loading ? (
                <div className="text-center text-gray-500 py-12">Loading...</div>
            ) : filteredAssignments.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No orders found</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filteredAssignments.map(assignment => {
                        const health = getHealthStatus(assignment)
                        const duration = getStageDuration(assignment)
                        const customerName = assignment.order_items?.orders?.customers?.full_name || 'Unknown Customer'
                        const orderNumber = assignment.order_items?.orders?.external_id || assignment.order_items?.orders?.id || 'N/A'
                        const stageLabel = settings?.stage_labels[assignment.stage as keyof typeof settings.stage_labels] || assignment.stage
                        const nextStage = getNextStage(assignment.stage)
                        const nextStageLabel = settings?.stage_labels[nextStage as keyof typeof settings.stage_labels] || nextStage
                        const itemCount = assignment.order_items?.quantity || 1

                        return (
                            <div
                                key={assignment.id}
                                className="luxury-gradient-card p-4 sm:p-5 cursor-pointer"
                            >
                                {/* Compact Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${getAvatarColor(customerName)} flex items-center justify-center text-white font-semibold text-[10px] sm:text-xs flex-shrink-0`}>
                                            {getInitials(customerName)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{customerName}</h3>
                                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">order #{orderNumber}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${getStageColor(assignment.stage)} flex-shrink-0 ml-2`}>
                                        {stageLabel}
                                    </span>
                                </div>

                                {/* Simplified Item Count */}
                                <div className="mb-3">
                                    <p className="text-xs sm:text-sm text-gray-700 truncate">{assignment.order_items?.product_name || 'Unknown Item'}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                                    {duration && (
                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                            Duration: <span className={`font-medium ${duration.daysPassed > duration.expectedDays ? 'text-red-600' : 'text-gray-700'}`}>
                                                {duration.daysPassed} / {duration.expectedDays} days
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {/* Compact Status */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[10px] sm:text-xs font-medium flex items-center gap-1 ${health.color}`}>
                                            {health.label === 'Overdue' || health.label.includes('Due') ? (
                                                <AlertTriangle className="w-3 h-3" />
                                            ) : (
                                                <Clock className="w-3 h-3" />
                                            )}
                                            {health.label}
                                        </span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900">
                                            QAR {((assignment.order_items?.unit_price_minor || 0) / 100).toFixed(0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5">
                                        <div
                                            className={`${health.barColor} h-1 sm:h-1.5 rounded-full transition-all`}
                                            style={{ width: `${health.percent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Tailor */}
                                {assignment.tailors && (
                                    <div className="mb-3 text-[10px] sm:text-xs text-gray-500">
                                        Assigned to: <span className="font-medium text-gray-700">{assignment.tailors.full_name}</span>
                                    </div>
                                )}

                                {/* Compact Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/production/${assignment.id}`)}
                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-[10px] sm:text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Details
                                    </button>
                                    {assignment.stage !== 'ready' && (
                                        <button
                                            onClick={() => handleMoveStage(assignment.id, assignment.stage)}
                                            className="flex-1 px-3 py-1.5 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors"
                                            style={{ backgroundColor: themeConfig.colors.primary }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primaryDark}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primary}
                                        >
                                            Move to {nextStageLabel}
                                        </button>
                                    )}
                                    {assignment.stage === 'ready' && !assignment.is_paid && (
                                        <button
                                            onClick={() => handleMarkPaid(assignment.id)}
                                            className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] sm:text-xs font-medium hover:bg-green-600 transition-colors"
                                        >
                                            Mark Paid
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
