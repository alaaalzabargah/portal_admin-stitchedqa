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
import { CustomersListFAB } from '@/components/customers/CustomersListFAB'

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
                                        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all font-medium"
                                    >
                                        <BiSelectMultiple className="w-4 h-4" />
                                        <span className="ms-2">{dict.common?.select || 'Select'}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all font-medium"
                                    >
                                        <CiImport className="w-4 h-4" style={{ strokeWidth: 0.5 }} />
                                        <span className="ms-2">Import</span>
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-xl border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all font-medium"
                                    >
                                        <CiExport className="w-4 h-4" style={{ strokeWidth: 0.5 }} />
                                        <span className="ms-2">Export</span>
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
                        <div className="flex items-center justify-between pt-4 border-t border-sand-200">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium text-primary">1-{filteredCustomers.length}</span> of{' '}
                                <span className="font-medium text-primary">{customers.length}</span> customers
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

            {/* Floating Action Button - Hidden on desktop, visible on mobile */}
            {!isSelectionMode && (
                <div className="block sm:hidden">
                    <CustomersListFAB
                        onSelectClick={toggleSelectionMode}
                        onImportClick={() => setShowImportModal(true)}
                        onExportClick={handleExport}
                    />
                </div>
            )}
        </>
    )
}
