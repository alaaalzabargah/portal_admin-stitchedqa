/**
 * Contractor System TypeScript Types
 * Generated from database schema
 */

// =====================================================
// ENUMS
// =====================================================

export type ContractorStatus = 'available' | 'limited' | 'unavailable' | 'inactive'

export type JobRequestStatus =
    | 'pending'        // Sent to contractor, awaiting response
    | 'accepted'       // Contractor accepted
    | 'declined'       // Contractor declined
    | 'expired'        // Auto-declined after timeout
    | 'in_progress'    // Work started
    | 'completed'      // Contractor marked complete
    | 'qc_review'      // In QC review
    | 'qc_passed'      // QC approved
    | 'qc_failed'      // QC rejected, needs rework
    | 'rework'         // Being reworked
    | 'ready_payment'  // Ready for payment
    | 'paid'           // Payment processed
    | 'cancelled'      // Job cancelled

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent'

export type PaymentStatus =
    | 'pending'      // Job completed, awaiting approval
    | 'approved'     // Approved for payment
    | 'processing'   // Payment in progress
    | 'paid'         // Payment completed
    | 'failed'       // Payment failed
    | 'cancelled'    // Payment cancelled

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable'

export type FeedbackType = 'positive' | 'neutral' | 'negative'

// =====================================================
// INTERFACES
// =====================================================

export interface ContractorProfile {
    id: string
    user_id: string

    // Business Information
    business_name: string | null
    tax_id: string | null
    location: string | null
    phone: string | null

    // Work Status & Capacity
    status: ContractorStatus
    max_capacity: number
    current_load: number

    // Specialization
    specialties: string[]
    expert_in: string[]
    certifications: string[]

    // Performance Metrics
    rating: number
    quality_score: number
    reliability_score: number
    total_jobs_completed: number
    total_jobs_declined: number
    average_turnaround_days: number

    // Financials (all in minor currency units, e.g., cents)
    total_earnings_minor: number
    ytd_earnings_minor: number
    pending_payout_minor: number

    // Preferences
    preferred_payment_method: string
    minimum_piece_rate_minor: number | null
    auto_accept_threshold_minor: number | null

    // Metadata
    created_at: string
    updated_at: string
    last_active_at: string | null
}

export interface QualityIssue {
    type: string
    severity: 'minor' | 'major' | 'critical'
    description: string
    image_url?: string
}

export interface JobRequest {
    id: string

    // Relationships
    contractor_id: string
    order_id: string | null
    customer_id: string | null

    // Job Details
    item_type: string
    item_description: string | null
    quantity: number
    fabric_code: string | null
    fabric_type: string | null
    measurements: Record<string, any> | null
    special_requirements: string | null
    reference_images: string[]

    // Pricing
    piece_rate_minor: number
    base_rate_minor: number | null
    negotiated_rate: boolean
    total_amount_minor: number

    // Timeline
    due_date: string
    requested_at: string
    responded_at: string | null
    accepted_at: string | null
    started_at: string | null
    completed_at: string | null
    qc_passed_at: string | null
    paid_at: string | null
    expires_at: string | null

    // Status
    status: JobRequestStatus
    decline_reason: string | null
    cancel_reason: string | null
    priority: JobPriority

    // Metadata
    created_at: string
    updated_at: string
    created_by: string | null
}

export interface ContractorPayment {
    id: string

    // Relationships
    contractor_id: string
    job_request_id: string | null

    // Payment Details
    amount_minor: number
    currency: string
    payment_method: string

    // Invoice
    invoice_number: string | null
    invoice_url: string | null

    // Status
    status: PaymentStatus

    // Timeline
    period_start: string | null
    period_end: string | null
    approved_at: string | null
    processed_at: string | null
    paid_at: string | null
    failed_at: string | null

    // Transaction
    transaction_id: string | null
    transaction_details: Record<string, any> | null
    failure_reason: string | null

    // Metadata
    created_at: string
    updated_at: string
    created_by: string | null
    approved_by: string | null
    admin_notes: string | null
    contractor_notes: string | null
}

export interface ContractorRate {
    id: string
    contractor_id: string

    // Rate Details
    item_type: string
    piece_rate_minor: number
    base_rate_minor: number | null

    // Negotiation
    negotiated: boolean
    previous_rate_minor: number | null
    negotiation_notes: string | null

    // Validity Period
    effective_from: string
    effective_to: string | null
    is_active: boolean

    // Metadata
    created_at: string
    updated_at: string
    created_by: string | null
}

export interface ContractorAvailability {
    id: string
    contractor_id: string

    // Availability
    date: string
    status: AvailabilityStatus
    capacity: number | null

    // Reason
    reason: string | null
    notes: string | null

    // Metadata
    created_at: string
    updated_at: string
}

export interface ContractorFeedback {
    id: string

    // Relationships
    contractor_id: string
    job_request_id: string
    customer_id: string | null

    // QC Feedback
    qc_passed: boolean | null
    qc_notes: string | null
    issues: QualityIssue[] | null
    rework_required: boolean

    // Customer Feedback
    customer_rating: number | null
    customer_comment: string | null
    customer_feedback_type: FeedbackType | null

    // Quality Metrics
    measurement_accuracy: boolean | null
    stitch_quality: boolean | null
    finish_quality: boolean | null
    timeline_adherence: boolean | null

    // Metadata
    created_at: string
    created_by: string | null
}

export interface ContractorMessage {
    id: string

    // Relationships
    contractor_id: string
    job_request_id: string | null

    // Message
    from_contractor: boolean
    from_user_id: string | null
    message: string
    attachments: string[]

    // Status
    read_at: string | null
    is_announcement: boolean

    // Metadata
    created_at: string
}

// =====================================================
// JOIN TYPES (for API responses)
// =====================================================

export interface JobRequestWithDetails extends JobRequest {
    contractor?: Pick<ContractorProfile, 'id' | 'business_name' | 'location' | 'rating' | 'quality_score'>
    feedback?: ContractorFeedback
    payment?: ContractorPayment
}

export interface ContractorProfileWithStats extends ContractorProfile {
    active_jobs?: number
    pending_jobs?: number
    completed_this_month?: number
    average_rating?: number
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateJobRequestInput {
    contractor_id: string
    order_id?: string
    customer_id?: string
    item_type: string
    item_description?: string
    quantity?: number
    fabric_code?: string
    fabric_type?: string
    measurements?: Record<string, any>
    special_requirements?: string
    reference_images?: string[]
    piece_rate_minor: number
    base_rate_minor?: number
    due_date: string
    priority?: JobPriority
}

export interface UpdateJobRequestStatusInput {
    status: JobRequestStatus
    decline_reason?: string
    cancel_reason?: string
}

export interface UpdateContractorProfileInput {
    business_name?: string
    tax_id?: string
    location?: string
    phone?: string
    status?: ContractorStatus
    max_capacity?: number
    specialties?: string[]
    expert_in?: string[]
    certifications?: string[]
    preferred_payment_method?: string
    minimum_piece_rate_minor?: number
    auto_accept_threshold_minor?: number
}

export interface CreatePaymentInput {
    contractor_id: string
    job_request_id?: string
    amount_minor: number
    payment_method?: string
    period_start?: string
    period_end?: string
    admin_notes?: string
}

export interface SubmitFeedbackInput {
    job_request_id: string
    qc_passed?: boolean
    qc_notes?: string
    issues?: QualityIssue[]
    rework_required?: boolean
    customer_rating?: number
    customer_comment?: string
    customer_feedback_type?: FeedbackType
    measurement_accuracy?: boolean
    stitch_quality?: boolean
    finish_quality?: boolean
    timeline_adherence?: boolean
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatMoney(amountMinor: number, currency = 'USD'): string {
    const amount = amountMinor / 100
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount)
}

export function getStatusColor(status: JobRequestStatus): string {
    const colors: Record<JobRequestStatus, string> = {
        pending: '#f59e0b',        // orange
        accepted: '#3b82f6',        // blue
        declined: '#6b7280',        // gray
        expired: '#6b7280',         // gray
        in_progress: '#8b5cf6',     // purple
        completed: '#10b981',       // green
        qc_review: '#f59e0b',       // orange
        qc_passed: '#10b981',       // green
        qc_failed: '#ef4444',       // red
        rework: '#f59e0b',          // orange
        ready_payment: '#10b981',   // green
        paid: '#059669',            // emerald
        cancelled: '#ef4444',       // red
    }
    return colors[status] || '#6b7280'
}

export function getStatusLabel(status: JobRequestStatus): string {
    const labels: Record<JobRequestStatus, string> = {
        pending: 'Pending Response',
        accepted: 'Accepted',
        declined: 'Declined',
        expired: 'Expired',
        in_progress: 'In Progress',
        completed: 'Completed',
        qc_review: 'QC Review',
        qc_passed: 'QC Passed',
        qc_failed: 'QC Failed',
        rework: 'Rework Needed',
        ready_payment: 'Ready for Payment',
        paid: 'Paid',
        cancelled: 'Cancelled',
    }
    return labels[status] || status
}

export function calculateJobStats(jobs: JobRequest[]) {
    return {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        active: jobs.filter(j => ['accepted', 'in_progress', 'completed', 'qc_review', 'rework'].includes(j.status)).length,
        completed: jobs.filter(j => j.status === 'qc_passed' || j.status === 'paid').length,
        declined: jobs.filter(j => j.status === 'declined' || j.status === 'expired').length,
    }
}
