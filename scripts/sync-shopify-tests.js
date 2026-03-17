require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!supabaseUrl || !serviceKey || !shopifyDomain || !shopifyToken) {
        console.error('Missing credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    console.log(`Fetching orders from ${shopifyDomain}...`);

    let url = `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&limit=250&fields=id,test`;
    let checkedCount = 0;
    let updatedCount = 0;

    try {
        while (url) {
            console.log(`Fetching page: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'X-Shopify-Access-Token': shopifyToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Shopify API error: ${response.status} ${text}`);
            }

            const data = await response.json();
            const orders = data.orders || [];

            for (const order of orders) {
                checkedCount++;
                const shopifyOrderId = String(order.id);
                const isTest = order.test;

                // Only perform update if is_test is true
                if (isTest) {
                    const { error } = await supabase
                        .from('orders')
                        .update({ is_test: true })
                        .eq('shopify_order_id', shopifyOrderId);

                    if (error) {
                        console.error(`Error updating order ${shopifyOrderId}:`, error.message);
                    } else {
                        updatedCount++;
                    }
                }
            }

            // Pagination (Link header)
            const linkHeader = response.headers.get('link');
            url = null; // Default to stopping
            if (linkHeader) {
                const links = linkHeader.split(',').map(part => part.trim());
                for (const link of links) {
                    // Extract URL and rel
                    const match = link.match(/<(.*)>;\s*rel="(.*)"/);
                    if (match && match[2] === 'next') {
                        url = match[1];
                        break;
                    }
                }
            }
        }

        console.log(`\nSync complete!`);
        console.log(`Total orders checked: ${checkedCount}`);
        console.log(`Total test orders flagged in database: ${updatedCount}`);
        
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

main();
