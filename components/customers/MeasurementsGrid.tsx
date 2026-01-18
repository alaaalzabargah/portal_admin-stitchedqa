'use client'

import { useState } from 'react'
import { Ruler, Copy, Check } from 'lucide-react'

interface MeasurementsGridProps {
    customer: {
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
    }
    dict: any
}

export function MeasurementsGrid({ customer, dict }: MeasurementsGridProps) {
    // Determine measurement type (default to custom if not specified for backward compatibility)
    const isStandardSize = customer.measurement_type === 'standard'

    // Common measurements that apply to BOTH types
    const commonMeasurements: Array<{ id: string; label: string; value: number | undefined; unit: string; primary?: boolean }> = [
        { id: 'sleeve', label: dict.customer_details?.sleeve || 'Sleeve', value: customer.sleeve_length_cm, unit: 'cm' },
        { id: 'length', label: dict.customer_details?.length || 'Length', value: customer.product_length_cm, unit: 'cm' },
    ].filter(m => m.value)

    // Build measurements based on type
    const measurements = isStandardSize
        ? [
            // Standard size - show the size plus sleeve/length
            { id: 'size', label: dict.customer_details?.size || 'Size', value: customer.standard_size, primary: true },
            ...commonMeasurements
        ].filter(m => m.value)
        : [
            // Custom measurements - show all custom fields plus sleeve/length
            { id: 'height', label: dict.customer_details?.height || 'Height', value: customer.height_cm, unit: 'cm', primary: true },
            ...commonMeasurements,
            { id: 'shoulder', label: dict.customer_details?.shoulder || 'Shoulder', value: customer.shoulder_width_cm, unit: 'cm' },
            { id: 'bust', label: dict.customer_details?.bust || 'Bust', value: customer.bust_cm, unit: 'cm' },
            { id: 'waist', label: dict.customer_details?.waist || 'Waist', value: customer.waist_cm, unit: 'cm' },
            { id: 'hips', label: dict.customer_details?.hips || 'Hips', value: customer.hips_cm, unit: 'cm' },
            { id: 'armhole', label: dict.customer_details?.armhole || 'Arm Hole', value: customer.arm_hole_cm, unit: 'cm' },
        ].filter(m => m.value)

    if (measurements.length === 0) {
        return (
            <div className="luxury-gradient-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Ruler className="w-5 h-5 text-slate-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-primary dark:text-white">
                        {dict.customer_details?.measurements || 'Measurements'}
                    </h3>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                    {dict.customer_details?.no_measurements || 'No measurements recorded'}
                </p>
            </div>
        )
    }

    const primaryMeasurement = measurements.find(m => m.primary)
    const secondaryMeasurements = measurements.filter(m => !m.primary)

    return (
        <div className="luxury-gradient-card p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
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

            <div className="space-y-3">
                {/* Primary Measurement (Large) */}
                {primaryMeasurement && (
                    <MeasurementPill
                        {...primaryMeasurement}
                        large
                    />
                )}

                {/* Secondary Measurements - Grid */}
                {secondaryMeasurements.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {secondaryMeasurements.map((m) => (
                            <MeasurementPill
                                key={m.id}
                                {...m}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Notes */}
            {customer.additional_comments && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Notes
                    </p>
                    <p className="text-sm text-secondary dark:text-zinc-300">
                        {customer.additional_comments}
                    </p>
                </div>
            )}
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
