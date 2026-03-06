import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper to get CORS headers
 */
const getCorsHeaders = (origin: string | null) => {
    // Determine the allowed origin. 
    // If it's your storefront, you might want to specifically allow it, or use '*'
    // 'https://stitchedqa.com' is seen in the error message.
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
        status: 204, // 204 No Content is standard for OPTIONS preflight
        headers: getCorsHeaders(origin)
    });
}

export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    try {
        // Parse the incoming JSON body
        const body = await req.json();
        const { variant_id, quantity, customer_id, shop_domain } = body;

        // Validate required fields
        if (!variant_id || !quantity) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: variant_id and quantity' },
                { status: 400, headers: corsHeaders }
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
                    description: 'Remaining Amount (Cash on Delivery)',
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
                { status: 500, headers: corsHeaders }
            );
        }

        // Load the Admin Access Token from the environment variable
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Shopify Admin Access Token is missing' },
                { status: 500, headers: corsHeaders }
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
                { status: 500, headers: corsHeaders }
            );
        }

        // Extract the invoice URL from the newly created draft order
        const invoiceUrl = result.draft_order?.invoice_url;

        if (!invoiceUrl) {
            return NextResponse.json(
                { success: false, error: 'Draft Order was created but invoice_url was missing' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Return the successful response mapped identically to the requested output
        return NextResponse.json(
            { success: true, invoice_url: invoiceUrl },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Internal Server Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
