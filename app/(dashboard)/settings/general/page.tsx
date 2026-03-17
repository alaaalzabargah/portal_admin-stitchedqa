'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, AlertCircle, Plus, Trash2, Edit2, X, Palette, Lock, Award } from 'lucide-react'
import { ThemeSelector } from '@/components/settings/ThemeSelector'
import {
    getLoyaltyTiers,
    upsertLoyaltyTier,
    deleteLoyaltyTier,
    LoyaltyTier
} from '@/lib/settings'
import { recalculateCustomerTiersAction } from '../actions'
import { useLanguage } from '@/lib/i18n/context'
import { getLocalizedTierError } from '@/lib/loyalty/errors'
import { DEFAULT_TIER } from '@/lib/loyalty/constants'
import { useDialog } from '@/lib/dialog'
import { cn } from '@/lib/utils'

type Tab = 'appearance' | 'loyalty'

export default function GeneralSettingsPage() {
    const { t, locale } = useLanguage()
    const supabase = createClient()
    const dialog = useDialog()

    // Tab state
    const [activeTab, setActiveTab] = useState<Tab>('appearance')

    // State
    const [tiers, setTiers] = useState<LoyaltyTier[]>([])

    // Loading States
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Tier Management State
    const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null)
    const [newTierName, setNewTierName] = useState('')
    const [newTierAmount, setNewTierAmount] = useState<number>(0)
    const [newTierColor, setNewTierColor] = useState('#000000')
    const [isAddingTier, setIsAddingTier] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const tiersData = await getLoyaltyTiers(supabase)
            setTiers(tiersData)
        } catch (error) {
            console.error('Error loading settings:', error)
            setMessage({ type: 'error', text: 'Failed to load settings' })
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // --- Handlers ---

    const handleSaveTier = async (tier?: LoyaltyTier) => {
        const name = tier ? tier.name : newTierName
        const amount = tier ? tier.min_spend_minor / 100 : newTierAmount
        const color = tier ? tier.color : newTierColor

        if (!name) return

        setSaving(true)
        const error = await upsertLoyaltyTier(supabase, {
            id: tier?.id,
            name,
            min_spend_minor: amount * 100,
            color
        })

        if (!error) {
            setMessage({ type: 'success', text: t('settings.tierSaved') || 'Loyalty tier saved!' })
            recalculateCustomerTiersAction().catch(console.error)
            setEditingTier(null)
            setIsAddingTier(false)
            setNewTierName('')
            setNewTierAmount(0)
            setNewTierColor('#000000')
            await loadData()
        } else {
            const localizedError = getLocalizedTierError(error, locale)
            setMessage({ type: 'error', text: localizedError })
        }
        setSaving(false)
        setTimeout(() => setMessage(null), 5000)
    }

    const handleDeleteTier = async (id: string, tierName: string) => {
        const confirmMessage = t('settings.confirmDelete')
            ? t('settings.confirmDelete').replace('{tier}', tierName)
            : `Are you sure you want to delete "${tierName}" tier?`

        const confirmed = await dialog.confirm(
            confirmMessage,
            t('settings.deleteTier') || 'Delete Tier'
        )

        if (!confirmed) return

        setSaving(true)
        const error = await deleteLoyaltyTier(supabase, id)
        if (!error) {
            setMessage({ type: 'success', text: t('settings.tierDeleted') || 'Loyalty tier deleted.' })
            recalculateCustomerTiersAction().catch(console.error)
            await loadData()
        } else {
            const localizedError = getLocalizedTierError(error, locale)
            setMessage({ type: 'error', text: localizedError })
        }
        setSaving(false)
        setTimeout(() => setMessage(null), 5000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        )
    }

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: 'appearance', label: t('settings.general.appearance'), icon: Palette },
        { key: 'loyalty', label: 'Loyalty Tiers', icon: Award },
    ]

    return (
        <div className="animate-fade-in">
            {/* Toast */}
            {message && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl backdrop-blur-md border ${message.type === 'success'
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                        : 'bg-red-50/90 border-red-200 text-red-800'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="font-medium text-sm">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            )}

            {/* Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-black/[0.04] rounded-xl w-fit mb-6">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                                isActive
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ── Appearance Panel ── */}
            {activeTab === 'appearance' && (
                <ThemeSelector />
            )}

            {/* ── Loyalty Tiers Panel ── */}
            {activeTab === 'loyalty' && (
                <div className="space-y-3">
                    {/* Add button */}
                    {!isAddingTier && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {tiers.length} {tiers.length === 1 ? 'tier' : 'tiers'} configured
                            </p>
                            <button
                                onClick={() => setIsAddingTier(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Tier
                            </button>
                        </div>
                    )}

                    {/* Add New Tier Form */}
                    {isAddingTier && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <input
                                type="text"
                                value={newTierName}
                                onChange={(e) => setNewTierName(e.target.value)}
                                className="flex-1 px-3 py-1.5 border border-sand-200 rounded-lg text-sm w-full bg-white"
                                placeholder="e.g. Platinum"
                                autoFocus
                            />
                            <div className="relative w-full sm:w-28">
                                <input
                                    type="number"
                                    value={newTierAmount}
                                    onChange={(e) => setNewTierAmount(parseFloat(e.target.value) || 0)}
                                    className="px-3 py-1.5 pr-10 border border-sand-200 rounded-lg text-sm w-full bg-white"
                                    placeholder="0"
                                    min="0"
                                />
                                <span className="absolute right-2.5 top-1.5 text-[10px] text-muted-foreground pointer-events-none">QAR</span>
                            </div>
                            <input
                                type="color"
                                value={newTierColor}
                                onChange={(e) => setNewTierColor(e.target.value)}
                                className="w-8 h-8 p-0.5 rounded cursor-pointer border border-sand-200 bg-white flex-shrink-0"
                            />
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => handleSaveTier()} disabled={!newTierName || saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40"><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => setIsAddingTier(false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}

                    {/* Tier rows */}
                    {tiers.sort((a, b) => a.min_spend_minor - b.min_spend_minor).map((tier) => (
                        <div
                            key={tier.id}
                            className="group flex items-center gap-3 p-3 bg-white/60 border border-sand-200 rounded-xl hover:border-accent/20 transition-all"
                        >
                            {editingTier?.id === tier.id ? (
                                <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                                    <input
                                        type="text"
                                        value={editingTier.name}
                                        onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                                        disabled={tier.name === DEFAULT_TIER.name}
                                        className="flex-1 px-3 py-1.5 border border-sand-200 rounded-lg text-sm w-full bg-white disabled:opacity-50"
                                        placeholder="Name"
                                    />
                                    <div className="relative w-full sm:w-28">
                                        <input
                                            type="number"
                                            value={editingTier.min_spend_minor / 100}
                                            onChange={(e) => setEditingTier({ ...editingTier, min_spend_minor: (parseFloat(e.target.value) || 0) * 100 })}
                                            disabled={tier.name === DEFAULT_TIER.name}
                                            className="px-3 py-1.5 pr-10 border border-sand-200 rounded-lg text-sm w-full bg-white disabled:opacity-50"
                                        />
                                        <span className="absolute right-2.5 top-1.5 text-[10px] text-muted-foreground pointer-events-none">QAR</span>
                                    </div>
                                    <input
                                        type="color"
                                        value={editingTier.color || '#000000'}
                                        onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })}
                                        className="w-8 h-8 p-0.5 rounded cursor-pointer border border-sand-200 bg-white flex-shrink-0"
                                    />
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleSaveTier(editingTier)} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingTier(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-2 ring-white flex-shrink-0"
                                        style={{ backgroundColor: tier.color || '#000000' }}
                                    >
                                        {tier.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-primary truncate">{tier.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{(tier.min_spend_minor / 100).toLocaleString()} QAR</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {tier.name === DEFAULT_TIER.name ? (
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                                        ) : (
                                            <>
                                                <button onClick={() => setEditingTier(tier)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-sand-100 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDeleteTier(tier.id, tier.name)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {!isAddingTier && tiers.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-sand-200 rounded-xl">
                            <p className="text-sm text-muted-foreground">No loyalty tiers defined.</p>
                            <button onClick={() => setIsAddingTier(true)} className="text-sm font-semibold text-accent hover:underline mt-1">Create First Tier</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
