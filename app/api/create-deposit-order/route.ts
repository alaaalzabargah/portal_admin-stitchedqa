import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new NextResponse(null, { status: 200, headers });
}

export async function POST(req: NextRequest) {
    try {
        // Parse the incoming JSON body
        const body = await req.json();
        const { variant_id, quantity, customer_id, shop_domain } = body;

        // Validate required fields
        if (!variant_id || !quantity) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: variant_id and quantity' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // Construct the draft order payload following the required structure
        const draftOrderPayload: any = {
            draft_order: {
                line_items: [
                    {
                        variant_id: variant_id,
                        quantity: quantity,
                    },
                ],
                applied_discount: {
                    description: 'المبلغ المتبقي (يُدفع نقداً عند الاستلام)',
                    value: '50.0',
                    value_type: 'percentage',
                },
                tags: 'Deposit_Paid, Pending_COD',
                note_attributes: [
                    {
                        name: 'COD_Amount_Due',
                        value: '50%',
                    },
                ],
                use_customer_default_address: true,
            },
        };

        // Only include customer if provided
        if (customer_id) {
            draftOrderPayload.draft_order.customer = {
                id: customer_id,
            };
        } else {
            // Optional: avoid sending use_customer_default_address if there's no customer attached
            delete draftOrderPayload.draft_order.use_customer_default_address;
        }

        // Identify the Shopify store domain
        const targetShop = shop_domain || process.env.SHOPIFY_STORE_DOMAIN;
        if (!targetShop) {
            return NextResponse.json(
                { success: false, error: 'Shop domain is missing' },
                { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // Load the Admin Access Token from the environment variable
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Shopify Admin Access Token is missing' },
                { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // Call the Shopify Admin Draft Orders REST API
        const shopifyRestApiUrl = `https://${targetShop}/admin/api/2024-01/draft_orders.json`;

        const shopifyResponse = await fetch(shopifyRestApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify(draftOrderPayload),
        });

        const result = await shopifyResponse.json();

        // Handle Shopify errors
        if (!shopifyResponse.ok) {
            console.error('Shopify Draft Order Creation Failed:', result.errors || result);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to create Draft Order in Shopify.',
                    details: result.errors || result
                },
                { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // Extract the invoice URL from the newly created draft order
        const invoiceUrl = result.draft_order?.invoice_url;

        if (!invoiceUrl) {
            return NextResponse.json(
                { success: false, error: 'Draft Order was created but invoice_url was missing' },
                { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // Return the successful response mapped identically to the requested output
        return NextResponse.json(
            { success: true, invoice_url: invoiceUrl },
            { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );

    } catch (error) {
        console.error('Internal Server Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
