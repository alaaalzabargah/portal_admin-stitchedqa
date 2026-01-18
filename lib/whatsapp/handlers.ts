import { WhatsAppMessage } from './types'
import { WhatsAppSession, updateSessionState } from './session'
import { sendSimpleText, sendMenu } from './api'

export async function handleWhatsAppMessage(session: WhatsAppSession, message: WhatsAppMessage) {
    const msgBody = message.text?.body || ''
    const buttonId = message.interactive?.button_reply?.id
    const listId = message.interactive?.list_reply?.id

    // Normalize input (Button ID takes precedence, then text)
    const input = buttonId || listId || msgBody.trim().toLowerCase()

    console.log(`[Flow] Session: ${session.id} | State: ${session.state} | Input: ${input}`)

    // STATE MACHINE
    switch (session.state) {
        case 'idle':
            if (input.includes('hi') || input.includes('hello') || input === 'menu') {
                await sendMenu(message.from)
            } else if (input === 'new_order') {
                await updateSessionState(session.id, 'collecting_info', { step: 'ask_type' })
                await sendSimpleText(message.from, "Great! What type of product are you looking for? (e.g., Black, Bisht, Colored)")
            } else if (input === 'my_measurements') {
                // TODO: Fetch measurements from DB and show
                await sendSimpleText(message.from, "Fetching your latest measurements...")
            } else if (input === 'track_order') {
                // TODO: Fetch recent order status
                await sendSimpleText(message.from, "Checking your recent orders...")
            } else {
                await sendSimpleText(message.from, "I'm not sure I understood. Type 'Menu' to see options.")
            }
            break

        case 'collecting_info':
            // Simple mock flow
            const context = typeof session.context_data === 'string' ? JSON.parse(session.context_data) : session.context_data

            if (context?.step === 'ask_type') {
                await updateSessionState(session.id, 'collecting_info', { ...context, type: input, step: 'ask_fabric' })
                await sendSimpleText(message.from, "Noted. Which fabric do you prefer?")
            } else if (context?.step === 'ask_fabric') {
                await updateSessionState(session.id, 'idle', {}) // Reset
                await sendSimpleText(message.from, `Perfect! I've noted your request for a ${context.type} item in ${input}. An admin will confirm details shortly.`)
                // TODO: Create Order in DB
            }
            break

        default:
            await sendMenu(message.from)
            await updateSessionState(session.id, 'idle')
            break
    }
}
