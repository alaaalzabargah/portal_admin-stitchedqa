import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

const supabase = createClient(supabaseUrl!, serviceRoleKey!);

/**
 * Helper to extract the next page info from Shopify's Link header
 */
function getNextPageInfo(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const nextLink = linkHeader.split(',').find(s => s.includes('rel="next"'));
    if (!nextLink) return null;
    const match = nextLink.match(/page_info=([^>&]+)/);
    return match ? match[1] : null;
}

async function shopifyFetch(endpoint: string) {
    const url = `https://${shopifyDomain}/admin/api/2026-01/${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'X-Shopify-Access-Token': shopifyToken!,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) throw new Error(`Shopify error: ${response.statusText}`);

    return {
        data: await response.json(),
        nextPage: getNextPageInfo(response.headers.get('Link'))
    };
}

async function importCustomers() {
    console.log('📥 Importing Customers...');
    let pageInfo: string | null = null;
    let totalCount = 0;

    do {
        // If pageInfo exists, it MUST be the only parameter
        const endpoint = pageInfo
            ? `customers.json?page_info=${pageInfo}`
            : `customers.json?limit=250`;

        const { data, nextPage } = await shopifyFetch(endpoint);
        // ... rest of your logic
    } while (pageInfo);

    // Inside importOrders
    do {
        // If pageInfo exists, remove status and limit
        const endpoint = pageInfo
            ? `orders.json?page_info=${pageInfo}`
            : `orders.json?limit=250&status=any`;

        const { data, nextPage } = await shopifyFetch(endpoint);
        // ... rest of your logic
    } while (pageInfo);

    return totalCount;
}

async function importOrders() {
    console.log('📥 Importing Orders...');

    // 1. Pre-fetch a map of external_id -> supabase_uuid to avoid N+1 queries
    const { data: customerMap } = await supabase.from('customers').select('id, external_id');
    const idLookup = new Map(customerMap?.map(c => [c.external_id, c.id]));

    let pageInfo: string | null = null;
    let totalCount = 0;

    const statusMap: Record<string, string> = {
        'authorized': 'paid', 'paid': 'paid', 'refunded': 'returned', 'voided': 'cancelled'
    };

    do {
        const query = pageInfo ? `page_info=${pageInfo}&limit=250` : `limit=250&status=any`;
        const { data, nextPage } = await shopifyFetch(`orders.json?${query}`);

        // Prepare Order Batch
        const orderBatch = data.orders.map((o: any) => ({
            external_id: o.id.toString(),
            customer_id: o.customer ? idLookup.get(o.customer.id.toString()) : null,
            source: 'shopify',
            status: statusMap[o.financial_status] || 'pending',
            currency: o.currency || 'QAR',
            total_amount_minor: Math.round(parseFloat(o.total_price || '0') * 100),
            created_at: o.created_at,
        }));

        // Upsert Orders and Return IDs
        const { data: upsertedOrders, error } = await supabase
            .from('orders')
            .upsert(orderBatch, { onConflict: 'external_id' })
            .select('id, external_id');

        if (error) {
            console.error('Batch error:', error.message);
            continue; // Skip this batch if orders fail
        }

        // Create Map of Shopify ID -> Supabase Order ID
        const orderIdMap = new Map(upsertedOrders?.map(o => [o.external_id, o.id]));
        const currentBatchOrderIds = Array.from(orderIdMap.values());

        // Prepare Line Items
        const lineItemsBatch: any[] = [];
        for (const o of data.orders) {
            const orderId = orderIdMap.get(o.id.toString());
            if (!orderId) continue;

            for (const item of o.line_items) {
                // Parse options for Size / Color if available
                let size = null;
                let color = null;
                // Shopify returns variant_title like "Small / Red" or just "Small"
                if (item.variant_title) {
                    const parts = item.variant_title.split(' / ');
                    if (parts.length >= 1) size = parts[0];
                    if (parts.length >= 2) color = parts[1];
                }

                lineItemsBatch.push({
                    order_id: orderId,
                    product_name: item.name,
                    quantity: item.quantity,
                    unit_price_minor: Math.round(parseFloat(item.price || '0') * 100),
                    variant_title: item.variant_title,
                    size: size,
                    color: color
                });
            }
        }

        if (lineItemsBatch.length > 0) {
            // 1. DELETE existing line items for these orders (Idempotency)
            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .in('order_id', currentBatchOrderIds);

            if (deleteError) console.error('Error deleting old items:', deleteError.message);

            // 2. INSERT new line items
            const { error: insertError } = await supabase
                .from('order_items')
                .insert(lineItemsBatch);

            if (insertError) console.error('Error inserting line items:', insertError.message);
        }

        totalCount += orderBatch.length;
        console.log(`Synced ${totalCount} orders and ${lineItemsBatch.length} line items...`);
        pageInfo = nextPage;
    } while (pageInfo);

    return totalCount;
}


async function recalculateStats() {
    console.log('🔄 Recalculating Customer Stats & Tiers...');

    // 1. Fetch all PAID orders
    // We only count 'paid', 'completed', 'shipped' as valid spend
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total_amount_minor, status')
        .not('customer_id', 'is', null)
        .in('status', ['paid', 'shipped', 'completed']);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError.message);
        return;
    }

    // 2. Fetch Loyalty Tiers
    const { data: tiers, error: tiersError } = await supabase
        .from('loyalty_tiers')
        .select('name, min_spend_minor')
        .order('min_spend_minor', { ascending: false });

    if (tiersError) {
        console.error('Error fetching tiers:', tiersError.message);
        return;
    }

    // 3. Aggregate Stats per Customer
    const customerStats = new Map<string, { spend: number; count: number }>();

    orders?.forEach(o => {
        if (!o.customer_id) return;
        const current = customerStats.get(o.customer_id) || { spend: 0, count: 0 };
        current.spend += o.total_amount_minor;
        current.count += 1;
        customerStats.set(o.customer_id, current);
    });

    console.log(`Calculated stats for ${customerStats.size} customers.`);

    // 4. Update Customers
    // For efficiency, we'll fetch all customers first to only update those who need changes, 
    // or just iterate and update all found in the map.
    let updatedCount = 0;

    for (const [customerId, stats] of customerStats) {
        // Determine Tier
        let assignedTier = 'Bronze'; // Default
        for (const tier of tiers || []) {
            if (stats.spend >= tier.min_spend_minor) {
                assignedTier = tier.name;
                break;
            }
        }

        // Update Supabase
        const { error: updateError } = await supabase
            .from('customers')
            .update({
                total_spend_minor: stats.spend,
                order_count: stats.count,
                status_tier: assignedTier
            })
            .eq('id', customerId);

        if (updateError) {
            console.error(`Failed to update customer ${customerId}:`, updateError.message);
        } else {
            updatedCount++;
        }

        if (updatedCount % 50 === 0) process.stdout.write('.');
    }
    console.log(`\n✅ Updated stats for ${updatedCount} customers.`);
}

async function main() {
    try {
        await importCustomers();
        await importOrders();
        await recalculateStats();
        console.log('✅ Full Sync Complete!');
    } catch (e) {
        console.error('❌ Fatal Error:', e);
    }
}

main();