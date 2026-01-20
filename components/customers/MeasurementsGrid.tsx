'use client'

import { useState } from 'react'
import { Ruler, Copy, Check, Pencil, X, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MeasurementsGridProps {
    customer: {
        id: string
        measurement_type?: string
        standard_size?: string
        product_length_cm?: number
        sleeve_length_cm?: number
        shoulder_width_cm?: number
        bust_cm?: number
        waist_cm?: number
        hips_cm?: number
        arm_hole_cm?: number
        height_cm?: number
        additional_comments?: string
        updated_at?: string
    }
    orders?: Array<{
        order_items?: Array<{
            measurements?: Record<string, any>
        }>
    }>
    dict: any
}

export function MeasurementsGrid({ customer: initialCustomer, orders = [], dict }: MeasurementsGridProps) {
    const [customer, setCustomer] = useState(initialCustomer)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editForm, setEditForm] = useState({
        measurement_type: customer.measurement_type || 'custom',
        standard_size: customer.standard_size || '',
        product_length_cm: customer.product_length_cm || '',
        sleeve_length_cm: customer.sleeve_length_cm || '',
        shoulder_width_cm: customer.shoulder_width_cm || '',
        bust_cm: customer.bust_cm || '',
        waist_cm: customer.waist_cm || '',
        hips_cm: customer.hips_cm || '',
        arm_hole_cm: customer.arm_hole_cm || '',
        height_cm: customer.height_cm || '',
        additional_comments: customer.additional_comments || ''
    })

    // Determine measurement type
    const isStandardSize = customer.measurement_type === 'standard'

    // Extract comments from most recent order's line items
    let orderComments: string | null = null
    if (orders && orders.length > 0) {
        const mostRecentOrder = orders[0]
        if (mostRecentOrder.order_items && mostRecentOrder.order_items.length > 0) {
            const comments: string[] = []
            for (const item of mostRecentOrder.order_items) {
                if (item.measurements && typeof item.measurements === 'object') {
                    for (const [key, value] of Object.entries(item.measurements)) {
                        const keyLower = key.toLowerCase()
                        if ((keyLower.includes('comment') || keyLower.includes('note') || keyLower.includes('additional')) && value) {
                            const commentText = String(value).trim()
                            if (commentText && !comments.includes(commentText)) {
                                comments.push(commentText)
                            }
                        }
                    }
                }
            }
            if (comments.length > 0) {
                orderComments = comments.join('\n')
            }
        }
    }

    const displayComments = orderComments || customer.additional_comments

    // Calculate if measurements are outdated (> 1 year old)
    const updatedDate = customer.updated_at ? new Date(customer.updated_at) : null
    const daysSinceUpdate = updatedDate ? Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)) : null
    const isOutdated = daysSinceUpdate !== null && daysSinceUpdate > 365

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel - reset form
            setEditForm({
                measurement_type: customer.measurement_type || 'custom',
                standard_size: customer.standard_size || '',
                product_length_cm: customer.product_length_cm || '',
                sleeve_length_cm: customer.sleeve_length_cm || '',
                shoulder_width_cm: customer.shoulder_width_cm || '',
                bust_cm: customer.bust_cm || '',
                waist_cm: customer.waist_cm || '',
                hips_cm: customer.hips_cm || '',
                arm_hole_cm: customer.arm_hole_cm || '',
                height_cm: customer.height_cm || '',
                additional_comments: customer.additional_comments || ''
            })
        }
        setIsEditing(!isEditing)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const supabase = createClient()
            const updateData: Record<string, any> = {
                measurement_type: editForm.measurement_type,
                updated_at: new Date().toISOString()
            }

            if (editForm.measurement_type === 'standard') {
                updateData.standard_size = editForm.standard_size || null
            }

            // Always update these common fields
            updateData.product_length_cm = editForm.product_length_cm ? Number(editForm.product_length_cm) : null
            updateData.sleeve_length_cm = editForm.sleeve_length_cm ? Number(editForm.sleeve_length_cm) : null
            updateData.additional_comments = editForm.additional_comments || null

            // Custom measurements
            if (editForm.measurement_type === 'custom') {
                updateData.height_cm = editForm.height_cm ? Number(editForm.height_cm) : null
                updateData.shoulder_width_cm = editForm.shoulder_width_cm ? Number(editForm.shoulder_width_cm) : null
                updateData.bust_cm = editForm.bust_cm ? Number(editForm.bust_cm) : null
                updateData.waist_cm = editForm.waist_cm ? Number(editForm.waist_cm) : null
                updateData.hips_cm = editForm.hips_cm ? Number(editForm.hips_cm) : null
                updateData.arm_hole_cm = editForm.arm_hole_cm ? Number(editForm.arm_hole_cm) : null
            }

            const { error } = await supabase
                .from('customers')
                .update(updateData)
                .eq('id', customer.id)

            if (error) throw error

            // Update local state
            setCustomer(prev => ({
                ...prev,
                ...updateData
            }))
            setIsEditing(false)
        } catch (err) {
            console.error('Failed to save:', err)
            alert('Failed to save measurements')
        } finally {
            setIsSaving(false)
        }
    }

    // Build measurements for display
    const commonMeasurements: Array<{ id: string; label: string; value: number | undefined; unit: string; primary?: boolean }> = [
        { id: 'sleeve', label: dict.customer_details?.sleeve || 'Sleeve', value: customer.sleeve_length_cm, unit: 'cm' },
        { id: 'length', label: dict.customer_details?.length || 'Length', value: customer.product_length_cm, unit: 'cm' },
    ].filter(m => m.value)

    const measurements = isStandardSize
        ? [
            { id: 'size', label: dict.customer_details?.size || 'Size', value: customer.standard_size, primary: true },
            ...commonMeasurements
        ].filter(m => m.value)
        : [
            { id: 'height', label: dict.customer_details?.height || 'Height', value: customer.height_cm, unit: 'cm', primary: true },
            ...commonMeasurements,
            { id: 'shoulder', label: dict.customer_details?.shoulder || 'Shoulder', value: customer.shoulder_width_cm, unit: 'cm' },
            { id: 'bust', label: dict.customer_details?.bust || 'Bust', value: customer.bust_cm, unit: 'cm' },
            { id: 'waist', label: dict.customer_details?.waist || 'Waist', value: customer.waist_cm, unit: 'cm' },
            { id: 'hips', label: dict.customer_details?.hips || 'Hips', value: customer.hips_cm, unit: 'cm' },
            { id: 'armhole', label: dict.customer_details?.armhole || 'Arm Hole', value: customer.arm_hole_cm, unit: 'cm' },
        ].filter(m => m.value)

    const primaryMeasurement = measurements.find(m => m.primary)
    const secondaryMeasurements = measurements.filter(m => !m.primary)

    // Size options for standard size
    const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']

    return (
        <div className="luxury-gradient-card p-5 sm:p-6">
            <div className="space-y-3 mb-5">
                {/* Last Updated Badge */}
                {updatedDate && !isEditing && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isOutdated
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                        <span>{isOutdated ? '⚠️' : '📅'}</span>
                        <span>
                            Last Updated: {new Date(updatedDate).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'color-mix(in srgb, var(--theme-primary) 15%, #ffffff)'
                            }}
                        >
                            <Ruler className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>
                                {dict.customer_details?.measurements || 'Measurements'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {isStandardSize ? 'Standard Size' : 'Custom Measurements'}
                            </p>
                        </div>
                    </div>

                    {/* Edit Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleEditToggle}
                            className={`p-2 rounded-lg transition-all ${isEditing
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-black/5 text-gray-600 hover:bg-black/10'
                                }`}
                        >
                            {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        </button>
                        {isEditing && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                    {/* Measurement Type Toggle */}
                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                            Measurement Type
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditForm(prev => ({ ...prev, measurement_type: 'standard' }))}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${editForm.measurement_type === 'standard'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Standard Size
                            </button>
                            <button
                                onClick={() => setEditForm(prev => ({ ...prev, measurement_type: 'custom' }))}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${editForm.measurement_type === 'custom'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    {editForm.measurement_type === 'standard' ? (
                        /* Standard Size Fields */
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-3">
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                                    Size
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {sizeOptions.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setEditForm(prev => ({ ...prev, standard_size: size }))}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${editForm.standard_size === size
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <EditField label="Sleeve (cm)" value={editForm.sleeve_length_cm} onChange={v => setEditForm(prev => ({ ...prev, sleeve_length_cm: v }))} />
                            <EditField label="Length (cm)" value={editForm.product_length_cm} onChange={v => setEditForm(prev => ({ ...prev, product_length_cm: v }))} />
                        </div>
                    ) : (
                        /* Custom Measurement Fields */
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <EditField label="Height (cm)" value={editForm.height_cm} onChange={v => setEditForm(prev => ({ ...prev, height_cm: v }))} />
                            <EditField label="Sleeve (cm)" value={editForm.sleeve_length_cm} onChange={v => setEditForm(prev => ({ ...prev, sleeve_length_cm: v }))} />
                            <EditField label="Length (cm)" value={editForm.product_length_cm} onChange={v => setEditForm(prev => ({ ...prev, product_length_cm: v }))} />
                            <EditField label="Shoulder (cm)" value={editForm.shoulder_width_cm} onChange={v => setEditForm(prev => ({ ...prev, shoulder_width_cm: v }))} />
                            <EditField label="Bust (cm)" value={editForm.bust_cm} onChange={v => setEditForm(prev => ({ ...prev, bust_cm: v }))} />
                            <EditField label="Waist (cm)" value={editForm.waist_cm} onChange={v => setEditForm(prev => ({ ...prev, waist_cm: v }))} />
                            <EditField label="Hips (cm)" value={editForm.hips_cm} onChange={v => setEditForm(prev => ({ ...prev, hips_cm: v }))} />
                            <EditField label="Arm Hole (cm)" value={editForm.arm_hole_cm} onChange={v => setEditForm(prev => ({ ...prev, arm_hole_cm: v }))} />
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                            Notes
                        </label>
                        <textarea
                            value={editForm.additional_comments}
                            onChange={(e) => setEditForm(prev => ({ ...prev, additional_comments: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px]"
                            placeholder="Add notes..."
                        />
                    </div>
                </div>
            ) : (
                /* Display Mode */
                <>
                    {measurements.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {dict.customer_details?.no_measurements || 'No measurements recorded'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {/* Primary Measurement (Large) */}
                            {primaryMeasurement && (
                                <MeasurementPill {...primaryMeasurement} large />
                            )}

                            {/* Secondary Measurements - Grid */}
                            {secondaryMeasurements.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {secondaryMeasurements.map((m) => (
                                        <MeasurementPill key={m.id} {...m} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    {displayComments && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                Notes
                            </p>
                            <p className="text-sm text-secondary dark:text-zinc-300 whitespace-pre-wrap">
                                {displayComments}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// Edit field component
function EditField({ label, value, onChange }: { label: string; value: string | number; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                {label}
            </label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="0"
            />
        </div>
    )
}

function MeasurementPill({
    label,
    value,
    unit,
    large = false
}: {
    label: string
    value?: string | number
    unit?: string
    large?: boolean
}) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(String(value))
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch { }
    }

    return (
        <button
            onClick={handleCopy}
            className={`
                w-full text-center cursor-pointer 
                transition-all active:scale-[0.97] touch-manipulation
                border shadow-sm hover:shadow-md overflow-hidden
                ${large ? 'rounded-full p-3' : 'rounded-full p-2'}
            `}
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderColor: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)'
            }}
            title={`Copy ${value}`}
        >
            <p className={`uppercase tracking-wider text-muted-foreground font-semibold mb-0.5 whitespace-nowrap ${large ? 'text-[9px]' : 'text-[7px] sm:text-[8px]'}`}>
                {label}
            </p>
            <div className="flex items-center justify-center gap-1">
                <p className={`font-mono font-bold whitespace-nowrap ${large ? 'text-xl sm:text-2xl' : 'text-sm'}`} style={{ color: 'var(--theme-primary)' }}>
                    {value}
                    {unit && <span className="text-[10px] text-muted-foreground ml-0.5 font-sans">{unit}</span>}
                </p>
                {copied ? (
                    <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                ) : (
                    <Copy className="w-2.5 h-2.5 text-muted-foreground/40 flex-shrink-0" />
                )}
            </div>
        </button>
    )
}
