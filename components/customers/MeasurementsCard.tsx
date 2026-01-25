'use client'

import { Ruler } from 'lucide-react'
import { CopyableSizeCard } from '@/components/ui/CopyableSizeCard'

interface MeasurementsCardProps {
    customer: {
        measurement_type?: string
        standard_size?: string
        additional_comments?: string
        product_length_cm?: number
        sleeve_length_cm?: number
        shoulder_width_cm?: number
        bust_cm?: number
        waist_cm?: number
        hips_cm?: number
        arm_hole_cm?: number
        height_cm?: number
    }
    dict: any
}

export function MeasurementsCard({ customer, dict }: MeasurementsCardProps) {
    return (
        <div className="card-premium p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sand-100 flex items-center justify-center">
                    <Ruler className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-primary">{dict.customer_details.measurements}</h2>
            </div>

            {(customer.measurement_type === 'custom' || customer.standard_size) ? (
                <div className="space-y-4">
                    {/* Primary Measurement highlight - SIZE (Copyable) */}
                    {customer.standard_size && (
                        <CopyableSizeCard
                            size={customer.standard_size}
                            label={dict.customer_details.size || 'Size'}
                        />
                    )}

                    {/* Secondary - Length/Notes */}
                    {(customer.additional_comments || customer.product_length_cm) && (
                        <div className="p-3 bg-sand-50 rounded-xl border border-sand-100 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{dict.customer_details.length || 'Length / Notes'}</p>
                            <p className="text-sm font-medium text-secondary">
                                {customer.additional_comments || `${customer.product_length_cm} cm`}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <MeasurementItem label={dict.customer_details.sleeve} value={customer.sleeve_length_cm} unit="cm" />
                        <MeasurementItem label={dict.customer_details.shoulder} value={customer.shoulder_width_cm} unit="cm" />
                        <MeasurementItem label={dict.customer_details.bust} value={customer.bust_cm} unit="cm" />
                        <MeasurementItem label={dict.customer_details.waist} value={customer.waist_cm} unit="cm" />
                        <MeasurementItem label={dict.customer_details.hips} value={customer.hips_cm} unit="cm" />
                        <MeasurementItem label={dict.customer_details.arm_hole} value={customer.arm_hole_cm} unit="cm" />
                        <MeasurementItem label={dict.customer_details.height} value={customer.height_cm} unit="cm" />
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-sand-50/50 rounded-xl border border-dashed border-sand-200">
                    <Ruler className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{dict.customer_details.no_measurements}</p>
                </div>
            )}
        </div>
    )
}

function MeasurementItem({ label, value, unit }: { label: string, value?: string | number, unit?: string }) {
    if (!value) return null
    return (
        <div className="card-premium p-3 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="font-mono font-semibold text-primary text-sm">
                {value} {unit && <span className="text-xs text-secondary font-sans">{unit}</span>}
            </p>
        </div>
    )
}
