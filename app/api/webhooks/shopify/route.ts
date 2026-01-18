/**
 * Shopify Webhook Endpoint
 * 
 * Production-ready webhook receiver with:
 * - HMAC signature verification
 * - Strong idempotency via payload_hash
 * - Structured JSON logging with trace_id
 * - Topic-based routing
 * - Proper error handling (always returns 200 to avoid retry storms)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    createWebhookLogger,
    generatePayloadHash,
    verifyShopifyHmac,
    extractResourceId,
    insertWebhookEvent,
    markWebhookProcessed,
    markWebhookFailed,
    getHandler,
    isKnownTopic,
} from '@/lib/webhooks/shopify';

/**
 * Disable Next.js body parsing to get raw buffer for HMAC
 */
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const logger = createWebhookLogger();

    try {
        // 1. Get raw body as text (for HMAC verification)
        const rawBody = await request.text();

        // 2. Get headers
        const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
        const topic = request.headers.get('x-shopify-topic') || 'unknown';

        // 3. Generate payload hash for idempotency
        const payloadHash = generatePayloadHash(rawBody);

        // 4. Parse payload to extract resource ID
        let payload: unknown;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            logger.error('Failed to parse JSON payload');
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const resourceId = extractResourceId(topic, payload);

        // 5. Set logger context
        logger.webhookReceived(topic, resourceId, payloadHash);

        // 6. Verify HMAC signature
        if (!verifyShopifyHmac(rawBody, hmacHeader)) {
            logger.error('Invalid HMAC signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        logger.debug('HMAC verified');

        // 7. Check if this is a known topic
        if (!isKnownTopic(topic)) {
            logger.warn(`Unknown topic: ${topic}`);
            return NextResponse.json({ received: true, topic: 'unknown' }, { status: 200 });
        }

        // 8. Idempotency check - insert webhook event
        const { isNew, id: webhookEventId } = await insertWebhookEvent({
            topic,
            payloadHash,
            resourceId,
            rawPayload: payload,
        }, logger);

        if (!isNew) {
            // Duplicate webhook - already processed
            logger.webhookSkipped('duplicate');
            return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
        }

        logger.debug('Webhook event recorded', { webhookEventId });

        // 9. Get and execute handler
        const handler = getHandler(topic);

        if (!handler) {
            logger.warn(`No handler for topic: ${topic}`);
            await markWebhookFailed(payloadHash, 'No handler', logger);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // 10. Process the webhook
        const result = await handler(payload, payloadHash, logger);

        if (result.success) {
            await markWebhookProcessed(payloadHash, logger);
            logger.webhookProcessed();
        } else {
            await markWebhookFailed(payloadHash, result.error || 'Unknown error', logger);
            logger.webhookFailed(result.error || 'Unknown error');
        }

        // 11. Always return 200 to prevent Shopify retries
        return NextResponse.json({
            received: true,
            processed: result.success,
        }, { status: 200 });

    } catch (err) {
        // Catch-all error handler
        let errorMessage: string;
        if (err instanceof Error) {
            errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'message' in err) {
            errorMessage = String((err as { message: unknown }).message);
        } else {
            errorMessage = JSON.stringify(err);
        }
        logger.error('Unhandled webhook error', errorMessage);

        // Always return 200 to prevent retry storms
        return NextResponse.json({
            received: true,
            error: 'Processing failed'
        }, { status: 200 });
    }
}

/**
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'shopify-webhooks',
        topics: [
            'checkouts/create',
            'checkouts/update',
            'orders/create',
            'orders/paid',
            'orders/cancelled',
            'refunds/create',
            'customers/create',
            'customers/update',
        ],
    });
}
