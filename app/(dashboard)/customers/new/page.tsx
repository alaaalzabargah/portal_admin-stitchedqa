'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassButton } from '@/components/ui/GlassButton'
import { ArrowLeft, Save, User, Ruler, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface NewCustomer {
    full_name: string
    phone: string
    email?: string
    measurement_type: string
    standard_size?: string
    height_cm?: number
    product_length_cm?: number
    sleeve_length_cm?: number
    shoulder_width_cm?: number
    bust_cm?: number
    waist_cm?: number
    hips_cm?: number
    arm_hole_cm?: number
    additional_comments?: string
}

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

export default function NewCustomerPage() {
    const [customer, setCustomer] = useState<NewCustomer>({
        full_name: '',
        phone: '',
        email: '',
        measurement_type: 'standard',
        standard_size: undefined,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!customer.full_name.trim()) {
            setError('Name is required')
            return
        }
        if (!customer.phone.trim()) {
            setError('Phone is required')
            return
        }

        setSaving(true)
        setError(null)

        const { data, error } = await supabase
            .from('customers')
            .insert({
                full_name: customer.full_name,
                phone: customer.phone,
                email: customer.email || null,
                measurement_type: customer.measurement_type,
                standard_size: customer.measurement_type === 'standard' ? customer.standard_size?.toLowerCase() : null,
                height_cm: customer.measurement_type === 'custom' ? customer.height_cm : null,
                product_length_cm: customer.product_length_cm || null,
                sleeve_length_cm: customer.sleeve_length_cm || null,
                shoulder_width_cm: customer.measurement_type === 'custom' ? customer.shoulder_width_cm : null,
                bust_cm: customer.measurement_type === 'custom' ? customer.bust_cm : null,
                waist_cm: customer.measurement_type === 'custom' ? customer.waist_cm : null,
                hips_cm: customer.measurement_type === 'custom' ? customer.hips_cm : null,
                arm_hole_cm: customer.measurement_type === 'custom' ? customer.arm_hole_cm : null,
                additional_comments: customer.additional_comments,
            })
            .select()
            .single()

        setSaving(false)

        if (error) {
            setError('Failed to create customer: ' + error.message)
        } else if (data) {
            router.push(`/customers/${data.id}`)
            router.refresh()
        }
    }

    const updateField = (field: keyof NewCustomer, value: string | number | undefined) => {
        setCustomer({ ...customer, [field]: value })
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/customers">
                        <GlassButton variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4" />
                        </GlassButton>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                            New Customer
                        </h1>
                        <p className="text-sm text-muted-foreground">Add a new client to your database</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="luxury-gradient-card p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, #ffffff)' }}>
                                <User className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>Basic Information</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={customer.full_name}
                                    onChange={(e) => updateField('full_name', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all"
                                    placeholder="Enter customer name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    value={customer.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all"
                                    placeholder="+974 XXXX XXXX"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    value={customer.email || ''}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all"
                                    placeholder="email@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Measurements */}
                    <div className="luxury-gradient-card p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, #ffffff)' }}>
                                <Ruler className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>Measurements</h2>
                        </div>

                        {/* Measurement Type Toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => updateField('measurement_type', 'standard')}
                                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${customer.measurement_type === 'standard'
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                style={customer.measurement_type === 'standard' ? { background: 'var(--theme-primary)' } : {}}
                            >
                                Standard Size
                            </button>
                            <button
                                type="button"
                                onClick={() => updateField('measurement_type', 'custom')}
                                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${customer.measurement_type === 'custom'
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                style={customer.measurement_type === 'custom' ? { background: 'var(--theme-primary)' } : {}}
                            >
                                Custom
                            </button>
                        </div>

                        {/* Standard Size Selection */}
                        {customer.measurement_type === 'standard' && (
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
                                {STANDARD_SIZES.map((size) => {
                                    const isSelected = customer.standard_size?.toUpperCase() === size.toUpperCase()
                                    return (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => updateField('standard_size', size)}
                                            className={`py-3 px-2 rounded-xl font-bold text-sm transition-all ${isSelected
                                                ? 'text-white shadow-lg'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            style={isSelected ? { background: 'var(--theme-primary)' } : {}}
                                        >
                                            {size}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Common Fields - Sleeve & Length (for BOTH types) */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sleeve Length (in)</label>
                                <input
                                    type="number"
                                    value={customer.sleeve_length_cm || ''}
                                    onChange={(e) => updateField('sleeve_length_cm', e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Abaya Length (in)</label>
                                <input
                                    type="number"
                                    value={customer.product_length_cm || ''}
                                    onChange={(e) => updateField('product_length_cm', e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Custom Measurements (only for custom type) */}
                        {customer.measurement_type === 'custom' && (
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: 'height_cm', label: 'Height (in)' },
                                    { key: 'shoulder_width_cm', label: 'Shoulder (in)' },
                                    { key: 'bust_cm', label: 'Bust (in)' },
                                    { key: 'waist_cm', label: 'Waist (in)' },
                                    { key: 'hips_cm', label: 'Hips (in)' },
                                    { key: 'arm_hole_cm', label: 'Arm Hole (in)' },
                                ].map(({ key, label }) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                        <input
                                            type="number"
                                            value={(customer as any)[key] || ''}
                                            onChange={(e) => updateField(key as keyof NewCustomer, e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                            <textarea
                                value={customer.additional_comments || ''}
                                onChange={(e) => updateField('additional_comments', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all resize-none"
                                placeholder="Any special notes about this customer..."
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <GlassButton
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        isLoading={saving}
                        leftIcon={<UserPlus className="w-5 h-5" />}
                    >
                        Create Customer
                    </GlassButton>
                </form>
            </div>
        </div>
    )
}
