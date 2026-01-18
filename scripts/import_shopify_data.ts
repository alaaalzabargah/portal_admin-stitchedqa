import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

if (!shopifyDomain || !shopifyToken) {
    console.error('Missing Shopify credentials. Please add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Shopify API helper
async function shopifyFetch(endpoint: string) {
    if (!shopifyToken) {
        throw new Error('Shopify token is required');
    }

    const url = `https://${shopifyDomain}/admin/api/2024-01/${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return response.json();
}

// Import customers
async function importCustomers() {
    console.log('📥 Fetching customers from Shopify...');

    let allCustomers: any[] = [];
    let hasNextPage = true;
    let pageInfo: string | null = null;

    while (hasNextPage) {
        const endpoint = pageInfo
            ? `customers.json?limit=250&page_info=${pageInfo}`
            : 'customers.json?limit=250';

        const data = await shopifyFetch(endpoint);
        allCustomers = allCustomers.concat(data.customers);

        // Check for pagination
        hasNextPage = data.customers.length === 250;
        if (hasNextPage && data.customers.length > 0) {
            pageInfo = data.customers[data.customers.length - 1].id;
        } else {
            hasNextPage = false;
        }
    }

    console.log(`Found ${allCustomers.length} customers in Shopify`);

    for (const shopifyCustomer of allCustomers) {
        const phone = shopifyCustomer.phone || shopifyCustomer.default_address?.phone || `+000${shopifyCustomer.id}`;
        const fullName = `${shopifyCustomer.first_name || ''} ${shopifyCustomer.last_name || ''}`.trim() || 'Shopify Customer';

        // Convert total_spent to minor units (cents/fils)
        const totalSpentMinor = Math.round(parseFloat(shopifyCustomer.total_spent || '0') * 100);

        const customerData = {
            external_id: shopifyCustomer.id.toString(),
            full_name: fullName,
            phone: phone,
            email: shopifyCustomer.email || null,
            total_spend_minor: totalSpentMinor,
            order_count: shopifyCustomer.orders_count || 0,
            tags: shopifyCustomer.tags ? shopifyCustomer.tags.split(', ') : [],
            notes: shopifyCustomer.note || null,
            marketing_opt_in: shopifyCustomer.accepts_marketing || false,
        };

        const { error } = await supabase
            .from('customers')
            .upsert(customerData, { onConflict: 'external_id' });

        if (error) {
            console.error(`Error importing customer ${shopifyCustomer.id}:`, error.message);
        } else {
            console.log(`✅ Imported: ${fullName}`);
        }
    }

    console.log('✨ Customer import complete!');
    return allCustomers.length;
}

// Import orders
async function importOrders() {
    console.log('📥 Fetching orders from Shopify...');

    let allOrders: any[] = [];
    let hasNextPage = true;
    let pageInfo: string | null = null;

    while (hasNextPage) {
        const endpoint = pageInfo
            ? `orders.json?limit=250&status=any&page_info=${pageInfo}`
            : 'orders.json?limit=250&status=any';

        const data = await shopifyFetch(endpoint);
        allOrders = allOrders.concat(data.orders);

        hasNextPage = data.orders.length === 250;
        if (hasNextPage && data.orders.length > 0) {
            pageInfo = data.orders[data.orders.length - 1].id;
        } else {
            hasNextPage = false;
        }
    }

    console.log(`Found ${allOrders.length} orders in Shopify`);

    for (const shopifyOrder of allOrders) {
        // Find customer by external_id
        let customerId = null;
        if (shopifyOrder.customer?.id) {
            const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('external_id', shopifyOrder.customer.id.toString())
                .single();

            customerId = customer?.id || null;
        }

        // Map Shopify status to our status
        const statusMap: Record<string, string> = {
            'pending': 'pending',
            'authorized': 'paid',
            'partially_paid': 'pending',
            'paid': 'paid',
            'partially_refunded': 'completed',
            'refunded': 'returned',
            'voided': 'cancelled',
        };

        const status = statusMap[shopifyOrder.financial_status] || 'pending';
        const totalMinor = Math.round(parseFloat(shopifyOrder.total_price || '0') * 100);

        const orderData = {
            external_id: shopifyOrder.id.toString(),
            customer_id: customerId,
            source: 'shopify' as const,
            status: status,
            currency: shopifyOrder.currency || 'QAR',
            total_amount_minor: totalMinor,
            notes: shopifyOrder.note || null,
            created_at: shopifyOrder.created_at,
        };

        const { error } = await supabase
            .from('orders')
            .upsert(orderData, { onConflict: 'external_id' });

        if (error) {
            console.error(`Error importing order ${shopifyOrder.id}:`, error.message);
        } else {
            console.log(`✅ Imported order: ${shopifyOrder.name}`);
        }
    }

    console.log('✨ Order import complete!');
    return allOrders.length;
}

// Main import function
async function main() {
    console.log('🚀 Starting Shopify data import...\n');

    try {
        const customerCount = await importCustomers();
        console.log(`\n📊 Imported ${customerCount} customers\n`);

        const orderCount = await importOrders();
        console.log(`\n📊 Imported ${orderCount} orders\n`);

        console.log('✅ Import complete!');
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

main();
