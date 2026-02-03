/**
 * Telegram Bot Utility
 * Sends notifications via Telegram Bot API
 */

interface TelegramMessage {
    chat_id: string
    text: string
    parse_mode?: 'Markdown' | 'HTML'
}

export async function sendTelegramMessage(
    chatId: string,
    message: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
        console.warn('[Telegram] Bot token not configured')
        return false
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: parseMode
                } as TelegramMessage)
            }
        )

        const data = await response.json()

        if (!response.ok) {
            console.error('[Telegram] Send failed:', data)
            return false
        }

        return true
    } catch (error) {
        console.error('[Telegram] Error:', error)
        return false
    }
}

/**
 * Format a production alert message
 */
export function formatProductionAlert(data: {
    itemName: string
    orderNumber: string
    stage: string
    tailorName: string
    percentElapsed: number
    targetDue: Date
}): string {
    const { itemName, orderNumber, stage, tailorName, percentElapsed, targetDue } = data

    const emoji = percentElapsed >= 80 ? '🔴' : percentElapsed >= 50 ? '🟡' : '🟢'
    const urgency = percentElapsed >= 80 ? 'URGENT' : percentElapsed >= 50 ? 'Warning' : 'Info'

    return `
${emoji} *${urgency}: Production Alert*

📦 *Item:* ${itemName}
🆔 *Order:* ${orderNumber}
👤 *Tailor:* ${tailorName}
⚙️ *Stage:* ${stage}
⏱️ *Progress:* ${percentElapsed.toFixed(0)}% of time elapsed
📅 *Due:* ${targetDue.toLocaleDateString('en-GB')}

Please check the production dashboard for details.
`.trim()
}

/**
 * Calculate time-based health status
 */
export function calculateProductionHealth(assignedAt: Date, targetDueAt: Date): {
    status: 'safe' | 'warning' | 'critical' | 'overdue'
    percentElapsed: number
    timeRemaining: string
} {
    const now = new Date()
    const elapsed = now.getTime() - assignedAt.getTime()
    const totalDuration = targetDueAt.getTime() - assignedAt.getTime()
    const percentElapsed = (elapsed / totalDuration) * 100

    let status: 'safe' | 'warning' | 'critical' | 'overdue' = 'safe'
    if (percentElapsed >= 100) {
        status = 'overdue'
    } else if (percentElapsed >= 80) {
        status = 'critical'
    } else if (percentElapsed >= 50) {
        status = 'warning'
    }

    // Calculate time remaining
    const remaining = targetDueAt.getTime() - now.getTime()
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    let timeRemaining = ''
    if (remaining < 0) {
        timeRemaining = 'Overdue'
    } else if (days > 0) {
        timeRemaining = `${days}d ${hours}h`
    } else if (hours > 0) {
        timeRemaining = `${hours}h ${minutes}m`
    } else {
        timeRemaining = `${minutes}m`
    }

    return {
        status,
        percentElapsed: Math.min(percentElapsed, 100),
        timeRemaining
    }
}
