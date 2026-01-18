/**
 * WhatsApp Marketing Campaign API
 * Sends promotional messages via Meta Cloud API
 */

import { NextRequest, NextResponse } from 'next/server'

interface SendCampaignRequest {
    customers: Array<{
        id: string
        name: string
        phone: string
    }>
    templateName: string
    languageCode: string
    headerImageUrl?: string
    variables: Array<{
        position: number
        value: string
        source: 'static' | 'customer_name' | 'customer_phone'
    }>
}

interface SendResult {
    phone: string
    status: 'success' | 'error'
    message: string
    waMessageId?: string
}

export async function POST(request: NextRequest) {
    const META_PHONE_ID = process.env.META_PHONE_ID
    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN

    if (!META_PHONE_ID || !META_ACCESS_TOKEN) {
        return NextResponse.json(
            { error: 'Meta API credentials not configured' },
            { status: 500 }
        )
    }

    try {
        const body: SendCampaignRequest = await request.json()
        const { customers, templateName, languageCode, headerImageUrl, variables } = body

        if (!customers?.length) {
            return NextResponse.json(
                { error: 'No customers selected' },
                { status: 400 }
            )
        }

        if (!templateName) {
            return NextResponse.json(
                { error: 'Template name is required' },
                { status: 400 }
            )
        }

        const results: SendResult[] = []

        // Process each customer
        for (const customer of customers) {
            try {
                // Build template components
                const components: any[] = []

                // Add header component if image URL provided
                if (headerImageUrl) {
                    components.push({
                        type: 'header',
                        parameters: [{
                            type: 'image',
                            image: { link: headerImageUrl }
                        }]
                    })
                }

                // Add body parameters
                if (variables.length > 0) {
                    const bodyParams = variables.map(v => {
                        let value = v.value
                        if (v.source === 'customer_name') {
                            value = customer.name
                        } else if (v.source === 'customer_phone') {
                            value = customer.phone
                        }
                        return { type: 'text', text: value }
                    })

                    components.push({
                        type: 'body',
                        parameters: bodyParams
                    })
                }

                // Format phone number (remove non-digits, ensure country code)
                let phone = customer.phone.replace(/\D/g, '')
                if (!phone.startsWith('974') && phone.length === 8) {
                    phone = '974' + phone // Default to Qatar
                }

                // Build Meta API payload
                const payload = {
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: components.length > 0 ? components : undefined
                    }
                }

                // Send to Meta API
                const response = await fetch(
                    `https://graph.facebook.com/v21.0/${META_PHONE_ID}/messages`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    }
                )

                const data = await response.json()

                if (response.ok) {
                    results.push({
                        phone: customer.phone,
                        status: 'success',
                        message: `Sent to ${customer.name}`,
                        waMessageId: data.messages?.[0]?.id
                    })
                } else {
                    results.push({
                        phone: customer.phone,
                        status: 'error',
                        message: data.error?.message || 'Unknown error'
                    })
                }

            } catch (err) {
                results.push({
                    phone: customer.phone,
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Failed to send'
                })
            }

            // Small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Summary
        const successCount = results.filter(r => r.status === 'success').length
        const errorCount = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            summary: {
                total: customers.length,
                sent: successCount,
                failed: errorCount
            },
            results
        })

    } catch (error) {
        console.error('[Marketing] Campaign send error:', error)
        return NextResponse.json(
            { error: 'Failed to process campaign' },
            { status: 500 }
        )
    }
}
