/**
 * Notification Message Templates
 * 
 * All notification messages in one place.
 * Templates return plain text with emoji formatting
 * that works on both Telegram and WhatsApp.
 */

// =====================================================
// TAILOR ASSIGNMENT NOTIFICATIONS
// =====================================================

export function assignmentCreatedMessage(data: {
    tailorName: string
    itemType: string
    quantity: number
    dueDate: string
    totalAmount?: string
}): string {
    const { tailorName, itemType, quantity, dueDate, totalAmount } = data
    return [
        `📋 New Assignment`,
        ``,
        `Hi ${tailorName},`,
        `You have been assigned a new job:`,
        ``,
        `📦 Item: ${itemType}`,
        `🔢 Quantity: ${quantity}`,
        `📅 Due: ${dueDate}`,
        totalAmount ? `💰 Amount: ${totalAmount}` : '',
        ``,
        `Please confirm receipt and start working on this order.`
    ].filter(Boolean).join('\n')
}

export function assignmentStatusChangedMessage(data: {
    itemType: string
    oldStatus: string
    newStatus: string
    notes?: string
}): string {
    const { itemType, oldStatus, newStatus, notes } = data
    const statusEmoji: Record<string, string> = {
        assigned: '📋',
        in_progress: '🔨',
        completed: '✅',
        qc_passed: '🎉',
        qc_failed: '❌',
        rework: '🔄',
        out_for_delivery: '🚚',
        delivered: '📦',
        paid: '💰',
    }
    const emoji = statusEmoji[newStatus] || '📌'

    return [
        `${emoji} Status Update`,
        ``,
        `📦 Item: ${itemType}`,
        `📌 Status: ${oldStatus} → ${newStatus}`,
        notes ? `📝 Notes: ${notes}` : '',
        ``,
        newStatus === 'qc_passed' ? '🎉 Great work! QC approved.' : '',
        newStatus === 'qc_failed' ? '⚠️ Please review the QC notes and rework.' : '',
    ].filter(Boolean).join('\n')
}

// =====================================================
// PAYMENT NOTIFICATIONS
// =====================================================

export function paymentRecordedMessage(data: {
    tailorName: string
    amount: string
    method: string
    assignmentCount: number
    transactionId?: string
}): string {
    const { tailorName, amount, method, assignmentCount, transactionId } = data
    return [
        `💰 Payment Recorded`,
        ``,
        `Hi ${tailorName},`,
        `A payment has been recorded for you:`,
        ``,
        `💵 Amount: ${amount}`,
        `🏦 Method: ${method}`,
        `📋 Assignments: ${assignmentCount} job(s)`,
        transactionId ? `🆔 Transaction: ${transactionId}` : '',
        ``,
        `Thank you for your excellent work!`
    ].filter(Boolean).join('\n')
}

// =====================================================
// QC NOTIFICATIONS
// =====================================================

export function qcPassedMessage(data: {
    itemType: string
    tailorName: string
    notes?: string
}): string {
    const { itemType, tailorName, notes } = data
    return [
        `🎉 QC Passed`,
        ``,
        `📦 Item: ${itemType}`,
        `👤 Tailor: ${tailorName}`,
        notes ? `📝 Notes: ${notes}` : '',
        ``,
        `This item has passed quality control and is ready for payment.`
    ].filter(Boolean).join('\n')
}

export function qcFailedMessage(data: {
    itemType: string
    tailorName: string
    issues?: string[]
    notes?: string
}): string {
    const { itemType, tailorName, issues, notes } = data
    return [
        `❌ QC Failed — Rework Required`,
        ``,
        `📦 Item: ${itemType}`,
        `👤 Tailor: ${tailorName}`,
        notes ? `📝 Notes: ${notes}` : '',
        issues && issues.length > 0 ? `\n⚠️ Issues:\n${issues.map(i => `  • ${i}`).join('\n')}` : '',
        ``,
        `Please address the issues and resubmit for QC.`
    ].filter(Boolean).join('\n')
}

// =====================================================
// DUE DATE REMINDERS
// =====================================================

export function dueDateReminderMessage(data: {
    tailorName: string
    itemType: string
    daysLeft: number
    dueDate: string
}): string {
    const { tailorName, itemType, daysLeft, dueDate } = data
    const urgency = daysLeft <= 1 ? '🔴' : daysLeft <= 3 ? '🟡' : '🟢'

    return [
        `${urgency} Due Date Reminder`,
        ``,
        `Hi ${tailorName},`,
        daysLeft <= 0
            ? `⚠️ Your assignment is OVERDUE!`
            : `Your assignment is due ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}.`,
        ``,
        `📦 Item: ${itemType}`,
        `📅 Due: ${dueDate}`,
        ``,
        daysLeft <= 0
            ? `Please complete and submit as soon as possible.`
            : `Please ensure timely completion.`
    ].join('\n')
}

// =====================================================
// PRODUCTION ALERTS (replaces inline formatting in health-check)
// =====================================================

export function productionAlertMessage(data: {
    itemName: string
    orderNumber: string
    stage: string
    tailorName: string
    percentElapsed: number
    targetDue: string
}): string {
    const { itemName, orderNumber, stage, tailorName, percentElapsed, targetDue } = data
    const emoji = percentElapsed >= 80 ? '🔴' : percentElapsed >= 50 ? '🟡' : '🟢'
    const urgency = percentElapsed >= 80 ? 'URGENT' : percentElapsed >= 50 ? 'Warning' : 'Info'

    return [
        `${emoji} ${urgency}: Production Alert`,
        ``,
        `📦 Item: ${itemName}`,
        `🆔 Order: ${orderNumber}`,
        `👤 Tailor: ${tailorName}`,
        `⚙️ Stage: ${stage}`,
        `⏱️ Progress: ${percentElapsed.toFixed(0)}% of time elapsed`,
        `📅 Due: ${targetDue}`,
        ``,
        `Please check the production dashboard for details.`
    ].join('\n')
}

// =====================================================
// ADMIN NOTIFICATIONS
// =====================================================

export function adminNewAssignmentMessage(data: {
    tailorName: string
    itemType: string
    quantity: number
    amount: string
}): string {
    const { tailorName, itemType, quantity, amount } = data
    return [
        `📋 New Assignment Created`,
        ``,
        `👤 Tailor: ${tailorName}`,
        `📦 Item: ${itemType} × ${quantity}`,
        `💰 Amount: ${amount}`,
    ].join('\n')
}

export function adminPaymentRecordedMessage(data: {
    tailorName: string
    amount: string
    method: string
}): string {
    const { tailorName, amount, method } = data
    return [
        `💰 Payment Recorded`,
        ``,
        `👤 Tailor: ${tailorName}`,
        `💵 Amount: ${amount}`,
        `🏦 Method: ${method}`,
    ].join('\n')
}

/**
 * Test message to verify messaging is working
 */
export function testMessage(channel: string): string {
    return [
        `✅ Messaging Test Successful`,
        ``,
        `Channel: ${channel}`,
        `Time: ${new Date().toLocaleString('en-GB')}`,
        ``,
        `Your messaging integration is working correctly!`
    ].join('\n')
}
