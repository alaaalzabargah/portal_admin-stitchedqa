'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeSystem } from '@/lib/themes/context'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowLeft, Edit2, DollarSign, Award, TrendingUp, Package, Clock, CheckCircle } from 'lucide-react'
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
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/tailors')}
                            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit
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
        </div>
    )
}
