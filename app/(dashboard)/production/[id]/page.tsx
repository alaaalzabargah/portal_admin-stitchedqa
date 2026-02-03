'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Package, User, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ProductionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [assignment, setAssignment] = useState<any>(null)
    const [statusHistory, setStatusHistory] = useState<any[]>([])

    useEffect(() => {
        loadAssignment()
    }, [params.id])

    async function loadAssignment() {
        const { data, error } = await supabase
            .from('production_assignments')
            .select(`
                *,
                order_items (
                    *,
                    orders (
                        *,
                        customers (
                            id,
                            full_name,
                            phone,
                            email
                        )
                    )
                ),
                tailors (
                    *
                )
            `)
            .eq('id', params.id)
            .single()

        if (!error && data) {
            setAssignment(data)
            await loadStatusHistory()
        }
        setLoading(false)
    }

    async function loadStatusHistory() {
        const { data } = await supabase
            .from('production_status_history')
            .select('*')
            .eq('assignment_id', params.id)
            .order('changed_at', { ascending: false })

        if (data) {
            setStatusHistory(data)
        }
    }

    const getHealthStatus = () => {
        if (!assignment?.assigned_at || !assignment?.target_due_at) {
            return { days: 0, total: 0, percent: 0, status: 'No deadline set' }
        }

        const now = new Date().getTime()
        const assigned = new Date(assignment.assigned_at).getTime()
        const due = new Date(assignment.target_due_at).getTime()
        const elapsed = now - assigned
        const total = due - assigned
        const percent = Math.min((elapsed / total) * 100, 100)
        const daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24))
        const totalDays = Math.floor(total / (1000 * 60 * 60 * 24))

        return { days: daysElapsed, total: totalDays, percent, status: 'active' }
    }

    const handleMoveStage = async () => {
        const stageOrder = ['pending', 'cutting', 'sewing', 'qc', 'ready', 'delivered']
        const currentIndex = stageOrder.indexOf(assignment.stage)
        const nextStage = stageOrder[Math.min(currentIndex + 1, stageOrder.length - 1)]

        const response = await fetch(`/api/production/assignments/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: nextStage })
        })

        if (response.ok) {
            await loadAssignment()
        }
    }

    const handleMarkPaid = async () => {
        const response = await fetch(`/api/production/assignments/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_paid: true })
        })

        if (response.ok) {
            await loadAssignment()
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!assignment) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500">Assignment not found</p>
                    <button onClick={() => router.push('/production')} className="mt-4 text-orange-500 hover:underline">
                        Back to Production
                    </button>
                </div>
            </div>
        )
    }

    const health = getHealthStatus()
    const customer = assignment.order_items?.orders?.customers
    const order = assignment.order_items?.orders
    const item = assignment.order_items

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => router.push('/production')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Production
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900">{item?.product_name || 'Production Order'}</h1>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                    {assignment.stage.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Customer: {customer?.full_name || 'Unknown'}</span>
                                <span>•</span>
                                <span>Order #{order?.external_id || order?.id}</span>
                                <span>•</span>
                                <span>Due: {assignment.target_due_at ? new Date(assignment.target_due_at).toLocaleDateString() : 'Not set'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Message
                            </button>
                            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Pattern
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time-Aware Status */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Time-Aware Status</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                {health.days} <span className="text-lg text-gray-500">elapsed of {health.total} days</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-bold text-orange-500">{Math.round(health.percent)}%</p>
                            <p className="text-sm text-gray-500">Completion</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all"
                            style={{ width: `${health.percent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Product Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex gap-6">
                                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-16 h-16 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Product</p>
                                            <p className="font-medium text-gray-900">{item?.product_name}</p>
                                        </div>
                                        {item?.variant_title && (
                                            <div>
                                                <p className="text-gray-500">Variant</p>
                                                <p className="font-medium text-gray-900">{item.variant_title}</p>
                                            </div>
                                        )}
                                        {item?.size && (
                                            <div>
                                                <p className="text-gray-500">Size</p>
                                                <p className="font-medium text-gray-900">{item.size}</p>
                                            </div>
                                        )}
                                        {item?.color && (
                                            <div>
                                                <p className="text-gray-500">Color</p>
                                                <p className="font-medium text-gray-900">{item.color}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-gray-500">Quantity</p>
                                            <p className="font-medium text-gray-900">{item?.quantity || 1} pc</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Unit Price</p>
                                            <p className="font-medium text-gray-900">QAR {((item?.unit_price_minor || 0) / 100).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Production Cost</p>
                                            <p className="font-medium text-gray-900">QAR {(assignment.cost_price_minor / 100).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Margin</p>
                                            <p className="font-medium text-green-600">
                                                QAR {(((item?.unit_price_minor || 0) - assignment.cost_price_minor) / 100).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tailor Assignment */}
                        {assignment.tailors && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Tailor</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                                        {assignment.tailors.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{assignment.tailors.full_name}</p>
                                        <p className="text-sm text-gray-500">{assignment.tailors.specialty || 'Tailor'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {assignment.notes && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                                <p className="text-gray-700">{assignment.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Actions & Timeline */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-gray-900 rounded-xl p-6 text-white">
                            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                {assignment.stage !== 'ready' && assignment.stage !== 'delivered' && (
                                    <button
                                        onClick={handleMoveStage}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <span className="text-sm">Move to Next Stage</span>
                                        <span className="text-orange-400">→</span>
                                    </button>
                                )}
                                {assignment.stage === 'ready' && !assignment.is_paid && (
                                    <button
                                        onClick={handleMarkPaid}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                                    >
                                        <span className="text-sm">Mark as Paid</span>
                                        <DollarSign className="w-4 h-4" />
                                    </button>
                                )}
                                <button className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-sm">Reassign Tailor</span>
                                    <User className="w-4 h-4" />
                                </button>
                                <button className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-sm">Update Delivery Date</span>
                                    <Calendar className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Production Log */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Production Log</h3>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    Active
                                </span>
                            </div>
                            <div className="space-y-4">
                                {['pending', 'cutting', 'sewing', 'qc', 'ready'].map((stage, idx) => {
                                    const stageOrder = ['pending', 'cutting', 'sewing', 'qc', 'ready']
                                    const currentIdx = stageOrder.indexOf(assignment.stage)
                                    const isCompleted = idx < currentIdx
                                    const isCurrent = idx === currentIdx
                                    const isPending = idx > currentIdx

                                    return (
                                        <div key={stage} className="flex items-start gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-yellow-500' : 'bg-gray-200'
                                                }`}>
                                                {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                {isCurrent && <Clock className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                                                </p>
                                                {isCurrent && assignment.tailors && (
                                                    <p className="text-sm text-gray-500">Assigned to {assignment.tailors.full_name}</p>
                                                )}
                                                {isCompleted && (
                                                    <p className="text-sm text-gray-500">Completed</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
