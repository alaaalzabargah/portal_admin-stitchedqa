export interface WhatsAppWebhookPayload {
    object: 'whatsapp_business_account'
    entry: WhatsAppEntry[]
}

export interface WhatsAppEntry {
    id: string
    changes: WhatsAppChange[]
}

export interface WhatsAppChange {
    value: WhatsAppChangeValue
    field: 'messages'
}

export interface WhatsAppChangeValue {
    messaging_product: 'whatsapp'
    metadata: {
        display_phone_number: string
        phone_number_id: string
    }
    contacts?: WhatsAppContact[]
    messages?: WhatsAppMessage[]
    statuses?: WhatsAppStatus[]
}

export interface WhatsAppContact {
    profile: {
        name: string
    }
    wa_id: string
}

export interface WhatsAppMessage {
    from: string
    id: string
    timestamp: string
    type: 'text' | 'image' | 'location' | 'button' | 'interactive' | 'order'
    text?: {
        body: string
    }
    image?: {
        mime_type: string
        sha: string
        id: string
        caption?: string
    }
    location?: {
        latitude: number
        longitude: number
        name?: string
        address?: string
    }
    interactive?: {
        type: 'button_reply' | 'list_reply'
        button_reply?: {
            id: string
            title: string
        }
        list_reply?: {
            id: string
            title: string
            description?: string
        }
    }
}

export interface WhatsAppStatus {
    id: string
    status: 'sent' | 'delivered' | 'read'
    timestamp: string
    recipient_id: string
}
