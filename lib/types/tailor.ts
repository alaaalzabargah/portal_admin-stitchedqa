/**
 * Tailor Management System Types
 * Simplified admin-only tracking system
 */

// =====================================================
// DATABASE TYPES
// =====================================================

export interface Tailor {
    id: string

    // From production system
    full_name: string
    phone: string | null
    specialty: string | null  // Legacy field
    status: string
    commission_rate: number | null

    // New fields from tailor management
    email: string | null
    location: string | null
    specialties: string[]
    expert_in: string[]
    certifications: string[]

    // Capacity
    max_capacity: number
    current_load: number

    // Performance Metrics (auto-calculated)
    rating: number
    quality_score: number
    total_jobs_completed: number
    average_turnaround_days: number
    on_time_delivery_rate: number

    // Financial
    total_earnings_minor: number
    ytd_earnings_minor: number
    pending_payout_minor: number

    // Metadata
    notes: string | null
    created_at: string
    updated_at: string
    created_by: string | null
}

export type AssignmentStatus =
    | 'assigned'
    | 'in_progress'
    | 'completed'
    | 'qc_review'
    | 'qc_passed'
    | 'qc_failed'
    | 'rework'
    | 'paid'

export interface TailorAssignment {
    id: string
    tailor_id: string
    order_id: string | null
    customer_id: string | null

    // Item Details
    item_type: string
    item_description: string | null
    quantity: number
    fabric_code: string | null

    // Pricing
    piece_rate_minor: number
    total_amount_minor: number

    // Timeline
    assigned_date: string
    due_date: string
    started_date: string | null
    completed_date: string | null
    qc_date: string | null
    paid_date: string | null

    // Status
    status: AssignmentStatus

    // Quality Control
    qc_passed: boolean | null
    qc_notes: string | null
    qc_issues: QCIssue[] | null

    // Customer Feedback
    customer_rating: number | null
    customer_feedback: string | null

    // Metadata
    created_at: string
    updated_at: string
    created_by: string | null
}

export interface QCIssue {
    type: string
    severity: 'minor' | 'major' | 'critical'
    description: string
}

export interface TailorPayment {
    id: string
    tailor_id: string
    assignment_ids: string[]

    amount_minor: number
    currency: string
    payment_method: string

    period_start: string | null
    period_end: string | null
    payment_date: string

    transaction_id: string | null
    transaction_proof_url: string | null

    notes: string | null
    created_at: string
    created_by: string | null
}

export interface TailorRate {
    id: string
    tailor_id: string
    item_type: string
    piece_rate_minor: number
    effective_from: string
    effective_to: string | null
    is_active: boolean
    previous_rate_minor: number | null
    change_reason: string | null
    created_at: string
    updated_at: string
    created_by: string | null
}

export interface TailorCommunication {
    id: string
    tailor_id: string
    type: 'call' | 'whatsapp' | 'visit' | 'email' | 'other'
    subject: string | null
    notes: string | null
    communication_date: string
    created_at: string
    created_by: string | null
}

// =====================================================
// EXTENDED TYPES WITH RELATIONS
// =====================================================

export interface TailorWithStats extends Tailor {
    active_assignments?: number
    pending_assignments?: number
    completed_this_month?: number
    recent_assignments?: TailorAssignment[]
}

export interface AssignmentWithDetails extends TailorAssignment {
    tailor?: Pick<Tailor, 'id' | 'full_name' | 'phone'>
    customer?: { id: string; full_name: string | null; phone: string }
}

// =====================================================
// FORM INPUTS
// =====================================================

export interface CreateTailorInput {
    full_name: string
    phone?: string
    email?: string
    location?: string
    specialties?: string[]
    expert_in?: string[]
    certifications?: string[]
    max_capacity?: number
    notes?: string
}

export interface UpdateTailorInput extends Partial<CreateTailorInput> {
    status?: 'active' | 'inactive' | 'on_hold'
}

export interface CreateAssignmentInput {
    tailor_id: string
    order_id?: string
    customer_id?: string
    item_type: string
    item_description?: string
    quantity?: number
    fabric_code?: string
    piece_rate_minor: number
    due_date: string
}

export interface UpdateAssignmentStatusInput {
    status: AssignmentStatus
    qc_notes?: string
    qc_issues?: QCIssue[]
    qc_passed?: boolean
}

export interface CreatePaymentInput {
    tailor_id: string
    assignment_ids: string[]
    amount_minor: number
    payment_method?: string
    period_start?: string
    period_end?: string
    payment_date?: string
    transaction_id?: string
    transaction_proof_url?: string
    notes?: string
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export interface TailorsDashboardStats {
    total_tailors: number
    active_tailors: number
    total_active_assignments: number
    total_pending_payments_minor: number
    average_quality_score: number
}

export interface TailorPerformanceData {
    month: string
    days_per_item: number
    qc_pass_rate: number
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatMoney(amountMinor: number, currency = 'QAR'): string {
    const amount = amountMinor / 100
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount)
}

export function getStatusColor(status: AssignmentStatus): string {
    const colors: Record<AssignmentStatus, string> = {
        assigned: '#6b7280',      // gray
        in_progress: '#8b5cf6',   // purple
        completed: '#3b82f6',     // blue
        qc_review: '#f59e0b',     // orange
        qc_passed: '#10b981',     // green
        qc_failed: '#ef4444',     // red
        rework: '#f59e0b',        // orange
        paid: '#059669',          // emerald
    }
    return colors[status] || '#6b7280'
}

export function getStatusLabel(status: AssignmentStatus): string {
    const labels: Record<AssignmentStatus, string> = {
        assigned: 'Assigned',
        in_progress: 'In Progress',
        completed: 'Completed',
        qc_review: 'QC Review',
        qc_passed: 'QC Passed',
        qc_failed: 'QC Failed',
        rework: 'Rework',
        paid: 'Paid',
    }
    return labels[status] || status
}

export function calculateCapacityPercentage(current: number, max: number): number {
    if (max === 0) return 0
    return Math.round((current / max) * 100)
}

export function getTailorStatusColor(status: string): string {
    switch (status) {
        case 'active':
            return '#10b981' // green
        case 'inactive':
            return '#6b7280' // gray
        case 'on_hold':
            return '#f59e0b' // orange
        default:
            return '#6b7280'
    }
}

export function getDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate)
    const today = new Date()
    const diff = due.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isOverdue(dueDate: string): boolean {
    return getDaysUntilDue(dueDate) < 0
}

export function formatDueDate(dueDate: string): string {
    const days = getDaysUntilDue(dueDate)
    if (days < 0) {
        return `${Math.abs(days)} days overdue`
    } else if (days === 0) {
        return 'Due today'
    } else if (days === 1) {
        return 'Due tomorrow'
    } else {
        return `Due in ${days} days`
    }
}
