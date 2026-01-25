'use client'

import { useState } from 'react'
import { DollarSign, Phone, Mail, MessageCircle, Copy, Check, Pencil, X, Save, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface OverviewTabProps {
    customer: {
        id: string
        full_name: string
        phone: string
        email?: string
        created_at: string
        total_spend_minor: number
        order_count: number
    }
    tier?: {
        name: string
        color: string
    }
    lastOrderDate?: string
    locale: 'ar' | 'en'
    dict: any
}

export function OverviewTab({ customer: initialCustomer, tier, lastOrderDate, locale, dict }: OverviewTabProps) {
    const [customer, setCustomer] = useState(initialCustomer)
    const [copiedField, setCopiedField] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editForm, setEditForm] = useState({
        full_name: customer.full_name || '',
        phone: customer.phone || '',
        email: customer.email || ''
    })

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleCall = () => {
        if (!isEditing) {
            window.location.href = `tel:${customer.phone}`
        }
    }

    const handleWhatsApp = () => {
        if (!isEditing) {
            const cleanPhone = customer.phone.replace(/\s+/g, '').replace('+', '')
            window.open(`https://wa.me/${cleanPhone}`, '_blank')
        }
    }

    const handleEmail = () => {
        if (!isEditing && customer.email) {
            window.location.href = `mailto:${customer.email}`
        }
    }

    const handleEditToggle = () => {
        if (isEditing) {
            setEditForm({
                full_name: customer.full_name || '',
                phone: customer.phone || '',
                email: customer.email || ''
            })
        }
        setIsEditing(!isEditing)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('customers')
                .update({
                    full_name: editForm.full_name,
                    phone: editForm.phone,
                    email: editForm.email || null
                })
                .eq('id', customer.id)

            if (error) throw error

            setCustomer(prev => ({
                ...prev,
                full_name: editForm.full_name,
                phone: editForm.phone,
                email: editForm.email || undefined
            }))
            setIsEditing(false)
        } catch (err) {
            console.error('Failed to save:', err)
            alert(locale === 'en' ? 'Failed to save changes' : 'فشل حفظ التغييرات')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 pb-24">
            {/* Premium Contact Profile Card */}
            <div className="luxury-gradient-card p-5 sm:p-8">
                <div className="relative z-10">
                    {/* Header: Edit controls on right */}
                    <div className="flex items-center justify-end mb-5 gap-2">
                        {isEditing && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-2.5 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            onClick={handleEditToggle}
                            className={`p-2.5 rounded-xl transition-all ${isEditing
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-black/5 text-gray-600 hover:bg-black/10'
                                }`}
                        >
                            {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Editable Name Field (only shown in edit mode) */}
                    {isEditing && (
                        <div className="mb-5">
                            <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-2" style={{ letterSpacing: '0.1em' }}>
                                {locale === 'en' ? 'Full Name' : 'الاسم الكامل'}
                            </label>
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder={locale === 'en' ? 'Enter name' : 'أدخل الاسم'}
                            />
                        </div>
                    )}

                    {/* Contact Cards */}
                    <div className="space-y-3">
                        {/* Phone Card */}
                        <div
                            className={`group relative rounded-2xl p-4 transition-all duration-300 ${!isEditing ? 'hover:shadow-md cursor-pointer' : ''}`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            }}
                            onClick={!isEditing ? handleCall : undefined}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <Phone className="w-5 h-5" style={{ color: 'var(--theme-text-primary)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>
                                        {locale === 'en' ? 'Phone' : 'الهاتف'}
                                    </p>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="+974..."
                                        />
                                    ) : (
                                        <p className="font-mono font-semibold text-base text-primary truncate">
                                            {customer.phone}
                                        </p>
                                    )}
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            copyToClipboard(customer.phone, 'phone')
                                        }}
                                        className="p-2 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
                                    >
                                        {copiedField === 'phone' ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* WhatsApp Card */}
                        <div
                            className={`group relative rounded-2xl p-4 transition-all duration-300 ${!isEditing ? 'hover:shadow-md cursor-pointer' : 'opacity-50'}`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            }}
                            onClick={!isEditing ? handleWhatsApp : undefined}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <MessageCircle className="w-5 h-5" style={{ color: 'var(--theme-text-primary)' }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>
                                        WhatsApp
                                    </p>
                                    <p className="font-semibold text-base text-primary">
                                        {locale === 'en' ? 'Send Message' : 'إرسال رسالة'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Email Card */}
                        <div
                            className={`group relative rounded-2xl p-4 transition-all duration-300 ${!isEditing ? 'hover:shadow-md cursor-pointer' : ''}`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            }}
                            onClick={!isEditing ? handleEmail : undefined}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <Mail className="w-5 h-5" style={{ color: 'var(--theme-text-primary)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>
                                        {locale === 'en' ? 'Email' : 'البريد'}
                                    </p>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                            placeholder="email@example.com"
                                        />
                                    ) : (
                                        <p className="font-mono text-base font-semibold text-primary truncate">
                                            {customer.email || (locale === 'en' ? 'No email' : 'لا يوجد بريد')}
                                        </p>
                                    )}
                                </div>
                                {!isEditing && customer.email && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            copyToClipboard(customer.email!, 'email')
                                        }}
                                        className="p-2 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
                                    >
                                        {copiedField === 'email' ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copied Toast */}
                {copiedField && (
                    <div
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium text-white animate-in fade-in slide-in-from-bottom-2"
                        style={{
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                        }}
                    >
                        ✓ Copied!
                    </div>
                )}
            </div>

            {/* KPI Card */}
            <div className="luxury-gradient-card p-6 sm:p-8">
                <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
                    style={{ background: 'var(--theme-primary)' }}
                />

                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 80%, transparent))',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground" style={{ letterSpacing: '0.1em' }}>
                                    {dict.customer_details?.total_spend || 'Total Spend'}
                                </p>
                            </div>
                            <p className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary to-primary/70 break-words">
                                {formatCurrency(customer.total_spend_minor)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-8 pt-6" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-2 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>
                                {dict.customer_details?.orders || 'Orders'}
                            </p>
                            <p className="text-3xl font-bold text-primary">
                                {customer.order_count ?? 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-2 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>
                                {dict.customer_details?.last_order || 'Last Order'}
                            </p>
                            <p className="text-lg font-semibold text-slate-700">
                                {lastOrderDate
                                    ? new Date(lastOrderDate).toLocaleDateString(
                                        locale === 'ar' ? 'ar-EG' : 'en-US',
                                        { day: 'numeric', month: 'short', year: 'numeric' }
                                    )
                                    : '-'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
