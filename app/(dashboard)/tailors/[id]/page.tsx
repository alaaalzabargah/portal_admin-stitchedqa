'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeSystem } from '@/lib/themes/context'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowLeft, Edit2, DollarSign, Award, TrendingUp, Package, Clock, CheckCircle, Bell, Send, Loader2, X, Save } from 'lucide-react'
import type { Tailor, TailorAssignment } from '@/lib/types/tailor'
import { formatMoney, calculateCapacityPercentage, getStatusLabel, getStatusColor } from '@/lib/types/tailor'

export default function TailorDetailPage() {
    const router = useRouter()
    const params = useParams()
    const tailorId = params.id as string

    const supabase = createClient()
    const { themeConfig } = useThemeSystem()

    const [tailor, setTailor] = useState<Tailor | null>(null)
    const [assignments, setAssignments] = useState<TailorAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [notifying, setNotifying] = useState(false)
    const [notificationResult, setNotificationResult] = useState<{ message: string; success: boolean } | null>(null)

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState({
        full_name: '',
        phone: '',
        telegram_chat_id: '',
        email: '',
        location: '',
        specialty: '',
        max_capacity: '10',
        commission_rate: '0',
        status: 'active' as 'active' | 'inactive'
    })

    function openEditModal() {
        if (!tailor) return
        setEditForm({
            full_name: tailor.full_name,
            phone: tailor.phone || '',
            telegram_chat_id: tailor.telegram_chat_id || '',
            email: tailor.email || '',
            location: tailor.location || '',
            specialty: tailor.specialty || '',
            max_capacity: String(tailor.max_capacity || 10),
            commission_rate: String(tailor.commission_rate || 0),
            status: tailor.status as 'active' | 'inactive'
        })
        setShowEditModal(true)
    }

    async function handleSaveEdit() {
        if (!tailor || !editForm.full_name.trim()) {
            alert('Name is required')
            return
        }
        setSaving(true)
        const { error } = await supabase
            .from('tailors')
            .update({
                full_name: editForm.full_name.trim(),
                phone: editForm.phone.trim() || null,
                telegram_chat_id: editForm.telegram_chat_id.trim() || null,
                email: editForm.email.trim() || null,
                location: editForm.location.trim() || null,
                specialty: editForm.specialty.trim() || null,
                max_capacity: parseInt(editForm.max_capacity) || 10,
                commission_rate: parseFloat(editForm.commission_rate) || 0,
                status: editForm.status
            })
            .eq('id', tailor.id)

        if (error) {
            alert('Failed to update: ' + error.message)
        } else {
            setShowEditModal(false)
            await loadTailorData()
        }
        setSaving(false)
    }

    async function sendTestNotification() {
        if (!tailor) return
        setNotifying(true)
        setNotificationResult(null)
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'test', tailorId: tailor.id })
            })
            const data = await res.json()
            if (data.success) {
                setNotificationResult({ message: `✅ Test sent via ${data.channel}`, success: true })
            } else {
                setNotificationResult({ message: data.error || 'Failed to send', success: false })
            }
        } catch {
            setNotificationResult({ message: 'Network error', success: false })
        }
        setNotifying(false)
        setTimeout(() => setNotificationResult(null), 4000)
    }

    useEffect(() => {
        if (tailorId) {
            loadTailorData()
        }
    }, [tailorId])

    async function loadTailorData() {
        console.log('Loading tailor with ID:', tailorId)

        // Load tailor details
        const { data: tailorData, error: tailorError } = await supabase
            .from('tailors')
            .select('*')
            .eq('id', tailorId)
            .single()

        if (tailorError) {
            console.error('Error loading tailor:', tailorError)
            setLoading(false)
            return
        }

        console.log('Loaded tailor:', tailorData)
        setTailor(tailorData)

        // Load assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('tailor_assignments')
            .select('*')
            .eq('tailor_id', tailorId)
            .order('assigned_date', { ascending: false })

        if (assignmentsError) {
            console.error('Error loading assignments:', assignmentsError)
        } else {
            console.log('Loaded assignments:', assignmentsData?.length || 0)
        }

        setAssignments(assignmentsData || [])
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        )
    }

    if (!tailor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="text-xl text-muted-foreground">Tailor not found</div>
                <button
                    onClick={() => router.push('/tailors')}
                    className="px-4 py-2 text-white rounded-lg"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                >
                    Back to Tailors
                </button>
            </div>
        )
    }

    const capacityPct = calculateCapacityPercentage(tailor.current_load, tailor.max_capacity)
    const activeAssignments = assignments.filter(a =>
        ['assigned', 'in_progress', 'completed', 'qc_review', 'rework'].includes(a.status)
    )

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-8">
            {/* Back Button */}
            <button
                onClick={() => router.push('/tailors')}
                className="flex items-center gap-2 text-muted-foreground hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Tailors
            </button>

            {/* Profile Header */}
            <div className="luxury-gradient-card p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                            style={{ backgroundColor: `${themeConfig.colors.primary}20`, color: themeConfig.colors.primary }}
                        >
                            {tailor.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{tailor.full_name}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                {tailor.specialty && (
                                    <span className="text-sm text-muted-foreground">{tailor.specialty}</span>
                                )}
                                {tailor.location && (
                                    <span className="text-sm text-muted-foreground">• {tailor.location}</span>
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full ${tailor.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {tailor.status}
                                </span>
                            </div>
                            {tailor.email && (
                                <div className="text-sm text-muted-foreground mt-1">{tailor.email}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={openEditModal}
                            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={sendTestNotification}
                            disabled={notifying}
                            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Test Notify
                        </button>
                        <button
                            className="px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2"
                            style={{ backgroundColor: themeConfig.colors.primary }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primaryDark}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primary}
                        >
                            <DollarSign className="w-4 h-4" />
                            Record Payment
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {notificationResult && (
                <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in ${notificationResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <Bell className="w-4 h-4" />
                    {notificationResult.message}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{tailor.current_load}/{tailor.max_capacity}</div>
                            <div className="text-sm text-muted-foreground">Active Load</div>
                        </div>
                    </div>
                    <div className="mt-3">
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
                </div>

                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeConfig.colors.primary}20` }}>
                            <DollarSign className="w-5 h-5" style={{ color: themeConfig.colors.primary }} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{formatMoney(tailor.ytd_earnings_minor)}</div>
                            <div className="text-sm text-muted-foreground">YTD Earnings</div>
                        </div>
                    </div>
                </div>

                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{formatMoney(tailor.pending_payout_minor)}</div>
                            <div className="text-sm text-muted-foreground">Pending Payout</div>
                        </div>
                    </div>
                </div>

                <div className="luxury-gradient-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                            <Award className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{tailor.quality_score.toFixed(0)}%</div>
                            <div className="text-sm text-muted-foreground">Quality Score</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="luxury-gradient-card p-4 text-center">
                    <div className="text-3xl font-bold" style={{ color: themeConfig.colors.primary }}>
                        {tailor.total_jobs_completed}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Jobs Completed</div>
                </div>

                <div className="luxury-gradient-card p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">
                        {tailor.average_turnaround_days.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Avg Days per Job</div>
                </div>

                <div className="luxury-gradient-card p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                        {tailor.on_time_delivery_rate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">On-Time Delivery</div>
                </div>
            </div>

            {/* Active Assignments */}
            <div className="luxury-gradient-card p-6">
                <h2 className="text-xl font-bold mb-4">Active Assignments ({activeAssignments.length})</h2>

                {activeAssignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No active assignments
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Item Type</th>
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Quantity</th>
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Due Date</th>
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeAssignments.map(assignment => (
                                    <tr key={assignment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-2">
                                            <div className="font-medium">{assignment.item_type}</div>
                                            {assignment.item_description && (
                                                <div className="text-sm text-muted-foreground">{assignment.item_description}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-sm">{assignment.quantity}</td>
                                        <td className="py-3 px-2 text-sm">
                                            {new Date(assignment.due_date).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-2 font-medium">
                                            {formatMoney(assignment.total_amount_minor)}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span
                                                className="text-xs px-2 py-1 rounded-full text-white"
                                                style={{ backgroundColor: getStatusColor(assignment.status) }}
                                            >
                                                {getStatusLabel(assignment.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* All Assignments History */}
            <div className="luxury-gradient-card p-6">
                <h2 className="text-xl font-bold mb-4">Assignment History ({assignments.length} total)</h2>

                {assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No assignments yet
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assignments.slice(0, 10).map(assignment => (
                            <div
                                key={assignment.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="font-medium">{assignment.item_type}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}
                                        {assignment.completed_date && ` • Completed: ${new Date(assignment.completed_date).toLocaleDateString()}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-medium">{formatMoney(assignment.total_amount_minor)}</div>
                                        <div className="text-sm text-muted-foreground">{assignment.quantity} pcs</div>
                                    </div>
                                    <span
                                        className="text-xs px-2 py-1 rounded-full text-white whitespace-nowrap"
                                        style={{ backgroundColor: getStatusColor(assignment.status) }}
                                    >
                                        {getStatusLabel(assignment.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold" style={{ color: themeConfig.colors.primary }}>Edit Tailor</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                    style={{ '--tw-ring-color': themeConfig.colors.primary } as any}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                    placeholder="+974XXXXXXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</label>
                                <input
                                    type="text"
                                    value={editForm.telegram_chat_id}
                                    onChange={e => setEditForm({ ...editForm, telegram_chat_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                    placeholder="e.g. 123456789"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                                <input
                                    type="text"
                                    value={editForm.specialty}
                                    onChange={e => setEditForm({ ...editForm, specialty: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                    placeholder="e.g., Sewing, Cutting, QC"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editForm.max_capacity}
                                        onChange={e => setEditForm({ ...editForm, max_capacity: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={editForm.commission_rate}
                                        onChange={e => setEditForm({ ...editForm, commission_rate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none bg-white"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: themeConfig.colors.primary }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primaryDark}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = themeConfig.colors.primary}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
