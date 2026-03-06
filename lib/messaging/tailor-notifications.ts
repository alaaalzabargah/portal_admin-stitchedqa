/**
 * Tailor-specific notification functions
 * 
 * High-level functions that compose templates + send via the messaging layer.
 * These are the functions you call from the UI/API to send notifications.
 */

import { sendMessage, sendAdminMessage, getActiveChannel } from '@/lib/messaging'
import { formatMoney } from '@/lib/types/tailor'
import type { Tailor, TailorAssignment, TailorPayment } from '@/lib/types/tailor'
import {
    assignmentCreatedMessage,
    assignmentStatusChangedMessage,
    paymentRecordedMessage,
    qcPassedMessage,
    qcFailedMessage,
    dueDateReminderMessage,
    adminNewAssignmentMessage,
    adminPaymentRecordedMessage,
} from '@/lib/messaging/templates'

// =====================================================
// HELPERS
// =====================================================

/**
 * Get the messaging recipient for a tailor based on active channel.
 * Telegram uses telegram_chat_id, WhatsApp uses phone.
 */
function getTailorRecipient(tailor: Pick<Tailor, 'phone' | 'telegram_chat_id'>): string | null {
    const channel = getActiveChannel()
    if (channel === 'telegram') {
        return tailor.telegram_chat_id || null
    }
    return tailor.phone || null
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================

/**
 * Notify tailor when a new job is assigned to them.
 * Also notifies admin.
 */
export async function notifyAssignmentCreated(
    tailor: Pick<Tailor, 'full_name' | 'phone' | 'telegram_chat_id'>,
    assignment: Pick<TailorAssignment, 'item_type' | 'quantity' | 'due_date' | 'total_amount_minor'>
) {
    const results = []

    // Notify tailor
    const recipient = getTailorRecipient(tailor)
    if (recipient) {
        const message = assignmentCreatedMessage({
            tailorName: tailor.full_name,
            itemType: assignment.item_type,
            quantity: assignment.quantity,
            dueDate: new Date(assignment.due_date).toLocaleDateString('en-GB'),
            totalAmount: formatMoney(assignment.total_amount_minor),
        })
        results.push(await sendMessage(recipient, message))
    }

    // Notify admin
    const adminMsg = adminNewAssignmentMessage({
        tailorName: tailor.full_name,
        itemType: assignment.item_type,
        quantity: assignment.quantity,
        amount: formatMoney(assignment.total_amount_minor),
    })
    results.push(await sendAdminMessage(adminMsg))

    return results
}

/**
 * Notify tailor when their assignment status changes.
 */
export async function notifyStatusUpdate(
    tailor: Pick<Tailor, 'full_name' | 'phone' | 'telegram_chat_id'>,
    assignment: Pick<TailorAssignment, 'item_type'>,
    oldStatus: string,
    newStatus: string,
    notes?: string
) {
    const recipient = getTailorRecipient(tailor)
    if (!recipient) return []

    const message = assignmentStatusChangedMessage({
        itemType: assignment.item_type,
        oldStatus,
        newStatus,
        notes,
    })

    return [await sendMessage(recipient, message)]
}

/**
 * Notify tailor when payment is recorded.
 * Also notifies admin.
 */
export async function notifyPaymentRecorded(
    tailor: Pick<Tailor, 'full_name' | 'phone' | 'telegram_chat_id'>,
    payment: Pick<TailorPayment, 'amount_minor' | 'payment_method' | 'assignment_ids' | 'transaction_id'>
) {
    const results = []

    // Notify tailor
    const recipient = getTailorRecipient(tailor)
    if (recipient) {
        const message = paymentRecordedMessage({
            tailorName: tailor.full_name,
            amount: formatMoney(payment.amount_minor),
            method: payment.payment_method || 'Bank Transfer',
            assignmentCount: payment.assignment_ids?.length || 0,
            transactionId: payment.transaction_id || undefined,
        })
        results.push(await sendMessage(recipient, message))
    }

    // Notify admin
    const adminMsg = adminPaymentRecordedMessage({
        tailorName: tailor.full_name,
        amount: formatMoney(payment.amount_minor),
        method: payment.payment_method || 'Bank Transfer',
    })
    results.push(await sendAdminMessage(adminMsg))

    return results
}

/**
 * Notify admin about QC results.
 * Notify tailor about pass/fail.
 */
export async function notifyQCResult(
    tailor: Pick<Tailor, 'full_name' | 'phone' | 'telegram_chat_id'>,
    assignment: Pick<TailorAssignment, 'item_type'>,
    passed: boolean,
    notes?: string,
    issues?: string[]
) {
    const results = []

    const recipient = getTailorRecipient(tailor)
    if (recipient) {
        const message = passed
            ? qcPassedMessage({
                itemType: assignment.item_type,
                tailorName: tailor.full_name,
                notes,
            })
            : qcFailedMessage({
                itemType: assignment.item_type,
                tailorName: tailor.full_name,
                issues,
                notes,
            })
        results.push(await sendMessage(recipient, message))
    }

    // Always notify admin about QC results
    const adminMsg = passed
        ? qcPassedMessage({
            itemType: assignment.item_type,
            tailorName: tailor.full_name,
            notes,
        })
        : qcFailedMessage({
            itemType: assignment.item_type,
            tailorName: tailor.full_name,
            issues,
            notes,
        })
    results.push(await sendAdminMessage(adminMsg))

    return results
}

/**
 * Send due date reminder to tailor.
 */
export async function notifyDueDateReminder(
    tailor: Pick<Tailor, 'full_name' | 'phone' | 'telegram_chat_id'>,
    assignment: Pick<TailorAssignment, 'item_type' | 'due_date'>,
    daysLeft: number
) {
    const recipient = getTailorRecipient(tailor)
    if (!recipient) return []

    const message = dueDateReminderMessage({
        tailorName: tailor.full_name,
        itemType: assignment.item_type,
        daysLeft,
        dueDate: new Date(assignment.due_date).toLocaleDateString('en-GB'),
    })

    return [await sendMessage(recipient, message)]
}
