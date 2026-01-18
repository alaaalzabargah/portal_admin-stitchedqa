/**
 * Shopify Webhook TypeScript Types
 * 
 * These types represent the structure of Shopify webhook payloads.
 * Note: Shopify often sends numeric values as strings, so validation must coerce.
 */

// ============ LINE ITEM TYPES ============

export interface ShopifyLineItemProperty {
    name: string;
    value: string;
}

export interface ShopifyLineItem {
    id?: number | string | null; // Can be null in Checkouts
    key?: string;
    title: string | null;
    variant_title?: string | null;
    sku?: string | null;
    quantity: number;
    price: string;
    line_price?: string | null;
    total_discount?: string | null;
    properties?: ShopifyLineItemProperty[] | Record<string, any> | null;
    product_id?: number | string | null;
    variant_id?: number | string | null;
}

// ============ ADDRESS TYPES ============

export interface ShopifyAddress {
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    province_code?: string | null;
    country?: string | null;
    country_code?: string | null;
    zip?: string | null;
    phone?: string | null;
    company?: string | null;
}

// ============ CUSTOMER TYPES ============

export interface ShopifyCustomer {
    id: number | string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    default_address?: ShopifyAddress | null;
    total_spent?: string | null;
    orders_count?: number | null;
    tags?: string | null;
    note?: string | null;
    accepts_marketing?: boolean | null;
}

// ============ SHIPPING LINE TYPES ============

export interface ShopifyShippingLine {
    title?: string | null;
    price?: string | null;
    phone?: string | null;
}

// ============ CHECKOUT PAYLOAD ============

export interface ShopifyCheckoutPayload {
    id: number | string;
    token?: string;
    cart_token?: string;
    email?: string;

    // Customer info
    customer?: ShopifyCustomer;
    shipping_address?: ShopifyAddress;
    billing_address?: ShopifyAddress;

    // Money fields (strings)
    subtotal_price?: string;
    total_tax?: string;
    total_shipping?: string;
    total_price?: string;
    currency?: string;

    // Line items
    line_items?: ShopifyLineItem[];

    // URLs
    abandoned_checkout_url?: string;

    // Timestamps
    created_at?: string;
    updated_at?: string;
    completed_at?: string;

    // Shipping
    shipping_lines?: ShopifyShippingLine[];
}

// ============ ORDER PAYLOAD ============

export interface ShopifyOrderPayload {
    id: number | string;
    order_number?: number | string;
    name?: string;  // e.g., "#1001"
    email?: string;

    // Customer info
    customer?: ShopifyCustomer;
    shipping_address?: ShopifyAddress;
    billing_address?: ShopifyAddress;

    // Money fields (strings)
    subtotal_price?: string;
    total_tax?: string;
    total_price?: string;
    total_shipping_price_set?: {
        shop_money?: { amount?: string; currency_code?: string };
    };
    currency?: string;

    // Status
    financial_status?: string;  // pending, authorized, paid, partially_paid, refunded, etc.
    fulfillment_status?: string | null;  // fulfilled, partial, null
    cancelled_at?: string | null;
    cancel_reason?: string | null;

    // Line items
    line_items?: ShopifyLineItem[];

    // Shipping
    shipping_lines?: ShopifyShippingLine[];

    // Timestamps
    created_at?: string;
    updated_at?: string;
    closed_at?: string;

    // Notes
    note?: string;

    // Refunds (included in orders/cancelled sometimes)
    refunds?: ShopifyRefundData[];
}

// ============ REFUND PAYLOAD ============

export interface ShopifyRefundLineItem {
    id: number | string;
    line_item_id: number | string;
    quantity: number;
    line_item?: ShopifyLineItem;
}

export interface ShopifyRefundTransaction {
    amount: string;
    currency: string;
}

export interface ShopifyRefundData {
    id: number | string;
    order_id: number | string;
    note?: string;
    reason?: string;
    created_at?: string;
    refund_line_items?: ShopifyRefundLineItem[];
    transactions?: ShopifyRefundTransaction[];
}

// Refund webhook payload is the refund object itself
export type ShopifyRefundPayload = ShopifyRefundData;

// ============ EXTRACTED DATA TYPES ============

export interface ExtractedCustomerInfo {
    email: string | null;
    fullName: string | null;
    phone: string | null;
    totalSpent?: number | null;
    additionalComments?: string | null;
    measurements?: ExtractedCustomerMeasurements;
}

export interface ExtractedCustomerMeasurements {
    measurement_type: 'standard' | 'custom';
    standard_size?: 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | null;
    height_cm?: number | null;
    shoulder_width_cm?: number | null;
    bust_cm?: number | null;
    waist_cm?: number | null;
    hips_cm?: number | null;
    sleeve_length_cm?: number | null;
    product_length_cm?: number | null;
    arm_hole_cm?: number | null;
}

export interface ExtractedLineItem {
    shopifyLineItemId: string;
    title: string;
    variantTitle: string | null;
    sku: string | null;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    measurements: Record<string, string> | null;
    properties: Record<string, string> | null;
}

// ============ WEBHOOK EVENT TYPES ============

export type WebhookTopic =
    | 'checkouts/create'
    | 'orders/create'
    | 'orders/paid'
    | 'orders/cancelled'
    | 'refunds/create'
    | string;  // Allow unknown topics

export interface WebhookEventRecord {
    id?: string;
    topic: string;
    payloadHash: string;
    resourceId: string;
    status: 'received' | 'processed' | 'failed';
    errorMessage?: string;
    rawPayload?: unknown;
    receivedAt?: Date;
    processedAt?: Date;
}

// ============ ORDER EVENT TYPES ============

export type OrderEventType =
    | 'checkout_created'
    | 'order_created'
    | 'order_paid'
    | 'order_cancelled'
    | 'refund_created';

export interface OrderEventRecord {
    shopifyOrderId: string;
    orderId?: string;
    eventType: OrderEventType;
    topic: string;
    payloadHash: string;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
}
