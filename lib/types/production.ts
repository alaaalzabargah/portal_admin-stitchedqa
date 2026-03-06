export interface ProductionSettings {
    id: string
    stage_labels: {
        assigned: string
        in_progress: string
        completed: string
        qc_passed: string
        qc_failed: string
        rework: string
        out_for_delivery: string
        delivered: string
    }
    stage_durations: {
        assigned: number
        in_progress: number
        completed: number
        qc_passed: number
        qc_failed: number
        rework: number
        out_for_delivery: number
        delivered: number
    }
    stage_colors: {
        assigned: string
        in_progress: string
        completed: string
        qc_passed: string
        qc_failed: string
        rework: string
        out_for_delivery: string
        delivered: string
    }
    alert_thresholds: {
        warning: number
        critical: number
    }
    telegram_enabled: boolean
    whatsapp_enabled: boolean
    email_enabled: boolean
    telegram_alert_template: string
    working_hours_start: string
    working_hours_end: string
    working_days: string[]
    use_business_days: boolean
    auto_assignment_enabled: boolean
    quality_check_required: boolean
    created_at: string
    updated_at: string
    updated_by: string | null
}

export interface Tailor {
    id: string
    full_name: string
    phone: string | null
    telegram_chat_id: string | null
    specialty: string | null
    commission_rate: number
    status: string
    created_at: string
    updated_at: string
}
