export interface ProductionSettings {
    id: string
    stage_labels: {
        pending: string
        cutting: string
        sewing: string
        qc: string
        ready: string
        delivered: string
    }
    stage_durations: {
        pending: number
        cutting: number
        sewing: number
        qc: number
        ready: number
    }
    stage_colors: {
        pending: string
        cutting: string
        sewing: string
        qc: string
        ready: string
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
    specialty: string | null
    commission_rate: number
    status: string
    created_at: string
    updated_at: string
}
