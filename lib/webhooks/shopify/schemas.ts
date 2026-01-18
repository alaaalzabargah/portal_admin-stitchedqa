/**
 * Zod Schemas for Shopify Webhook Validation
 * 
 * These schemas validate and coerce Shopify webhook payloads.
 * Shopify sends many numeric values as strings, so we coerce them safely.
 */

import { z } from 'zod';

// ============ HELPER SCHEMAS ============

/**
 * Safely coerce string to number (returns 0 if invalid)
 */
const coerceNumber = z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
});

/**
 * Safely coerce to string ID
 */
const coerceStringId = z.union([z.string(), z.number()]).transform((val) => String(val));

/**
 * Optional numeric string to number
 */
const optionalCoerceNumber = z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
});

// ============ ADDRESS SCHEMA ============

const ShopifyAddressObject = z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    address1: z.string().optional().nullable(),
    address2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    province_code: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    country_code: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
}).passthrough();

export const ShopifyAddressSchema = z.union([
    ShopifyAddressObject,
    z.array(z.unknown()).length(0).transform(() => null),
    z.null(),
    z.undefined()
]);

// ============ LINE ITEM PROPERTY SCHEMA ============

export const ShopifyLineItemPropertySchema = z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]).transform(String),
});

// ============ LINE ITEM SCHEMA ============

export const ShopifyLineItemSchema = z.object({
    id: coerceStringId.optional().nullable(), // Checkouts might use 'key' and have no 'id'
    key: z.string().optional(), // Add key support for checkouts
    title: z.string().optional().nullable().default(''),
    variant_title: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    quantity: coerceNumber,
    price: z.string().or(z.number()).transform(String),
    line_price: z.string().or(z.number()).optional().nullable().transform((v) => v ? String(v) : undefined),
    total_discount: z.string().optional().nullable(),
    // Properties can be array [{name, value}] (Orders) or object {key: value} (Checkouts)
    properties: z.union([
        z.array(ShopifyLineItemPropertySchema),
        z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]).transform(v => String(v || ''))),
        z.null()
    ]).optional().default([]),
    product_id: coerceStringId.optional().nullable(),
    variant_id: coerceStringId.optional().nullable(),
}).passthrough();

// ============ CUSTOMER SCHEMA ============

export const ShopifyCustomerSchema = z.object({
    id: coerceStringId,
    email: z.string().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    default_address: ShopifyAddressSchema.optional().nullable(),
    total_spent: z.string().optional(),
    orders_count: coerceNumber.optional(),
    tags: z.string().optional(),
    note: z.string().optional().nullable(),
    accepts_marketing: z.boolean().optional(),
}).passthrough();

// ============ SHIPPING LINE SCHEMA ============

export const ShopifyShippingLineSchema = z.object({
    title: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
}).passthrough();

// ============ CHECKOUT SCHEMA ============

export const ShopifyCheckoutSchema = z.object({
    id: coerceStringId,
    token: z.string().optional().nullable(),
    cart_token: z.string().optional().nullable(),
    email: z.string().optional().nullable(),

    customer: ShopifyCustomerSchema.optional().nullable(),
    shipping_address: ShopifyAddressSchema.optional().nullable(),
    billing_address: ShopifyAddressSchema.optional().nullable(),

    subtotal_price: optionalCoerceNumber,
    total_tax: optionalCoerceNumber,
    total_price: optionalCoerceNumber,
    currency: z.string().optional().default('QAR'),

    line_items: z.array(ShopifyLineItemSchema).optional().default([]),
    shipping_lines: z.array(ShopifyShippingLineSchema).optional().default([]),

    abandoned_checkout_url: z.string().optional().nullable(),

    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    completed_at: z.string().optional().nullable(),
}).passthrough();

// ============ ORDER SCHEMA ============

export const ShopifyOrderSchema = z.object({
    id: coerceStringId,
    order_number: coerceStringId.optional(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),

    customer: ShopifyCustomerSchema.optional().nullable(),
    shipping_address: ShopifyAddressSchema.optional().nullable(),
    billing_address: ShopifyAddressSchema.optional().nullable(),

    subtotal_price: optionalCoerceNumber,
    total_tax: optionalCoerceNumber,
    total_price: optionalCoerceNumber,
    total_shipping_price_set: z.object({
        shop_money: z.object({
            amount: z.string().optional(),
            currency_code: z.string().optional(),
        }).optional(),
    }).optional().nullable(),
    currency: z.string().optional().default('QAR'),

    financial_status: z.string().optional().nullable(),
    fulfillment_status: z.string().optional().nullable(),
    cancelled_at: z.string().optional().nullable(),
    cancel_reason: z.string().optional().nullable(),

    line_items: z.array(ShopifyLineItemSchema).optional().default([]),
    shipping_lines: z.array(ShopifyShippingLineSchema).optional().default([]),

    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    closed_at: z.string().optional().nullable(),

    note: z.string().optional().nullable(),

    refunds: z.array(z.object({
        id: coerceStringId,
        order_id: coerceStringId.optional(),
        note: z.string().optional().nullable(),
        reason: z.string().optional().nullable(),
        created_at: z.string().optional(),
        transactions: z.array(z.object({
            amount: z.string(),
            currency: z.string(),
        })).optional(),
    }).passthrough()).optional().default([]),
}).passthrough();

// ============ REFUND SCHEMA ============

export const ShopifyRefundLineItemSchema = z.object({
    id: coerceStringId,
    line_item_id: coerceStringId,
    quantity: coerceNumber,
    line_item: ShopifyLineItemSchema.optional(),
}).passthrough();

export const ShopifyRefundSchema = z.object({
    id: coerceStringId,
    order_id: coerceStringId,
    note: z.string().optional().nullable(),
    reason: z.string().optional().nullable(),
    created_at: z.string().optional(),
    refund_line_items: z.array(ShopifyRefundLineItemSchema).optional().default([]),
    transactions: z.array(z.object({
        amount: z.string(),
        currency: z.string().default('QAR'),
    })).optional().default([]),
}).passthrough();

// ============ SCHEMA MAP BY TOPIC ============

export const WebhookSchemas = {
    'checkouts/create': ShopifyCheckoutSchema,
    'orders/create': ShopifyOrderSchema,
    'orders/paid': ShopifyOrderSchema,
    'orders/cancelled': ShopifyOrderSchema,
    'refunds/create': ShopifyRefundSchema,
    'customers/create': ShopifyCustomerSchema,
    'customers/update': ShopifyCustomerSchema,
} as const;

export type WebhookSchemaType = typeof WebhookSchemas;

/**
 * Get the appropriate schema for a webhook topic
 */
export function getSchemaForTopic(topic: string) {
    return WebhookSchemas[topic as keyof WebhookSchemaType] ?? null;
}

/**
 * Validate a webhook payload against its topic schema
 */
export function validateWebhookPayload<T extends keyof WebhookSchemaType>(
    topic: T,
    payload: unknown
): z.infer<WebhookSchemaType[T]> | null {
    const schema = WebhookSchemas[topic];
    if (!schema) return null;

    const result = schema.safeParse(payload);
    if (!result.success) {
        throw new Error(`Validation failed: ${result.error.message}`);
    }

    return result.data as z.infer<WebhookSchemaType[T]>;
}
