/**
 * Topic Handlers for Shopify Webhooks
 * 
 * Each handler processes a specific webhook topic, validates the payload,
 * extracts data, and stores it in Supabase.
 */

import { z } from 'zod';
import type { WebhookLogger } from './logger';
import {
    ShopifyCheckoutSchema,
    ShopifyOrderSchema,
    ShopifyRefundSchema
} from './schemas';
import {
    extractCustomerInfo,
    extractLineItems,
    extractShippingTotal,
    extractRefundAmount,
    priceToMinor,
    formatAddressForStorage,
    extractCustomerMeasurements,
} from './extractors';
import {
    findOrCreateCustomer,
    upsertCheckout,
    replaceCheckoutItems,
    upsertOrder,
    replaceOrderItems,
    markOrderPaid,
    markOrderCancelled,
    insertRefund,
    insertOrderEvent,
    findLatestCheckoutPhone,
} from './data-layer';
import { maskEmail, maskPhone } from './logger';

// ============ HANDLER RESULT ============

export interface HandlerResult {
    success: boolean;
    error?: string;
}

// ============ CHECKOUT HANDLER ============

/**
 * Handle checkouts/create webhook
 */
export async function handleCheckoutCreate(
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
): Promise<HandlerResult> {
    try {
        // Validate payload
        const result = ShopifyCheckoutSchema.safeParse(payload);
        if (!result.success) {
            const errorMsg = 'Validation failed: ' + result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            logger.validationFailed(errorMsg);
            return { success: false, error: errorMsg };
        }

        const checkout = result.data;
        const shopifyCheckoutId = String(checkout.id);

        // Extract customer info
        const customerInfo = extractCustomerInfo(checkout as any);
        customerInfo.measurements = extractCustomerMeasurements(checkout.line_items);

        // Log extracted data for debugging
        logger.info('Processing checkout', {
            shopifyCheckoutId,
            email: maskEmail(checkout.email),
            itemCount: checkout.line_items?.length || 0,
            phone: maskPhone(customerInfo.phone),
            name: customerInfo.fullName || '[missing]',
            hasMeasurements: !!customerInfo.measurements,
            hasShippingAddress: !!(checkout as any).shipping_address,
            hasBillingAddress: !!(checkout as any).billing_address,
            hasCustomer: !!(checkout as any).customer
        });

        // Skip customer creation if we don't have a valid phone
        // Wait for orders/paid webhook which has better phone extraction
        const hasValidPhone = customerInfo.phone &&
            !customerInfo.phone.startsWith('+shop') &&
            !customerInfo.phone.startsWith('guest:') &&
            !customerInfo.phone.startsWith('unknown:');

        if (!hasValidPhone) {
            logger.warn('Skipping customer creation - no valid phone in checkout', {
                shopifyCheckoutId,
                hasPhone: !!customerInfo.phone,
                email: maskEmail(checkout.email)
            });

            // Just save the checkout data, don't create customer
            const checkoutId = await upsertCheckout({
                shopifyCheckoutId,
                shopifyCheckoutToken: checkout.token,
                customerId: null, // No customer yet
                email: customerInfo.email,
                fullName: customerInfo.fullName,
                phone: customerInfo.phone,
                shippingAddress: formatAddressForStorage(checkout.shipping_address),
                subtotalMinor: priceToMinor(checkout.subtotal_price),
                totalTaxMinor: priceToMinor(checkout.total_tax),
                totalShippingMinor: 0,
                totalPriceMinor: priceToMinor(checkout.total_price),
                currency: checkout.currency || 'QAR',
                abandonedCheckoutUrl: checkout.abandoned_checkout_url,
                completedAt: checkout.completed_at,
                rawPayload: payload,
            }, logger);

            logger.info('Checkout saved without customer', { checkoutId });
            return { success: true };
        }

        // Find or create customer (only if we have valid phone)
        const customerId = await findOrCreateCustomer(
            checkout.customer?.id ? String(checkout.customer.id) : undefined,
            customerInfo,
            logger
        );

        // Extract line items
        const lineItems = extractLineItems(checkout.line_items);

        // Upsert checkout
        const checkoutId = await upsertCheckout({
            shopifyCheckoutId,
            shopifyCheckoutToken: checkout.token,
            customerId,
            email: customerInfo.email,
            fullName: customerInfo.fullName,
            phone: customerInfo.phone,
            shippingAddress: formatAddressForStorage(checkout.shipping_address),
            subtotalMinor: priceToMinor(checkout.subtotal_price),
            totalTaxMinor: priceToMinor(checkout.total_tax),
            totalShippingMinor: 0, // Checkout doesn't have shipping yet
            totalPriceMinor: priceToMinor(checkout.total_price),
            currency: checkout.currency || 'QAR',
            abandonedCheckoutUrl: checkout.abandoned_checkout_url,
            completedAt: checkout.completed_at,
            rawPayload: payload,
        }, logger);

        if (!checkoutId) {
            return { success: false, error: 'Failed to upsert checkout' };
        }

        // Replace checkout items
        await replaceCheckoutItems(checkoutId, lineItems, logger);

        logger.info('Checkout processed', {
            checkoutId,
            itemCount: lineItems.length
        });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Checkout handler error', error);
        return { success: false, error };
    }
}

// ============ ORDER CREATE HANDLER ============

/**
 * Handle orders/create webhook
 */
export async function handleOrderCreate(
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
): Promise<HandlerResult> {
    try {
        // Validate payload
        const result = ShopifyOrderSchema.safeParse(payload);
        if (!result.success) {
            const errorMsg = result.error.issues[0]?.message || 'Validation failed';
            logger.validationFailed(errorMsg);
            return { success: false, error: errorMsg };
        }

        const order = result.data;
        const shopifyOrderId = String(order.id);

        logger.info('Processing order', {
            shopifyOrderId,
            orderNumber: order.order_number,
            email: maskEmail(order.email),
            financialStatus: order.financial_status,
            itemCount: order.line_items?.length || 0,
        });

        // Extract customer info from order
        const customerInfo = extractCustomerInfo(order as any);
        customerInfo.measurements = extractCustomerMeasurements(order.line_items);

        // Log extracted data for debugging
        logger.info('Extracted customer data from order', {
            name: customerInfo.fullName || '[missing]',
            phone: maskPhone(customerInfo.phone),
            email: maskEmail(customerInfo.email),
            hasMeasurements: !!customerInfo.measurements
        });

        if (customerInfo.measurements) {
            logger.info('Measurements extracted from order', {
                measurementType: customerInfo.measurements.measurement_type,
                standardSize: (customerInfo.measurements as any).standard_size,
                hasCustomMeasurements: Object.keys(customerInfo.measurements).length > 2
            });
        } else {
            logger.info('No measurements found in order line items');
        }

        // Find or create customer
        const customerId = await findOrCreateCustomer(
            order.customer?.id ? String(order.customer.id) : undefined,
            customerInfo,
            logger
        );

        // CRITICAL: Validate customer ID
        if (!customerId) {
            const errorDetails = `shopifyCustomerId: ${order.customer?.id}, email: ${customerInfo.email}, orderNumber: ${order.order_number}`;
            logger.error('Failed to resolve customer ID', errorDetails);
            return { success: false, error: 'Customer ID resolution failed' };
        }

        logger.info('Customer resolved', {
            customerId,
            email: maskEmail(customerInfo.email),
            shopifyCustomerId: order.customer?.id
        });

        // Extract line items
        const lineItems = extractLineItems(order.line_items as any);

        // Calculate shipping
        const shippingMinor = extractShippingTotal(order as any);

        // Upsert order
        const orderId = await upsertOrder({
            shopifyOrderId,
            shopifyOrderNumber: order.order_number ? String(order.order_number) : undefined,
            orderName: order.name,
            customerId,
            email: customerInfo.email,
            shippingAddress: formatAddressForStorage(order.shipping_address),
            subtotalMinor: priceToMinor(order.subtotal_price),
            totalTaxMinor: priceToMinor(order.total_tax),
            totalShippingMinor: shippingMinor,
            totalAmountMinor: priceToMinor(order.total_price),
            paidAmountMinor: order.financial_status === 'paid' ? priceToMinor(order.total_price) : 0,
            currency: order.currency || 'QAR',
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            notes: order.note,
            createdAt: order.created_at,
            rawPayload: payload,
        }, logger);

        if (!orderId) {
            logger.error('Failed to upsert order', `shopifyOrderId: ${shopifyOrderId}`);
            return { success: false, error: 'Failed to upsert order' };
        }

        logger.info('Order upserted successfully', {
            orderId,
            customerId,
            shopifyOrderId,
            orderNumber: order.order_number
        });

        // Replace order items
        await replaceOrderItems(orderId, lineItems, logger);

        // Insert timeline event
        await insertOrderEvent(
            shopifyOrderId,
            'order_created',
            'orders/create',
            payloadHash,
            {
                orderNumber: order.order_number,
                financialStatus: order.financial_status,
                totalPrice: order.total_price,
            },
            order.created_at,
            logger
        );

        logger.info('Order processed', {
            orderId,
            itemCount: lineItems.length
        });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Order create handler error', error);
        return { success: false, error };
    }
}

// ============ ORDER PAID HANDLER ============

/**
 * Handle orders/paid webhook
 */
export async function handleOrderPaid(
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
): Promise<HandlerResult> {
    try {
        // Validate payload
        const result = ShopifyOrderSchema.safeParse(payload);
        if (!result.success) {
            const errorMsg = result.error.issues[0]?.message || 'Validation failed';
            logger.validationFailed(errorMsg);
            return { success: false, error: errorMsg };
        }

        const order = result.data;
        const shopifyOrderId = String(order.id);
        const paidAmount = priceToMinor(order.total_price);

        logger.info('Processing order paid', {
            shopifyOrderId,
            orderNumber: order.order_number,
            paidAmount,
        });

        // First, ensure the order exists (upsert)
        await handleOrderCreate(payload, payloadHash, logger);

        // Mark as paid
        const success = await markOrderPaid(shopifyOrderId, paidAmount, logger);

        if (!success) {
            return { success: false, error: 'Failed to mark order paid' };
        }

        // Insert timeline event
        await insertOrderEvent(
            shopifyOrderId,
            'order_paid',
            'orders/paid',
            payloadHash,
            {
                paidAmount,
                financialStatus: 'paid',
            },
            undefined,
            logger
        );

        logger.info('Order marked as paid', { shopifyOrderId, paidAmount });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Order paid handler error', error);
        return { success: false, error };
    }
}

// ============ ORDER CANCELLED HANDLER ============

/**
 * Handle orders/cancelled webhook
 */
export async function handleOrderCancelled(
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
): Promise<HandlerResult> {
    try {
        // Validate payload
        const result = ShopifyOrderSchema.safeParse(payload);
        if (!result.success) {
            const errorMsg = result.error.issues[0]?.message || 'Validation failed';
            logger.validationFailed(errorMsg);
            return { success: false, error: errorMsg };
        }

        const order = result.data;
        const shopifyOrderId = String(order.id);

        logger.info('Processing order cancelled', {
            shopifyOrderId,
            orderNumber: order.order_number,
            cancelReason: order.cancel_reason,
        });

        // Mark as cancelled
        const success = await markOrderCancelled(
            shopifyOrderId,
            order.cancel_reason || null,
            logger
        );

        if (!success) {
            return { success: false, error: 'Failed to mark order cancelled' };
        }

        // Insert timeline event
        await insertOrderEvent(
            shopifyOrderId,
            'order_cancelled',
            'orders/cancelled',
            payloadHash,
            {
                cancelReason: order.cancel_reason,
                cancelledAt: order.cancelled_at,
            },
            order.cancelled_at || undefined,
            logger
        );

        logger.info('Order marked as cancelled', { shopifyOrderId });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Order cancelled handler error', error);
        return { success: false, error };
    }
}

// ============ REFUND HANDLER ============

/**
 * Handle refunds/create webhook
 */
export async function handleRefundCreate(
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
): Promise<HandlerResult> {
    try {
        // Validate payload
        const result = ShopifyRefundSchema.safeParse(payload);
        if (!result.success) {
            const errorMsg = 'Validation failed: ' + result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            logger.validationFailed(errorMsg);
            return { success: false, error: errorMsg };
        }

        const refund = result.data;
        const shopifyRefundId = String(refund.id);
        const shopifyOrderId = String(refund.order_id);
        const refundAmount = extractRefundAmount(refund.transactions);

        logger.info('Processing refund', {
            shopifyRefundId,
            shopifyOrderId,
            refundAmount,
            reason: refund.reason,
        });

        // Insert refund
        const refundId = await insertRefund({
            shopifyRefundId,
            shopifyOrderId,
            reason: refund.reason,
            note: refund.note,
            refundAmountMinor: refundAmount,
            currency: refund.transactions?.[0]?.currency || 'QAR',
            refundLineItems: refund.refund_line_items,
            refundedAt: refund.created_at,
            rawPayload: payload,
        }, logger);

        if (!refundId) {
            return { success: false, error: 'Failed to insert refund' };
        }

        // Insert timeline event
        await insertOrderEvent(
            shopifyOrderId,
            'refund_created',
            'refunds/create',
            payloadHash,
            {
                refundId: shopifyRefundId,
                refundAmount,
                reason: refund.reason,
            },
            refund.created_at,
            logger
        );

        logger.info('Refund processed', { refundId, refundAmount });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Refund handler error', error);
        return { success: false, error };
    }
}

// ============ CUSTOMER HANDLER ============

/**
 * Handle customers/create and customers/update webhooks
 */
export async function handleCustomerCreate(
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
): Promise<HandlerResult> {
    try {
        // Validate payload - customer webhook payload is the customer object directly
        const { ShopifyCustomerSchema } = await import('./schemas');
        const result = ShopifyCustomerSchema.safeParse(payload);
        if (!result.success) {
            const errorMsg = 'Validation failed: ' + result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            logger.validationFailed(errorMsg);
            return { success: false, error: errorMsg };
        }

        const customer = result.data;
        const shopifyCustomerId = String(customer.id);

        logger.info('Processing customer', {
            shopifyCustomerId,
            email: maskEmail(customer.email),
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        });

        // Prepare customer info
        const fullName = [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || null;

        let phone = customer.phone || customer.default_address?.phone || null;
        const email = customer.email || null;

        // Extract total spent
        let totalSpent: number | null = null;
        if (customer.total_spent) {
            const parsed = parseFloat(customer.total_spent);
            if (!isNaN(parsed)) {
                totalSpent = parsed;
            }
        }

        // Check DB for recent checkout phone if missing
        if (!phone && email) {
            const checkoutPhone = await findLatestCheckoutPhone(email, logger);
            if (checkoutPhone) {
                logger.info('Found phone from recent checkout', { phone: maskPhone(checkoutPhone) });
                phone = checkoutPhone;
            }
        }

        // Extract note
        const additionalComments = customer.note || null;

        // Upsert customer directly using data layer
        const customerId = await findOrCreateCustomer(
            shopifyCustomerId,
            { email, fullName, phone, totalSpent, additionalComments },
            logger
        );

        if (!customerId) {
            return { success: false, error: 'Failed to upsert customer' };
        }

        logger.info('Customer processed', { customerId, shopifyCustomerId });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Customer handler error', error);
        return { success: false, error };
    }
}

// ============ HANDLER ROUTER ============

type TopicHandler = (
    payload: unknown,
    payloadHash: string,
    logger: WebhookLogger
) => Promise<HandlerResult>;

const handlerMap: Record<string, TopicHandler> = {
    'checkouts/create': handleCheckoutCreate,
    'checkouts/update': handleCheckoutCreate,
    'orders/create': handleOrderCreate,
    'orders/paid': handleOrderPaid,
    'orders/cancelled': handleOrderCancelled,
    'refunds/create': handleRefundCreate,
    'customers/create': handleCustomerCreate,
    'customers/update': handleCustomerCreate,
};

/**
 * Get the handler for a given topic
 */
export function getHandler(topic: string): TopicHandler | null {
    return handlerMap[topic] || null;
}

/**
 * Check if a topic is supported
 */
export function isKnownTopic(topic: string): boolean {
    return topic in handlerMap;
}
