'use client'

import { useState, useMemo, useRef } from 'react'
import { GlassButton } from '@/components/ui/GlassButton'
import { updateStoreSettings } from './actions'
import {
    Clock, Send, CheckCircle2, XCircle, History, Zap, ZapOff, Timer,
    ChevronDown, MessageCircle, ArrowUp, ArrowDown, ArrowUpDown,
    Search, X, PhoneOff, Filter,
} from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────

interface Settings {
    whatsapp_review_delay_minutes: number
    whatsapp_automation_enabled: boolean
}

type StatusFilter = 'all' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed'
type SortKey = 'order' | 'customer' | 'scheduled' | 'status'
type SortDir = 'asc' | 'desc'

// ── Constants ──────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { scheduled: 0, sent: 1, delivered: 2, read: 3, failed: 4 }

const STATUS_CONFIG: Record<string, { label: string, icon: typeof Clock, dotColor: string, bgClass: string, textClass: string, borderClass: string }> = {
    scheduled: { label: 'Scheduled', icon: Clock, dotColor: 'bg-blue-500', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
    sent:      { label: 'Sent',      icon: Send, dotColor: 'bg-amber-500', bgClass: 'bg-amber-50', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
    delivered: { label: 'Delivered', icon: CheckCircle2, dotColor: 'bg-indigo-500', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
    read:      { label: 'Read',      icon: CheckCircle2, dotColor: 'bg-emerald-500', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
    failed:    { label: 'Failed',    icon: XCircle, dotColor: 'bg-red-500', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-200' },
}

const TABLE_COLUMNS: { key: SortKey, label: string, align: string }[] = [
    { key: 'order', label: 'Order', align: 'text-left' },
    { key: 'customer', label: 'Customer', align: 'text-left' },
    { key: 'scheduled', label: 'Scheduled', align: 'text-left' },
    { key: 'status', label: 'Status', align: 'text-right' },
]

// ── Helpers ────────────────────────────────────────────

function getStatusBadge(status: string) {
    const config = STATUS_CONFIG[status]
    if (!config) return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">Pending</div>
    const Icon = config.icon
    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", config.bgClass, config.textClass, config.borderClass)}>
            <Icon className="w-3 h-3" /> {config.label}
        </div>
    )
}

function minutesToParts(totalMinutes: number) {
    const d = Math.floor(totalMinutes / 1440)
    const h = Math.floor((totalMinutes % 1440) / 60)
    const m = totalMinutes % 60
    return { days: d, hours: h, minutes: m }
}

function formatDelaySummary(totalMinutes: number): string {
    if (totalMinutes <= 0) return 'No delay'
    const { days, hours, minutes } = minutesToParts(totalMinutes)
    const p: string[] = []
    if (days > 0) p.push(`${days}d`)
    if (hours > 0) p.push(`${hours}h`)
    if (minutes > 0) p.push(`${minutes}m`)
    return p.join(' ') || 'No delay'
}

function formatDelayLong(totalMinutes: number): string {
    if (totalMinutes <= 0) return 'No delay set'
    const { days, hours, minutes } = minutesToParts(totalMinutes)
    const p: string[] = []
    if (days > 0) p.push(`${days} day${days !== 1 ? 's' : ''}`)
    if (hours > 0) p.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
    if (minutes > 0) p.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`)
    return p.join(', ')
}

function ScheduledTime({ dateStr }: { dateStr: string | null }) {
    if (!dateStr) return <span className="text-muted-foreground">—</span>
    const date = new Date(dateStr)
    const relative = isPast(date)
        ? formatDistanceToNow(date, { addSuffix: true })
        : `in ${formatDistanceToNow(date)}`
    return (
        <div className="flex flex-col gap-0.5">
            <span className="tabular-nums">{format(date, 'MMM d, yyyy \u2022 h:mm a')}</span>
            <span className={cn("text-[11px]", isPast(date) ? "text-muted-foreground" : "text-blue-600 font-medium")}>{relative}</span>
        </div>
    )
}

// ── Mobile status picker (centered modal) ──────────────

function StatusPickerModal({ open, current, counts, onSelect, onClose }: {
    open: boolean
    current: StatusFilter
    counts: Record<string, number>
    onSelect: (s: StatusFilter) => void
    onClose: () => void
}) {
    if (!open) return null
    const allFilters: StatusFilter[] = ['all', 'scheduled', 'sent', 'delivered', 'read', 'failed']
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-[280px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-black/[0.04] flex items-center justify-between">
                    <span className="text-sm font-semibold">Filter by Status</span>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="p-2">
                    {allFilters.map(filter => {
                        const config = filter !== 'all' ? STATUS_CONFIG[filter] : null
                        const count = counts[filter] || 0
                        const isActive = current === filter
                        if (filter !== 'all' && count === 0) return null
                        return (
                            <button
                                key={filter}
                                onClick={() => { onSelect(filter); onClose() }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors",
                                    isActive ? "bg-foreground text-background" : "hover:bg-muted/50"
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    {config
                                        ? <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                                        : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                    }
                                    <span className="font-medium">{filter === 'all' ? 'All' : config?.label}</span>
                                </div>
                                <span className={cn("tabular-nums text-xs", isActive ? "opacity-70" : "text-muted-foreground")}>{count}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── Main Component ─────────────────────────────────────

export default function AutomationsClient({ settings, queue }: { settings: Settings, queue: any[] }) {
    const initialParts = minutesToParts(settings?.whatsapp_review_delay_minutes ?? 4320)
    const [enabled, setEnabled] = useState(settings?.whatsapp_automation_enabled ?? false)
    const [days, setDays] = useState(initialParts.days)
    const [hours, setHours] = useState(initialParts.hours)
    const [minutes, setMinutes] = useState(initialParts.minutes)
    const [isSaving, setIsSaving] = useState(false)
    const [configOpen, setConfigOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('scheduled')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [search, setSearch] = useState('')
    const [noPhoneOnly, setNoPhoneOnly] = useState(false)
    const [statusPickerOpen, setStatusPickerOpen] = useState(false)
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    const totalMinutes = useMemo(() => days * 1440 + hours * 60 + minutes, [days, hours, minutes])
    const delaySummary = useMemo(() => formatDelaySummary(totalMinutes), [totalMinutes])
    const delayLong = useMemo(() => formatDelayLong(totalMinutes), [totalMinutes])

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: queue.length }
        for (const row of queue) {
            counts[row.wa_review_status] = (counts[row.wa_review_status] || 0) + 1
        }
        return counts
    }, [queue])

    const noPhoneCount = useMemo(() => queue.filter(r => !r.customers?.phone).length, [queue])

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir(key === 'scheduled' ? 'desc' : 'asc')
        }
    }

    const filteredQueue = useMemo(() => {
        let result = statusFilter === 'all' ? [...queue] : queue.filter(r => r.wa_review_status === statusFilter)

        if (noPhoneOnly) {
            result = result.filter(r => !r.customers?.phone)
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase()
            result = result.filter(r =>
                String(r.shopify_order_number || '').includes(q) ||
                (r.customers?.full_name || '').toLowerCase().includes(q) ||
                (r.customers?.phone || '').includes(q)
            )
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortKey) {
                case 'order':
                    cmp = (a.shopify_order_number || 0) - (b.shopify_order_number || 0)
                    break
                case 'customer':
                    cmp = (a.customers?.full_name || '').localeCompare(b.customers?.full_name || '')
                    break
                case 'scheduled':
                    cmp = new Date(a.wa_scheduled_for || 0).getTime() - new Date(b.wa_scheduled_for || 0).getTime()
                    break
                case 'status':
                    cmp = (STATUS_ORDER[a.wa_review_status] ?? 99) - (STATUS_ORDER[b.wa_review_status] ?? 99)
                    break
            }
            return sortDir === 'asc' ? cmp : -cmp
        })

        return result
    }, [queue, statusFilter, sortKey, sortDir, search, noPhoneOnly])

    // Which filter tabs to show on desktop (only statuses that exist + "all")
    const visibleFilters = useMemo(() => {
        const filters: StatusFilter[] = ['all']
        const order: StatusFilter[] = ['scheduled', 'sent', 'delivered', 'read', 'failed']
        for (const s of order) {
            if (statusCounts[s]) filters.push(s)
        }
        return filters
    }, [statusCounts])

    const handleSave = async () => {
        if (totalMinutes < 1) {
            setNotification({ message: 'The delay must be at least 1 minute. Please set a value for days, hours, or minutes.', type: 'error' })
            setTimeout(() => setNotification(null), 5000)
            return
        }
        setIsSaving(true)
        try {
            const result = await updateStoreSettings(totalMinutes, enabled)
            if (result.success) {
                setNotification({ message: 'Automation settings saved successfully.', type: 'success' })
            } else {
                setNotification({ message: result.error || 'Failed to save settings. Please try again.', type: 'error' })
            }
        } catch {
            setNotification({ message: 'Could not reach the server. Check your internet connection and try again.', type: 'error' })
        } finally {
            setIsSaving(false)
            setTimeout(() => setNotification(null), 5000)
        }
    }

    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, isNaN(v) ? 0 : Math.floor(v)))

    // Active filter label for mobile button
    const activeFilterLabel = statusFilter === 'all' ? 'All' : STATUS_CONFIG[statusFilter]?.label || statusFilter
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {notification && (
                <div className={cn(
                    "px-4 py-3 rounded-2xl border text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 duration-300",
                    notification.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                )}>
                    {notification.message}
                </div>
            )}

            {/* Config Card — collapsible */}
            <div className="border border-black/[0.06] shadow-sm rounded-2xl overflow-hidden bg-white">
                <button
                    type="button"
                    onClick={() => setConfigOpen(!configOpen)}
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("flex-shrink-0 w-2 h-2 rounded-full", enabled ? "bg-emerald-500" : "bg-black/20")} />
                        <span className="text-sm font-medium truncate">{enabled ? 'Active' : 'Paused'}</span>
                        <span className="hidden sm:inline text-xs text-muted-foreground">—</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="tabular-nums font-medium">{delaySummary}</span>
                            <span className="hidden sm:inline">after fulfillment</span>
                        </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200", configOpen && "rotate-180")} />
                </button>

                <div className={cn("grid transition-all duration-200 ease-in-out", configOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden">
                        <div className="border-t border-black/[0.04] px-4 sm:px-5 py-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setEnabled(!enabled)}>
                                    <div className={cn("relative inline-flex h-[22px] w-[40px] flex-shrink-0 rounded-full transition-colors duration-200", enabled ? 'bg-emerald-500' : 'bg-black/15')}>
                                        <span className={cn("pointer-events-none inline-block h-[18px] w-[18px] mt-[2px] rounded-full bg-white shadow-sm transition duration-200", enabled ? 'translate-x-[20px]' : 'translate-x-[2px]')} />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {enabled ? <Zap className="w-3.5 h-3.5 text-emerald-600" /> : <ZapOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                        <span className={cn("text-sm font-medium", enabled ? "text-emerald-700" : "text-muted-foreground")}>
                                            {enabled ? 'Automation Active' : 'Automation Paused'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0" title="Delay after fulfillment">
                                    <Timer className="w-4 h-4" />
                                    <span className="hidden sm:inline text-sm font-medium">Send after</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <input type="number" value={days} onChange={(e) => setDays(clamp(parseInt(e.target.value), 365))}
                                        className="w-11 sm:w-[52px] h-9 rounded-xl border border-black/10 bg-muted/30 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" min="0" max="365" />
                                    <span className="text-xs font-medium text-muted-foreground w-4">d</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <input type="number" value={hours} onChange={(e) => setHours(clamp(parseInt(e.target.value), 23))}
                                        className="w-11 sm:w-[52px] h-9 rounded-xl border border-black/10 bg-muted/30 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" min="0" max="23" />
                                    <span className="text-xs font-medium text-muted-foreground w-4">h</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <input type="number" value={minutes} onChange={(e) => setMinutes(clamp(parseInt(e.target.value), 59))}
                                        className="w-11 sm:w-[52px] h-9 rounded-xl border border-black/10 bg-muted/30 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all" min="0" max="59" />
                                    <span className="text-xs font-medium text-muted-foreground w-4">m</span>
                                </div>
                            </div>

                            {totalMinutes > 0 && (
                                <p className="text-xs text-muted-foreground pl-0.5">
                                    = <span className="font-medium text-foreground/80">{delayLong}</span> after order is fulfilled
                                </p>
                            )}

                            <div className="pt-1 flex justify-end">
                                <GlassButton onClick={handleSave} variant="primary" size="sm" isLoading={isSaving} className="w-full sm:w-auto">
                                    {isSaving ? 'Saving...' : 'Save'}
                                </GlassButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Queue Section ─────────────────────────────── */}
            <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-center gap-2 px-1">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-medium tracking-tight">Queue History</h2>
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">({filteredQueue.length})</span>
                </div>

                {/* Toolbar: search + filters — always single row */}
                <div className="flex items-center gap-2">
                    {/* Search — fills remaining space */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search order or customer..."
                            className="w-full h-9 pl-9 pr-8 rounded-xl border border-black/10 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/60"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted/50 transition-colors">
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* No-phone toggle */}
                    {noPhoneCount > 0 && (
                        <button
                            onClick={() => setNoPhoneOnly(!noPhoneOnly)}
                            title={noPhoneOnly ? 'Show all customers' : 'Show only customers without phone'}
                            className={cn(
                                "flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-medium transition-all",
                                noPhoneOnly
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-white border-black/10 text-muted-foreground hover:bg-muted/30"
                            )}
                        >
                            <PhoneOff className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">No phone</span>
                            <span className="tabular-nums">{noPhoneCount}</span>
                        </button>
                    )}

                    {/* Desktop: inline status pills */}
                    <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                        {visibleFilters.map(filter => {
                            const isActive = statusFilter === filter
                            const config = filter !== 'all' ? STATUS_CONFIG[filter] : null
                            return (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                                        isActive ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                                    )}
                                >
                                    {config && <div className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />}
                                    {filter === 'all' ? 'All' : config?.label}
                                    <span className="tabular-nums opacity-60">{statusCounts[filter] || 0}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Mobile: filter button opens modal */}
                    <button
                        onClick={() => setStatusPickerOpen(true)}
                        className={cn(
                            "sm:hidden flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border text-xs font-medium transition-all",
                            statusFilter !== 'all'
                                ? "bg-foreground text-background border-foreground"
                                : "bg-white border-black/10 text-muted-foreground"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {activeFilterLabel}
                    </button>
                </div>

                {/* Table card */}
                <div className="bg-white border border-black/[0.06] rounded-2xl shadow-sm overflow-hidden">
                    {/* Desktop table — always show headers */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground bg-muted/30 border-b border-black/[0.04]">
                                <tr>
                                    {TABLE_COLUMNS.map(col => (
                                        <th key={col.key} className={cn("px-5 py-3 font-medium", col.align)}>
                                            <button
                                                onClick={() => toggleSort(col.key)}
                                                className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                                            >
                                                {col.label}
                                                {sortKey === col.key ? (
                                                    sortDir === 'asc'
                                                        ? <ArrowUp className="w-3 h-3 text-foreground" />
                                                        : <ArrowDown className="w-3 h-3 text-foreground" />
                                                ) : (
                                                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                                                )}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQueue.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <EmptyState filter={statusFilter} search={search} noPhoneOnly={noPhoneOnly} />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQueue.map(row => (
                                        <tr key={row.id} className="border-b border-black/[0.04] last:border-0 hover:bg-muted/10 transition-colors">
                                            <td className="px-5 py-3.5 font-medium">
                                                <Link href={`/finance/orders?search=${row.shopify_order_number}`} className="hover:underline text-primary transition-colors">
                                                    #{row.shopify_order_number}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-medium text-foreground text-sm">{row.customers?.full_name || 'Guest'}</span>
                                                    <span className={cn("text-xs", row.customers?.phone ? "text-muted-foreground" : "text-red-500 font-medium")}>
                                                        {row.customers?.phone || 'No phone'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-muted-foreground text-xs">
                                                <ScheduledTime dateStr={row.wa_scheduled_for} />
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {getStatusBadge(row.wa_review_status)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile list */}
                    <div className="sm:hidden">
                        {filteredQueue.length === 0 ? (
                            <EmptyState filter={statusFilter} search={search} noPhoneOnly={noPhoneOnly} />
                        ) : (
                            <div className="divide-y divide-black/[0.04]">
                                {filteredQueue.map(row => (
                                    <div key={row.id} className="px-4 py-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Link href={`/finance/orders?search=${row.shopify_order_number}`} className="text-sm font-semibold text-primary hover:underline">
                                                #{row.shopify_order_number}
                                            </Link>
                                            {getStatusBadge(row.wa_review_status)}
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-foreground truncate">{row.customers?.full_name || 'Guest'}</p>
                                                <p className={cn("text-[11px]", row.customers?.phone ? "text-muted-foreground" : "text-red-500 font-medium")}>
                                                    {row.customers?.phone || 'No phone'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs text-muted-foreground tabular-nums">
                                                    {row.wa_scheduled_for ? format(new Date(row.wa_scheduled_for), 'MMM d \u2022 h:mm a') : '—'}
                                                </p>
                                                {row.wa_scheduled_for && (
                                                    <p className={cn("text-[11px] tabular-nums", isPast(new Date(row.wa_scheduled_for)) ? "text-muted-foreground" : "text-blue-600 font-medium")}>
                                                        {isPast(new Date(row.wa_scheduled_for))
                                                            ? formatDistanceToNow(new Date(row.wa_scheduled_for), { addSuffix: true })
                                                            : `in ${formatDistanceToNow(new Date(row.wa_scheduled_for))}`
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile status picker modal */}
            <StatusPickerModal
                open={statusPickerOpen}
                current={statusFilter}
                counts={statusCounts}
                onSelect={setStatusFilter}
                onClose={() => setStatusPickerOpen(false)}
            />
        </div>
    )
}

// ── Empty state (shared between desktop & mobile) ──────

function EmptyState({ filter, search, noPhoneOnly }: { filter: StatusFilter, search: string, noPhoneOnly: boolean }) {
    let title = 'No review requests yet'
    let subtitle = 'When orders are fulfilled, review requests will appear here.'

    if (search.trim()) {
        title = 'No results found'
        subtitle = `No records match "${search.trim()}". Try a different search.`
    } else if (noPhoneOnly) {
        title = 'All customers have phone numbers'
        subtitle = 'No customers without phone numbers in the current view.'
    } else if (filter !== 'all') {
        title = `No ${STATUS_CONFIG[filter]?.label.toLowerCase()} messages`
        subtitle = 'Try a different filter to see other messages.'
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                {search.trim() ? <Search className="w-5 h-5 text-muted-foreground" /> : <MessageCircle className="w-5 h-5 text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium text-foreground/70">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">{subtitle}</p>
        </div>
    )
}
