export type CustomerTier = 'VIP' | 'Gold' | 'Normal';

export type MeasurementType = 'standard' | 'custom';

export type StandardSize = 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl';

export interface Customer {
    id: string;
    full_name: string | null;
    phone: string;
    email: string | null;
    wa_id: string | null;
    notes: string | null;
    status_tier: CustomerTier;
    tags: string[] | null;
    total_spend_minor: number;
    order_count: number;
    last_purchase_at?: string;
    created_at: string;

    // Measurement fields
    measurement_type?: MeasurementType;
    standard_size?: StandardSize;
    height_cm?: number;

    // Custom measurement fields (all in cm)
    shoulder_width_cm?: number;
    bust_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    sleeve_length_cm?: number;
    product_length_cm?: number;
    arm_hole_cm?: number;
    additional_comments?: string;
}
