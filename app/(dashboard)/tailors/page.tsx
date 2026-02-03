'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useThemeSystem } from '@/lib/themes/context'
import { PageHeader } from '@/components/ui/PageHeader'
import { Plus, Edit2, Trash2, User, Phone, Award, DollarSign, MapPin, Mail, TrendingUp, Users, DollarSignIcon } from 'lucide-react'
import type { Tailor } from '@/lib/types/tailor'
import { formatMoney, calculateCapacityPercentage } from '@/lib/types/tailor'

export default function TailorsPage() {
    const supabase = createClient()
    const { themeConfig } = useThemeSystem()
    const [tailors, setTailors] = useState<Tailor[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingTailor, setEditingTailor] = useState<Tailor | null>(null)

    // Form state
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [location, setLocation] = useState('')
    const [specialty, setSpecialty] = useState('')
    const [maxCapacity, setMaxCapacity] = useState('10')
    const [commissionRate, setCommissionRate] = useState('0')
    const [status, setStatus] = useState<'active' | 'inactive'>('active')

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        totalAssignments: 0,
        totalPendingPayouts: 0
    })

    useEffect(() => {
        loadTailors()
        loadStats()
    }, [])

    async function loadTailors() {
        const { data, error } = await supabase
            .from('tailors')
            .select('*')
            .order('full_name', { ascending: true })

        if (!error && data) {
            setTailors(data)
        }
        setLoading(false)
    }

    async function loadStats() {
        const { data: tailors } = await supabase.from('tailors').select('status, current_load, pending_payout_minor')

        if (tailors) {
            setStats({
                total: tailors.length,
                active: tailors.filter(t => t.status === 'active').length,
                totalAssignments: tailors.reduce((sum, t) => sum + (t.current_load || 0), 0),
                totalPendingPayouts: tailors.reduce((sum, t) => sum + (t.pending_payout_minor || 0), 0)
            })
        }
    }

    const openAddModal = () => {
        resetForm()
        setShowAddModal(true)
        setEditingTailor(null)
    }

    const openEditModal = (tailor: Tailor) => {
        setFullName(tailor.full_name)
        setPhone(tailor.phone || '')
        setEmail(tailor.email || '')
        setLocation(tailor.location || '')
        setSpecialty(tailor.specialty || '')
        setMaxCapacity(String(tailor.max_capacity || 10))
        setCommissionRate(String(tailor.commission_rate || 0))
        setStatus(tailor.status as 'active' | 'inactive')
        setEditingTailor(tailor)
        setShowAddModal(true)
    }

    const resetForm = () => {
        setFullName('')
        setPhone('')
        setEmail('')
        setLocation('')
        setSpecialty('')
        setMaxCapacity('10')
        setCommissionRate('0')
        setStatus('active')
    }

    const handleSave = async () => {
        if (!fullName.trim()) {
            alert('Name is required')
            return
        }

        const tailorData = {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            location: location.trim() || null,
            specialty: specialty.trim() || null,
            max_capacity: parseInt(maxCapacity) || 10,
            commission_rate: parseFloat(commissionRate) || 0,
            status
        }

        if (editingTailor) {
            // Update existing
            const { error } = await supabase
                .from('tailors')
                .update(tailorData)
                .eq('id', editingTailor.id)

            if (!error) {
                await loadTailors()
                await loadStats()
                setShowAddModal(false)
            } else {
                alert('Failed to update tailor: ' + error.message)
            }
        } else {
            // Create new
            const { error } = await supabase
                .from('tailors')
                .insert(tailorData)

            if (!error) {
                await loadTailors()
                await loadStats()
                setShowAddModal(false)
                resetForm()
            } else {
                alert('Failed to create tailor: ' + error.message)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tailor?')) return

        const { error } = await supabase
            .from('tailors')
            .delete()
            .eq('id', id)

        if (!error) {
            await loadTailors()
        } else {
            alert('Failed to delete: ' + error.message)
        }
    }

    const getTailorInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-8">
            <PageHeader
                label="TAILORS"
                title="Tailor Management"
                subtitle="Manage your production team"
            />

            {/* Stats Cards - Desktop horizontal, Mobile vertical */}
            <div className="hidden md:grid grid-cols-4 gap-4">
                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeConfig.colors.primary}20` }}>
                            <Users className="w-5 h-5" style={{ color: themeConfig.colors.primary }} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Total Tailors</div>
                        </div>
                    </div>
                </div>

                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.active}</div>
                            <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                    </div>
                </div>

                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
                            <Award className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
                            <div className="text-sm text-muted-foreground">Active Jobs</div>
                        </div>
                    </div>
                </div>

                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                            <DollarSign className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{formatMoney(stats.totalPendingPayouts)}</div>
                            <div className="text-sm text-muted-foreground">Pending Payouts</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Stats */}
            <div className="md:hidden space-y-3">
                <div className="luxury-gradient-card p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Total Tailors</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                            <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                    </div>
                </div>
                <div className="luxury-gradient-card p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-2xl font-bold text-purple-600">{stats.totalAssignments}</div>
                            <div className="text-sm text-muted-foreground">Active Jobs</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-orange-600">{formatMoney(stats.totalPendingPayouts)}</div>
                            <div className="text-sm text-muted-foreground">Pending</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Tailor Button */}
            <div className="flex justify-end">
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primaryDark}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primary}
                >
                    <Plus className="w-4 h-4" />
                    Add Tailor
                </button>
            </div>

            {/* Tailors Grid */}
            {loading ? (
                <div className="text-center text-muted-foreground py-12">Loading...</div>
            ) : tailors.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    <p>No tailors yet. Click "Add Tailor" to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tailors.map(tailor => {
                        const capacityPct = calculateCapacityPercentage(tailor.current_load, tailor.max_capacity)

                        return (
                            <Link
                                key={tailor.id}
                                href={`/tailors/${tailor.id}`}
                                className="luxury-gradient-card p-6 hover:shadow-lg transition-all cursor-pointer group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold" style={{ backgroundColor: `${themeConfig.colors.primary}20`, color: themeConfig.colors.primary }}>
                                            {getTailorInitials(tailor.full_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{tailor.full_name}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full inline-block ${tailor.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {tailor.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(tailor); }}
                                            className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(tailor.id); }}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Capacity Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Capacity</span>
                                        <span className="font-medium">{tailor.current_load}/{tailor.max_capacity}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${Math.min(capacityPct, 100)}%`,
                                                backgroundColor: capacityPct > 80 ? '#ef4444' : capacityPct > 50 ? '#f59e0b' : '#10b981'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-2 text-sm">
                                    {tailor.location && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{tailor.location}</span>
                                        </div>
                                    )}
                                    {tailor.email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{tailor.email}</span>
                                        </div>
                                    )}
                                    {tailor.phone && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{tailor.phone}</span>
                                        </div>
                                    )}
                                    {tailor.specialty && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Award className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{tailor.specialty}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Stats */}
                                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <div className="text-lg font-semibold text-green-600">{tailor.quality_score.toFixed(0)}%</div>
                                        <div className="text-xs text-muted-foreground">Quality</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-semibold" style={{ color: themeConfig.colors.primary }}>{formatMoney(tailor.ytd_earnings_minor)}</div>
                                        <div className="text-xs text-muted-foreground">YTD Earnings</div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
                        <h2 className="text-xl font-bold text-primary">
                            {editingTailor ? 'Edit Tailor' : 'Add New Tailor'}
                        </h2>

                        {/* Form */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="Ahmed Ali"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Phone / Telegram Chat ID
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="123456789 (Telegram Chat ID)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="ahmed@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="Milan, Italy"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Specialty
                                </label>
                                <input
                                    type="text"
                                    value={specialty}
                                    onChange={e => setSpecialty(e.target.value)}
                                    className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="e.g., Sewing, Cutting, QC"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">
                                        Max Capacity
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={maxCapacity}
                                        onChange={e => setMaxCapacity(e.target.value)}
                                        className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                        placeholder="10"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">
                                        Commission Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={commissionRate}
                                        onChange={e => setCommissionRate(e.target.value)}
                                        className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                                    className="w-full px-3 py-2 border border-sand-200 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-white"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 border border-sand-200 rounded-lg hover:bg-sand-50 transition-colors text-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                                style={{ backgroundColor: themeConfig.colors.primary }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primaryDark}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primary}
                            >
                                {editingTailor ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
