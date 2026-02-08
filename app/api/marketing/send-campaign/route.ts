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
    bodyVariables: Array<{
        position: number
        value: string
        source: 'static' | 'customer_name' | 'customer_phone' | 'collection_name'
    }>
    buttonVariables: Array<{
        buttonIndex: number
        urlSuffix: string
        source: 'static' | 'collection_slug'
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
        console.log('📨 Campaign request received:', {
            customersCount: body.customers?.length,
            templateName: body.templateName,
            languageCode: body.languageCode,
            hasHeaderImage: !!body.headerImageUrl,
            bodyVariablesCount: body.bodyVariables?.length || 0,
            buttonVariablesCount: body.buttonVariables?.length || 0
        })
        const { customers, templateName, languageCode, headerImageUrl, bodyVariables, buttonVariables } = body

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
                if (bodyVariables && bodyVariables.length > 0) {
                    const bodyParams = bodyVariables.map(v => {
                        let value = v.value
                        if (v.source === 'customer_name') {
                            value = customer.name
                        } else if (v.source === 'customer_phone') {
                            value = customer.phone
                        }
                        // 'collection_name' and 'static' use the provided value
                        return { type: 'text', text: value || '' }
                    })

                    components.push({
                        type: 'body',
                        parameters: bodyParams
                    })
                }

                // Add button parameters (for Dynamic URL buttons)
                if (buttonVariables && buttonVariables.length > 0) {
                    console.log('🔘 Button variables received:', buttonVariables)
                    for (const btnVar of buttonVariables) {
                        const buttonComponent = {
                            type: 'button',
                            sub_type: 'url',
                            index: String(btnVar.buttonIndex),
                            parameters: [{
                                type: 'text',
                                text: btnVar.urlSuffix || ''
                            }]
                        }
                        console.log('🔘 Adding button component:', JSON.stringify(buttonComponent, null, 2))
                        components.push(buttonComponent)
                    }
                }

                // Format phone number (remove non-digits, ensure country code)
                let phone = customer.phone.replace(/\D/g, '')
                if (!phone.startsWith('974') && phone.length === 8) {
                    phone = '974' + phone // Default to Qatar
                }

                // Build Meta API payload
                // Only include template.components if there are actual components
                const payload: any = {
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode }
                    }
                }

                // Only add components if we have any
                if (components.length > 0) {
                    payload.template.components = components
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

                // Debug logging
                console.log('📤 Payload sent to Meta:', JSON.stringify(payload, null, 2))
                console.log('📥 Meta API response:', JSON.stringify(data, null, 2))

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
