'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
    Plus, Trash2, X, LayoutGrid, List, ChevronDown
} from 'lucide-react'
import { CiImport, CiExport } from 'react-icons/ci'
import { BiSelectMultiple } from 'react-icons/bi'
import { IoPersonAddOutline } from 'react-icons/io5'
import { SearchInput } from '@/components/ui/SearchInput'
import { CustomerListDesktop } from '@/components/customers/CustomerListDesktop'
import { CustomerListMobile } from '@/components/customers/CustomerListMobile'
import { CustomerCardGrid } from '@/components/customers/CustomerCardGrid'
import { CustomerStatsCards } from '@/components/customers/CustomerStatsCards'
import { Customer } from '@/lib/types/customer'
import { LoyaltyTier } from '@/lib/settings/types'
import { deleteCustomers } from '@/lib/actions/customer'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import { GlassButton } from '@/components/ui/GlassButton'
import { CustomerImportModal } from '@/components/customers/CustomerImportModal'
import { useDialog } from '@/lib/dialog'
import { PageHeader } from '@/components/ui/PageHeader'

const VIEW_MODE_KEY = 'customers-view-mode'

interface CustomerPageClientProps {
    customers: Customer[]
    tiers: LoyaltyTier[]
    dict: any
}

export function CustomerPageClient({ customers, tiers, dict }: CustomerPageClientProps) {
    const dialog = useDialog()
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
    const [mounted, setMounted] = useState(false)
    const [selectedTier, setSelectedTier] = useState<string>('all')
    const [showTierDropdown, setShowTierDropdown] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showFabMenu, setShowFabMenu] = useState(false)
    const router = useRouter()

    // Load view mode from localStorage
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true))
        const stored = localStorage.getItem(VIEW_MODE_KEY)
        if (stored === 'list' || stored === 'card') {
            requestAnimationFrame(() => setViewMode(stored))
        }
    }, [])

    // Persist view mode
    const changeViewMode = (mode: 'card' | 'list') => {
        setViewMode(mode)
        localStorage.setItem(VIEW_MODE_KEY, mode)
    }

    // Filter customers by tier
    const filteredCustomers = useMemo(() => {
        if (selectedTier === 'all') return customers
        return customers.filter(c => c.status_tier === selectedTier)
    }, [customers, selectedTier])

    // Export to CSV
    const handleExport = () => {
        const headers = ['Name', 'Phone', 'Email', 'Tier', 'Total Spend', 'Orders']
        const rows = filteredCustomers.map(c => [
            c.full_name || '',
            c.phone || '',
            c.email || '',
            c.status_tier || '',
            formatCurrency(c.total_spend_minor ?? 0),
            String(c.order_count ?? 0)
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `customers_${selectedTier === 'all' ? 'all' : selectedTier}_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode)
        setSelectedIds(new Set())
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCustomers.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        const confirmed = await dialog.confirm(
            dict.customers.delete_bulk_confirm || `Are you sure you want to delete ${selectedIds.size} customers?`,
            'Delete Customers'
        )
        if (confirmed) {
            setIsDeleting(true)
            const res = await deleteCustomers(Array.from(selectedIds))
            setIsDeleting(false)

            if (res.success) {
                setIsSelectionMode(false)
                setSelectedIds(new Set())
                router.refresh()
            } else {
                await dialog.alert(res.error || 'Failed to delete customers', 'Error')
            }
        }
    }

    const currentTierLabel = selectedTier === 'all'
        ? 'All Tiers'
        : tiers.find(t => t.name === selectedTier)?.name || selectedTier

    return (
        <>
            <div className="space-y-3 animate-fade-in max-w-7xl mx-auto">
                {/* Page Header */}
                <PageHeader
                    label={dict.common.customers.toUpperCase()}
                    title={dict.customers.title}
                    subtitle={dict.customers.subtitle}
                />

                {/* Liquid Glass Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Left: View Toggle (Glass Pill) - Desktop only */}
                    {mounted && !isSelectionMode && (
                        <div
                            className="hidden sm:flex items-center p-1 rounded-full backdrop-blur-xl"
                            style={{
                                background: 'rgba(255,255,255,0.4)',
                                border: '1px solid rgba(142, 94, 30, 0.15)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                        >
                            <button
                                onClick={() => changeViewMode('card')}
                                className="p-2 rounded-full transition-all duration-200"
                                style={{
                                    background: viewMode === 'card' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'card' ? '#ffffff' : 'var(--theme-primary)',
                                    boxShadow: viewMode === 'card' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                }}
                                title="Card view"
                            >
                                <LayoutGrid className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => changeViewMode('list')}
                                className="p-2 rounded-full transition-all duration-200"
                                style={{
                                    background: viewMode === 'list' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'list' ? '#ffffff' : 'var(--theme-primary)',
                                    boxShadow: viewMode === 'list' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                }}
                                title="List view"
                            >
                                <List className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    {/* Spacer when no view toggle */}
                    {(isSelectionMode || !mounted) && <div className="hidden sm:block" />}

                    {/* Right: Action Buttons - pushed to end */}
                    <div className="flex items-center gap-4 sm:ms-auto">
                        {isSelectionMode ? (
                            <>
                                <span className="text-sm text-white/70 font-medium tabular-nums">
                                    {selectedIds.size} selected
                                </span>
                                <GlassButton
                                    variant="danger"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    disabled={selectedIds.size === 0 || isDeleting}
                                    isLoading={isDeleting}
                                    leftIcon={!isDeleting ? <Trash2 className="w-4 h-4" strokeWidth={2.5} /> : undefined}
                                >
                                    {dict.customers.delete || 'Delete'}
                                </GlassButton>
                                <GlassButton
                                    variant="silver"
                                    size="sm"
                                    onClick={toggleSelectionMode}
                                    leftIcon={<X className="w-4 h-4" strokeWidth={2.5} />}
                                >
                                    {dict.common?.cancel || 'Cancel'}
                                </GlassButton>
                            </>
                        ) : (
                            <>
                                {/* Desktop: Horizontal Layout */}
                                <div className="hidden sm:flex items-center gap-3">
                                    <button
                                        onClick={toggleSelectionMode}
                                        className="flex items-center justify-center px-4 py-2 rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all"
                                    >
                                        <BiSelectMultiple className="w-4 h-4" />
                                        <span className="ms-2 font-medium">{dict.common?.select || 'Select'}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center justify-center px-4 py-2 rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all"
                                    >
                                        <CiImport className="w-4 h-4" style={{ strokeWidth: 0.5 }} />
                                        <span className="ms-2 font-medium">Import</span>
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center justify-center px-4 py-2 rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all"
                                    >
                                        <CiExport className="w-4 h-4" style={{ strokeWidth: 0.5 }} />
                                        <span className="ms-2 font-medium">Export</span>
                                    </button>
                                    <Link href="/customers/new">
                                        <GlassButton
                                            variant="primary"
                                            size="sm"
                                            leftIcon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
                                        >
                                            {dict.customers.add_client}
                                        </GlassButton>
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <CustomerStatsCards customers={customers} tiers={tiers} />

                {/* Search & Filter Row */}
                {
                    !isSelectionMode && (
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Search - Expands to fill available space */}
                            <div className="flex-1 min-w-0">
                                <SearchInput placeholder={dict.customers.search_placeholder} />
                            </div>

                            {/* Tier Filter Dropdown - Fixed width, icon-only on mobile */}
                            <div className="relative flex-shrink-0">
                                <button
                                    onClick={() => setShowTierDropdown(!showTierDropdown)}
                                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all font-medium text-sm"
                                >
                                    <ChevronDown className={cn(
                                        "w-4 h-4 transition-transform",
                                        showTierDropdown && "rotate-180"
                                    )} />
                                    <span className="hidden sm:inline">{currentTierLabel}</span>
                                </button>

                                {showTierDropdown && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowTierDropdown(false)}
                                        />
                                        <div className="luxury-gradient-card absolute top-full end-0 mt-2 min-w-[160px] z-20 overflow-hidden p-1 rounded-xl">
                                            <button
                                                onClick={() => { setSelectedTier('all'); setShowTierDropdown(false) }}
                                                className={cn(
                                                    "w-full px-4 py-2.5 text-left text-sm rounded-lg hover:bg-[var(--theme-primary)]/10 transition-colors",
                                                    selectedTier === 'all' ? "bg-[var(--theme-primary)]/15 font-medium" : ""
                                                )}
                                            >
                                                All Tiers
                                            </button>
                                            {tiers.map(tier => (
                                                <button
                                                    key={tier.id}
                                                    onClick={() => { setSelectedTier(tier.name); setShowTierDropdown(false) }}
                                                    className={cn(
                                                        "w-full px-4 py-2.5 text-left text-sm rounded-lg hover:bg-[var(--theme-primary)]/10 transition-colors flex items-center gap-2",
                                                        selectedTier === tier.name ? "bg-[var(--theme-primary)]/15 font-medium" : ""
                                                    )}
                                                >
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: tier.color }}
                                                    />
                                                    {tier.name}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Customer List Views */}
                {
                    mounted && viewMode === 'card' ? (
                        <CustomerCardGrid
                            customers={filteredCustomers}
                            tiers={tiers}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                        />
                    ) : (
                        <>
                            <div className="hidden lg:block">
                                <CustomerListDesktop
                                    customers={filteredCustomers}
                                    tiers={tiers}
                                    isSelectionMode={isSelectionMode}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleSelect}
                                    onSelectAll={toggleSelectAll}
                                />
                            </div>
                            <div className="lg:hidden">
                                <CustomerListMobile
                                    customers={filteredCustomers}
                                    tiers={tiers}
                                    isSelectionMode={isSelectionMode}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleSelect}
                                />
                            </div>
                        </>
                    )
                }

                {/* Pagination Footer */}
                {
                    filteredCustomers.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t border-sand-200 dark:border-zinc-800">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-primary dark:text-white">1-{filteredCustomers.length}</span> of{' '}
                                <span className="font-medium text-primary dark:text-white">{customers.length}</span> customers
                                {selectedTier !== 'all' && (
                                    <span> ({selectedTier})</span>
                                )}
                            </p>
                        </div>
                    )
                }

                {/* Import Modal */}
                <CustomerImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => router.refresh()}
                />
            </div>
            {/* Floating Action Buttons - Mobile Only */}
            {!isSelectionMode && (
                <>
                    {/* Premium Blur Backdrop - covers EVERYTHING */}
                    {showFabMenu && (
                        <div
                            className="fixed inset-0 bg-white/60 backdrop-blur-xl z-[9999] sm:hidden transition-all duration-300"
                            onClick={() => setShowFabMenu(false)}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
                        />
                    )}

                    {/* FAB Container */}
                    <div className="fixed bottom-6 end-6 z-[10000] flex flex-col items-end gap-3 sm:hidden">
                        {/* Expandable Menu Items - Premium Glassy Design with Labels */}
                        <div className={cn(
                            "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
                            showFabMenu ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-8 pointer-events-none"
                        )}>
                            {/* Add Client Button - Premium Gradient */}
                            <Link href="/customers/new" onClick={() => setShowFabMenu(false)}>
                                <div className="flex items-center gap-3 justify-end me-1">
                                    <span className="text-sm font-medium text-gray-800 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg">
                                        Add Client
                                    </span>
                                    <button
                                        className="group relative w-10 h-10 rounded-xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 overflow-hidden"
                                        style={{
                                            background: `linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))`,
                                            boxShadow: '0 12px 40px var(--theme-primary)50, 0 0 0 1px rgba(255,255,255,0.1) inset'
                                        }}
                                        aria-label="Add Client"
                                    >
                                        {/* Glassy shine effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-40" />
                                        <IoPersonAddOutline className="relative w-5 h-5" style={{ color: 'var(--theme-text-primary)', strokeWidth: 1.5 }} />
                                    </button>
                                </div>
                            </Link>

                            {/* Select Button - Glassmorphism */}
                            <div className="flex items-center gap-3 justify-end me-1">
                                <span className="text-sm font-medium text-gray-800 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg">
                                    Select
                                </span>
                                <button
                                    onClick={() => { toggleSelectionMode(); setShowFabMenu(false); }}
                                    className="group relative w-10 h-10 rounded-xl shadow-xl flex items-center justify-center backdrop-blur-xl bg-white/90 border border-white/20 transition-all hover:scale-110 active:scale-95 overflow-hidden"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset'
                                    }}
                                    aria-label="Select"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                                    <BiSelectMultiple className="relative w-5 h-5" style={{ color: 'var(--theme-primary)', strokeWidth: 1 }} />
                                </button>
                            </div>

                            {/* Import Button - Glassmorphism */}
                            <div className="flex items-center gap-3 justify-end me-1">
                                <span className="text-sm font-medium text-gray-800 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg">
                                    Import
                                </span>
                                <button
                                    onClick={() => { setShowImportModal(true); setShowFabMenu(false); }}
                                    className="group relative w-10 h-10 rounded-xl shadow-xl flex items-center justify-center backdrop-blur-xl bg-white/90 border border-white/20 transition-all hover:scale-110 active:scale-95 overflow-hidden"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset'
                                    }}
                                    aria-label="Import"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                                    <CiImport className="relative w-5 h-5" style={{ color: 'var(--theme-primary)', strokeWidth: 1.5 }} />
                                </button>
                            </div>

                            {/* Export Button - Glassmorphism */}
                            <div className="flex items-center gap-3 justify-end me-1">
                                <span className="text-sm font-medium text-gray-800 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg">
                                    Export
                                </span>
                                <button
                                    onClick={() => { handleExport(); setShowFabMenu(false); }}
                                    className="group relative w-10 h-10 rounded-xl shadow-xl flex items-center justify-center backdrop-blur-xl bg-white/90 border border-white/20 transition-all hover:scale-110 active:scale-95 overflow-hidden"
                                    style={{
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset'
                                    }}
                                    aria-label="Export"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                                    <CiExport className="relative w-5 h-5" style={{ color: 'var(--theme-primary)', strokeWidth: 1.5 }} />
                                </button>
                            </div>
                        </div>

                        {/* Main FAB Toggle Button - Reduced Size */}
                        <button
                            onClick={() => setShowFabMenu(!showFabMenu)}
                            className={cn(
                                "group relative w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-500 overflow-hidden",
                                showFabMenu ? "rotate-45 scale-105" : "rotate-0 scale-100"
                            )}
                            style={{
                                background: `linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))`,
                                boxShadow: '0 16px 48px var(--theme-primary)60, 0 0 0 1px rgba(255,255,255,0.2) inset'
                            }}
                            aria-label={showFabMenu ? "Close menu" : "Open menu"}
                        >
                            {/* Animated glassy shine */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent transition-opacity duration-500",
                                showFabMenu ? "opacity-60" : "opacity-30"
                            )} />

                            {/* Pulse ring on open */}
                            {showFabMenu && (
                                <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-ping" />
                            )}

                            <Plus className="relative w-6 h-6" strokeWidth={3} style={{ color: 'var(--theme-text-primary)' }} />

                        </button>
                    </div>
                </>
            )}
        </>
    )
}
