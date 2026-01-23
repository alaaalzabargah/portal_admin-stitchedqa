'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, AlertCircle, Plus, Trash2, Edit2, X, Palette, Lock } from 'lucide-react'
import { ThemeSelector } from '@/components/settings/ThemeSelector'
import {
    getLoyaltyTiers,
    upsertLoyaltyTier,
    deleteLoyaltyTier,
    LoyaltyTier
} from '@/lib/settings'
import { recalculateCustomerTiersAction } from '../actions'
import { useLanguage } from '@/lib/i18n/context'
import { GlassButton } from '@/components/ui/GlassButton'
import { getLocalizedTierError } from '@/lib/loyalty/errors'
import { DEFAULT_TIER } from '@/lib/loyalty/constants'
import { useDialog } from '@/lib/dialog'
import { PageHeader } from '@/components/ui/PageHeader'

export default function GeneralSettingsPage() {
    const { t, locale } = useLanguage()
    const supabase = createClient()
    const dialog = useDialog()

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

            // Trigger background recalculation
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
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20 relative px-4 md:px-8">
            {/* Page Header */}
            <PageHeader
                label="SETTINGS"
                title="General Settings"
                subtitle="Configure your store appearance and customer loyalty tiers"
            />

            {/* Toast Notification */}
            {message && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl backdrop-blur-md border ${message.type === 'success'
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                        : 'bg-red-50/90 border-red-200 text-red-800'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium text-sm">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            <div className="max-w-3xl space-y-8">
                {/* Appearance / Theme */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                            <Palette className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-primary dark:text-white">{t('settings.general.appearance')}</h2>
                            <p className="text-sm text-muted-foreground">{t('settings.general.appearance_subtitle')}</p>
                        </div>
                    </div>

                    <div className="bg-white/65 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
                        <ThemeSelector />
                    </div>
                </section>

                {/* Loyalty Tiers */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-primary dark:text-white">Loyalty Tiers</h2>
                            <p className="text-sm text-muted-foreground">Configure spending thresholds and tier colors.</p>
                        </div>
                        <GlassButton onClick={() => setIsAddingTier(true)} variant="ghost" size="sm" leftIcon={<Plus className="w-4 h-4" />}>Add Tier</GlassButton>
                    </div>

                    <div className="bg-white/65 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/20 rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] space-y-4">
                        {/* List Tiers */}
                        {tiers.sort((a, b) => a.min_spend_minor - b.min_spend_minor).map((tier) => (
                            <div key={tier.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-sand-50/50 dark:bg-zinc-900/50 border border-sand-200 dark:border-zinc-700/50 rounded-xl group hover:border-accent/30 transition-all gap-4">
                                {editingTier?.id === tier.id ? (
                                    // Edit Mode
                                    <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center gap-4 w-full">
                                        <div className="flex-1 w-full sm:w-auto space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">
                                                Name {tier.name === DEFAULT_TIER.name && <Lock className="w-3 h-3 inline ml-1" />}
                                            </label>
                                            <input
                                                type="text"
                                                value={editingTier.name}
                                                onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                                                disabled={tier.name === DEFAULT_TIER.name}
                                                className="px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm w-full bg-white dark:bg-zinc-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="w-full sm:w-32 space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">
                                                Min Spend {tier.name === DEFAULT_TIER.name && <Lock className="w-3 h-3 inline ml-1" />}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={editingTier.min_spend_minor / 100}
                                                    onChange={(e) => setEditingTier({ ...editingTier, min_spend_minor: (parseFloat(e.target.value) || 0) * 100 })}
                                                    disabled={tier.name === DEFAULT_TIER.name}
                                                    className="px-3 py-2 pr-10 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm w-full bg-white dark:bg-zinc-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-muted-foreground pointer-events-none">QAR</span>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-auto space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Color</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={editingTier.color || '#000000'} onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })} className="w-9 h-9 p-1 rounded cursor-pointer border border-sand-200 dark:border-zinc-600 bg-white dark:bg-zinc-800" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto w-full sm:w-auto justify-end pt-5">
                                            <button onClick={() => handleSaveTier(editingTier)} disabled={saving} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><CheckCircle className="w-5 h-5" /></button>
                                            <button onClick={() => setEditingTier(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-xs text-white shadow-sm ring-2 ring-white dark:ring-zinc-800" style={{ backgroundColor: tier.color || '#000000' }}>
                                                {tier.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-primary dark:text-white">{tier.name}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>Min: {(tier.min_spend_minor / 100).toLocaleString()} QAR</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                            {tier.name === DEFAULT_TIER.name ? (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1 bg-sand-100 dark:bg-zinc-700 rounded-lg">
                                                    <Lock className="w-3 h-3" />
                                                    <span className="hidden sm:inline">{t('settings.systemTier') || 'System'}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => setEditingTier(tier)} className="p-2 text-muted-foreground hover:text-primary hover:bg-sand-100 dark:hover:bg-zinc-700 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteTier(tier.id, tier.name)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Add New Tier Form */}
                        {isAddingTier && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-accent/5 border border-accent/20 rounded-xl animate-in fade-in slide-in-from-top-2 gap-4">
                                <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center gap-4 w-full">
                                    <div className="flex-1 w-full sm:w-auto space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                                        <input type="text" value={newTierName} onChange={(e) => setNewTierName(e.target.value)} className="px-3 py-2 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm w-full bg-white dark:bg-zinc-800 dark:text-white" placeholder="e.g. Platinum" autoFocus />
                                    </div>
                                    <div className="w-full sm:w-32 space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Min Spend</label>
                                        <div className="relative">
                                            <input type="number" value={newTierAmount} onChange={(e) => setNewTierAmount(parseFloat(e.target.value) || 0)} className="px-3 py-2 pr-10 border border-sand-200 dark:border-zinc-600 rounded-lg text-sm w-full bg-white dark:bg-zinc-800 dark:text-white" placeholder="0" min="0" />
                                            <span className="absolute right-3 top-2 text-xs text-muted-foreground pointer-events-none">QAR</span>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Color</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={newTierColor} onChange={(e) => setNewTierColor(e.target.value)} className="w-9 h-9 p-1 rounded cursor-pointer border border-sand-200 dark:border-zinc-600 bg-white dark:bg-zinc-800" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-auto w-full sm:w-auto justify-end pt-5">
                                        <button onClick={() => handleSaveTier()} disabled={!newTierName || saving} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><CheckCircle className="w-5 h-5" /></button>
                                        <button onClick={() => setIsAddingTier(false)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isAddingTier && tiers.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-sand-200 dark:border-zinc-700 rounded-xl">
                                <p className="text-sm text-muted-foreground">No loyalty tiers defined.</p>
                                <button onClick={() => setIsAddingTier(true)} className="text-sm font-semibold text-accent hover:underline mt-2">Create First Tier</button>
                            </div>
                        )}

                    </div>
                </section>

            </div>
        </div>
    )
}
