/**
 * Idempotency Layer for Shopify Webhooks
 * 
 * Ensures duplicate webhook deliveries are handled correctly.
 * Uses two layers of protection:
 * 1. payload_hash in webhook_events table
 * 2. Unique constraints on business keys (handled at data layer)
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { WebhookLogger } from './logger';

// ============ TYPES ============

export interface WebhookEventInsert {
    topic: string;
    payloadHash: string;
    resourceId: string;
    rawPayload?: unknown;
}

export interface WebhookEventUpdate {
    status: 'processed' | 'failed';
    errorMessage?: string;
    processedAt?: Date;
}

// ============ HASH GENERATION ============

/**
 * Generate SHA-256 hash of the raw payload buffer
 */
export function generatePayloadHash(rawBody: Buffer | string): string {
    const buffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ============ SUPABASE CLIENT ============

/**
 * Create Supabase client with service role key for server-only operations
 */
function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase credentials for service client');
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ============ IDEMPOTENCY FUNCTIONS ============

/**
 * Insert a webhook event record for idempotency tracking
 * 
 * Returns:
 * - { isNew: true, id: string } if this is a new webhook
 * - { isNew: false } if this webhook was already processed (duplicate)
 */
export async function insertWebhookEvent(
    event: WebhookEventInsert,
    logger: WebhookLogger
): Promise<{ isNew: boolean; id?: string }> {
    const supabase = getServiceClient();

    try {
        logger.debug('Inserting webhook event', {
            topic: event.topic,
            payloadHash: event.payloadHash.substring(0, 16) + '...',
            resourceId: event.resourceId
        });

        const { data, error } = await supabase
            .from('webhook_events')
            .insert({
                topic: event.topic,
                payload_hash: event.payloadHash,
                resource_id: event.resourceId,
                status: 'received',
                raw_payload: event.rawPayload,
                received_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            logger.warn('Supabase insert error', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });

            // Check for unique constraint violation (23505 is PostgreSQL code)
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                logger.webhookSkipped('duplicate payload_hash');
                return { isNew: false };
            }

            // Other error - throw
            throw error;
        }

        logger.debug('Webhook event inserted successfully', { id: data?.id });
        return { isNew: true, id: data.id };
    } catch (err) {
        // If insert fails due to duplicate, treat as already processed
        const errorMessage = err instanceof Error ? err.message :
            (typeof err === 'object' && err !== null && 'message' in err) ?
                String((err as { message: unknown }).message) : JSON.stringify(err);

        logger.warn('Exception in insertWebhookEvent', { error: errorMessage });

        if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
            logger.webhookSkipped('duplicate payload_hash (caught)');
            return { isNew: false };
        }
        throw err;
    }
}

/**
 * Update webhook event status after processing
 */
export async function updateWebhookEventStatus(
    payloadHash: string,
    update: WebhookEventUpdate,
    logger: WebhookLogger
): Promise<void> {
    const supabase = getServiceClient();

    try {
        const { error } = await supabase
            .from('webhook_events')
            .update({
                status: update.status,
                error_message: update.errorMessage,
                processed_at: update.processedAt?.toISOString() || new Date().toISOString(),
            })
            .eq('payload_hash', payloadHash);

        if (error) {
            logger.warn('Failed to update webhook event status', {
                error: error.message,
                payloadHash
            });
        }
    } catch (err) {
        // Non-critical - log and continue
        logger.warn('Exception updating webhook event status', {
            error: err instanceof Error ? err.message : String(err),
            payloadHash
        });
    }
}

/**
 * Mark webhook as processed
 */
export async function markWebhookProcessed(
    payloadHash: string,
    logger: WebhookLogger
): Promise<void> {
    await updateWebhookEventStatus(payloadHash, {
        status: 'processed',
        processedAt: new Date(),
    }, logger);
}

/**
 * Mark webhook as failed
 */
export async function markWebhookFailed(
    payloadHash: string,
    errorMessage: string,
    logger: WebhookLogger
): Promise<void> {
    await updateWebhookEventStatus(payloadHash, {
        status: 'failed',
        errorMessage: errorMessage.substring(0, 500), // Truncate long errors
        processedAt: new Date(),
    }, logger);
}

// ============ HMAC VERIFICATION ============

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyShopifyHmac(
    rawBody: Buffer | string,
    hmacHeader: string | null
): boolean {
    if (!hmacHeader) return false;

    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
        console.error('SHOPIFY_WEBHOOK_SECRET not configured');
        return false;
    }

    const buffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
    const computedHmac = crypto
        .createHmac('sha256', secret)
        .update(buffer)
        .digest('base64');

    // Use timing-safe comparison
    try {
        return crypto.timingSafeEqual(
            Buffer.from(computedHmac),
            Buffer.from(hmacHeader)
        );
    } catch {
        // If lengths differ, timingSafeEqual throws
        return false;
    }
}

/**
 * Extract resource ID from various payload types
 */
export function extractResourceId(topic: string, payload: unknown): string {
    const data = payload as Record<string, unknown>;

    // Handle refunds specially - they have order_id
    if (topic === 'refunds/create') {
        return String(data.order_id || data.id || 'unknown');
    }

    // Default: use the 'id' field
    return String(data.id || 'unknown');
}
