const GRAPH_API_URL = 'https://graph.facebook.com/v17.0'

export type MessageType = 'text' | 'template' | 'interactive' | 'image'

export async function sendWhatsAppMessage(to: string, type: MessageType, content: any) {
    const token = process.env.WHATSAPP_API_ACCESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!token || !phoneId) {
        console.warn('[WhatsApp] Missing API Usage credentials. Message not sent:', { to, type, content })
        return null
    }

    const payload: any = {
        messaging_product: 'whatsapp',
        to: to,
        type: type,
    }

    if (type === 'text') payload.text = content
    if (type === 'template') payload.template = content
    if (type === 'interactive') payload.interactive = content
    if (type === 'image') payload.image = content

    try {
        const res = await fetch(`${GRAPH_API_URL}/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('[WhatsApp] API Error:', data)
            return null
        }

        return data
    } catch (error) {
        console.error('[WhatsApp] Network Error:', error)
        return null
    }
}

export async function sendSimpleText(to: string, body: string) {
    return sendWhatsAppMessage(to, 'text', { body, preview_url: false })
}

export async function sendMenu(to: string) {
    return sendWhatsAppMessage(to, 'interactive', {
        type: 'button',
        body: {
            text: "Welcome to Stitched! How can we assist you today?"
        },
        action: {
            buttons: [
                {
                    type: "reply",
                    reply: { id: "new_order", title: "New Order" }
                },
                {
                    type: "reply",
                    reply: { id: "my_measurements", title: "My Measurements" }
                },
                {
                    type: "reply",
                    reply: { id: "track_order", title: "Track Order" }
                }
            ]
        }
    })
}
