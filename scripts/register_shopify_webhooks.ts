import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL; // e.g., https://yourdomain.com/api/webhooks/shopify

if (!shopifyDomain || !shopifyToken) {
    console.error('Missing Shopify credentials');
    process.exit(1);
}

if (!webhookUrl) {
    console.error('Missing NEXT_PUBLIC_WEBHOOK_URL in .env.local');
    process.exit(1);
}

const topics = [
    'checkouts/create',
    'orders/create',
    'orders/paid',
    'orders/cancelled',
    'refunds/create',
];

async function registerWebhook(topic: string) {
    if (!shopifyToken) {
        throw new Error('Shopify token is required');
    }

    const url = `https://${shopifyDomain}/admin/api/2024-01/webhooks.json`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            webhook: {
                topic,
                address: webhookUrl,
                format: 'json',
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to register ${topic}: ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Registered webhook: ${topic}`);
    return data.webhook;
}

async function main() {
    console.log('🚀 Registering Shopify webhooks...\n');

    for (const topic of topics) {
        try {
            await registerWebhook(topic);
        } catch (error) {
            console.error(`❌ Error registering ${topic}:`, error);
        }
    }

    console.log('\n✅ Webhook registration complete!');
    console.log(`All webhooks are pointing to: ${webhookUrl}`);
}

main();
