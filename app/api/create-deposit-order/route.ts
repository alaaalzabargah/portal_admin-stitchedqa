import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper to get CORS headers
 */
const getCorsHeaders = (origin: string | null) => {
    const allowedOrigin = origin === 'https://stitchedqa.com' ? 'https://stitchedqa.com' : '*';

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
    };
};

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin');
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin)
    });
}

export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    try {
        const body = await req.json();

        // Ensure customer_id is truly null if it's an empty string from Liquid
        const { variant_id, quantity, shop_domain } = body;
        const customer_id = body.customer_id ? body.customer_id.trim() : null;

        if (!variant_id || !quantity) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: variant_id and quantity' },
                { status: 400, headers: corsHeaders }
            );
        }

        const draftOrderPayload: any = {
            draft_order: {
                line_items: [
                    {
                        variant_id: variant_id,
                        quantity: quantity,
                    },
                ],
                applied_discount: {
                    description: 'Pay 50% Deposit Now (Rest Upon Delivery)',
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
            },
        };

        // Only add customer data if a real ID exists (Guest checkouts won't have one)
        if (customer_id && customer_id !== "") {
            draftOrderPayload.draft_order.customer = {
                id: customer_id,
            };
            draftOrderPayload.draft_order.use_customer_default_address = true;
        }

        const targetShop = shop_domain || process.env.SHOPIFY_STORE_DOMAIN;
        if (!targetShop) {
            return NextResponse.json(
                { success: false, error: 'Shop domain is missing' },
                { status: 500, headers: corsHeaders }
            );
        }

        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Shopify Admin Access Token is missing' },
                { status: 500, headers: corsHeaders }
            );
        }

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

        if (!shopifyResponse.ok) {
            console.error('Shopify Draft Order Creation Failed:', result.errors || result);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to create Draft Order in Shopify.',
                    details: result.errors || result
                },
                { status: 500, headers: corsHeaders }
            );
        }

        const invoiceUrl = result.draft_order?.invoice_url;

        if (!invoiceUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Draft Order was created but invoice_url was missing',
                    // 👇 THIS IS THE MAGIC LINE TO REVEAL THE ISSUE 👇
                    shopify_raw_response: result
                },
                { status: 500, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { success: true, invoice_url: invoiceUrl },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Internal Server Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', details: String(error) },
            { status: 500, headers: corsHeaders }
        );
    }
}