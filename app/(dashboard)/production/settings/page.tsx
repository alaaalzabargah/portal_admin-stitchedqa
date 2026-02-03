'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Bell, Clock, Palette, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuthUser } from '@/lib/auth'
import type { ProductionSettings } from '@/lib/types/production'

export default function ProductionSettingsPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = useAuthUser()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<ProductionSettings | null>(null)

    useEffect(() => {
        // Check access
        if (!authLoading && profile && profile.role !== 'owner' && profile.role !== 'admin') {
            router.push('/production')
            return
        }
        loadSettings()
    }, [authLoading, profile])

    async function loadSettings() {
        const response = await fetch('/api/production/settings')
        if (response.ok) {
            const data = await response.json()
            setSettings(data)
        }
        setLoading(false)
    }

    async function handleSave() {
        if (!settings) return

        setSaving(true)
        const response = await fetch('/api/production/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        })

        if (response.ok) {
            alert('Settings saved successfully!')
        } else {
            const error = await response.json()
            alert(`Failed to save: ${error.error}`)
        }
        setSaving(false)
    }

    const updateStageLabel = (stage: string, label: string) => {
        if (!settings) return
        setSettings({
            ...settings,
            stage_labels: {
                ...settings.stage_labels,
                [stage]: label
            }
        })
    }

    const updateStageDuration = (stage: string, days: number) => {
        if (!settings) return
        setSettings({
            ...settings,
            stage_durations: {
                ...settings.stage_durations,
                [stage]: days
            }
        })
    }

    const updateStageColor = (stage: string, color: string) => {
        if (!settings) return
        setSettings({
            ...settings,
            stage_colors: {
                ...settings.stage_colors,
                [stage]: color
            }
        })
    }

    const updateAlertThreshold = (type: 'warning' | 'critical', value: number) => {
        if (!settings) return
        setSettings({
            ...settings,
            alert_thresholds: {
                ...settings.alert_thresholds,
                [type]: value
            }
        })
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!settings) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Failed to load settings</div>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-5xl mx-auto">
                    <button
                        onClick={() => router.push('/production')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Production
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Production Settings</h1>
                            <p className="text-sm text-gray-500">Configure stages, alerts, and workflows</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
                {/* Stage Configuration */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Stage Configuration</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Customize display labels, expected durations, and badge colors for each production stage.</p>

                    <div className="space-y-4">
                        {(['pending', 'cutting', 'sewing', 'qc', 'ready'] as const).map(stage => (
                            <div key={stage} className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Label</label>
                                    <input
                                        type="text"
                                        value={settings.stage_labels[stage]}
                                        onChange={e => updateStageLabel(stage, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={settings.stage_durations[stage]}
                                        onChange={e => updateStageDuration(stage, parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Badge Color</label>
                                    <select
                                        value={settings.stage_colors[stage]}
                                        onChange={e => updateStageColor(stage, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                                    >
                                        <option value="gray">Gray</option>
                                        <option value="pink">Pink</option>
                                        <option value="blue">Blue</option>
                                        <option value="green">Green</option>
                                        <option value="emerald">Emerald</option>
                                        <option value="purple">Purple</option>
                                        <option value="orange">Orange</option>
                                        <option value="red">Red</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alert Thresholds */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Alert Thresholds</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Set percentage thresholds for sending time-based alerts.</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Warning Threshold (%)
                                <span className="text-gray-500 font-normal ml-2">🟡 Yellow alerts</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.alert_thresholds.warning}
                                onChange={e => updateAlertThreshold('warning', parseInt(e.target.value) || 50)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Critical Threshold (%)
                                <span className="text-gray-500 font-normal ml-2">🔴 Red alerts</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.alert_thresholds.critical}
                                onChange={e => updateAlertThreshold('critical', parseInt(e.target.value) || 80)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Notification Channels */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Notification Channels</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Enable or disable notification channels for production alerts.</p>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={settings.telegram_enabled}
                                onChange={e => setSettings({ ...settings, telegram_enabled: e.target.checked })}
                                className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="flex-1 font-medium text-gray-900">Telegram Notifications</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={settings.whatsapp_enabled}
                                onChange={e => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                                className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="flex-1 font-medium text-gray-900">WhatsApp Notifications</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={settings.email_enabled}
                                onChange={e => setSettings({ ...settings, email_enabled: e.target.checked })}
                                className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="flex-1 font-medium text-gray-900">Email Notifications</span>
                        </label>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Alert Template</label>
                        <textarea
                            value={settings.telegram_alert_template}
                            onChange={e => setSettings({ ...settings, telegram_alert_template: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                            placeholder="Use {item}, {customer}, {stage}, {status}, {due_date}"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Available variables: {'{item}'}, {'{customer}'}, {'{stage}'}, {'{status}'}, {'{due_date}'}
                        </p>
                    </div>
                </div>

                {/* Working Hours */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Working Schedule</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Configure business hours for time calculations.</p>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={settings.use_business_days}
                                onChange={e => setSettings({ ...settings, use_business_days: e.target.checked })}
                                className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-gray-900">
                                Use business days only (exclude weekends/holidays from calculations)
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
