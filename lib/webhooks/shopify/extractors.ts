/**
 * Data Extractors for Shopify Webhook Payloads
 * 
 * Utilities to extract and normalize data from Shopify webhooks.
 */

import type {
    ShopifyCheckoutPayload,
    ShopifyOrderPayload,
    ShopifyLineItem,
    ShopifyAddress,
    ShopifyCustomer,
    ExtractedCustomerInfo,
    ExtractedLineItem,
    ExtractedCustomerMeasurements,
} from './types';

type PropertyItem = { name: string; value: any };
type Properties = PropertyItem[] | Record<string, any> | null | undefined;

// ============ VARIANT PARSING ============

/**
 * Parse variant_title to extract size and color
 * 
 * Examples:
 * - "S / White" -> { size: "S", color: "White" }
 * - "Medium / Black" -> { size: "Medium", color: "Black" }
 * - "XL" -> { size: "XL", color: null }
 * - null -> { size: null, color: null }
 */
export function parseVariantTitle(variantTitle: string | null | undefined): {
    size: string | null;
    color: string | null;
} {
    if (!variantTitle) {
        return { size: null, color: null };
    }

    // Common separators: " / ", "/", " - ", "-"
    const separators = [' / ', '/', ' - ', '-'];

    for (const sep of separators) {
        if (variantTitle.includes(sep)) {
            const parts = variantTitle.split(sep).map(p => p.trim()).filter(Boolean);

            if (parts.length >= 2) {
                // Assume first is size, second is color
                return {
                    size: parts[0] || null,
                    color: parts[1] || null,
                };
            }
        }
    }

    // Single value - assume it's size
    return {
        size: variantTitle.trim() || null,
        color: null,
    };
}

// ============ CUSTOMER EXTRACTION ============

/**
 * Extract customer info from various payload locations
 * 
 * Priority:
 * - email: payload.email > payload.customer.email
 * - name: shipping_address.name > (first+last) > customer (first+last)
 * - phone: shipping_address.phone > shipping_lines[0].phone > customer.phone
 */
export function extractCustomerInfo(
    payload: ShopifyCheckoutPayload | ShopifyOrderPayload
): ExtractedCustomerInfo {
    const customer = payload.customer;
    const shippingAddress = payload.shipping_address;
    const shippingLines = payload.shipping_lines;

    // Email
    let email: string | null = null;
    if (payload.email) {
        email = payload.email;
    } else if (customer?.email) {
        email = customer.email;
    }

    // Full name
    let fullName: string | null = null;
    const billingAddress = (payload as any).billing_address;
    const defaultAddress = customer?.default_address;

    // Helper to form name from various fields
    const getName = (obj: any) => {
        if (!obj) return null;
        // Direct name field
        if (obj.name && obj.name.trim() && obj.name.trim() !== ' ') return obj.name.trim();
        // Combine first + last
        if (obj.first_name || obj.last_name) {
            return [obj.first_name, obj.last_name].filter(Boolean).join(' ').trim() || null;
        }
        return null;
    };

    // Priority: shipping > billing > customer > default_address
    fullName = getName(shippingAddress) ||
        getName(billingAddress) ||
        getName(customer) ||  // This will now properly use customer.first_name + last_name
        getName(defaultAddress);

    // Phone
    let phone: string | null = null;

    // Helper to validate phone (must be mostly digits, reasonable length)
    const isValidPhone = (p: string | null | undefined): boolean => {
        if (!p) return false;
        const cleaned = p.trim();
        // Must be at least 5 chars (relaxed from 7), at most 25 (increased)
        if (cleaned.length < 5 || cleaned.length > 25) {
            console.log(`[Phone Validation] Rejected (length): "${cleaned}" (${cleaned.length} chars)`);
            return false;
        }
        // Must contain at least 5 digits (relaxed from 6)
        const digitCount = (cleaned.match(/\d/g) || []).length;
        if (digitCount < 5) {
            console.log(`[Phone Validation] Rejected (digits): "${cleaned}" (${digitCount} digits)`);
            return false;
        }
        // Must not be all zeros or obviously invalid
        if (/^0+$/.test(cleaned.replace(/\D/g, ''))) {
            console.log(`[Phone Validation] Rejected (all zeros): "${cleaned}"`);
            return false;
        }
        console.log(`[Phone Validation] ACCEPTED: "${cleaned}"`);
        return true;
    };

    // Try shipping_lines[0].phone (from markup) - priority for checkouts
    if ((payload as any).shipping_lines?.length > 0) {
        const shippingPhone = (payload as any).shipping_lines[0].phone;
        if (isValidPhone(shippingPhone)) {
            phone = shippingPhone.trim();
        }
    }

    // Fallback to standard locations
    if (!phone) {
        const candidates = [
            shippingAddress?.phone,
            (payload as any).billing_address?.phone,
            (payload as any).phone,
            customer?.phone,
            customer?.default_address?.phone
        ];

        for (const candidate of candidates) {
            if (isValidPhone(candidate)) {
                phone = candidate.trim();
                break;
            }
        }
    }

    // Total Spent (only on customer payload)
    let totalSpent: number | null = null;
    const customerPayload = payload as any; // Cast to access potential total_spent property
    if (customerPayload.total_spent) {
        totalSpent = parseFloat(customerPayload.total_spent);
        if (isNaN(totalSpent)) totalSpent = null;
    }

    // Additional Comments (Node)
    let additionalComments: string | null = null;
    const p = payload as any;
    if (p.note) {
        additionalComments = p.note;
    } else if (p.customer?.note) {
        additionalComments = p.customer.note;
    }

    return { email, fullName, phone, totalSpent, additionalComments };
}

// ============ LINE ITEM EXTRACTION ============

/**
 * Convert price string to minor units (cents/fils)
 * "19.99" -> 1999
 */
export function priceToMinor(price: string | number | undefined, fallback = 0): number {
    if (price === undefined || price === null) return fallback;

    const numValue = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numValue)) return fallback;

    return Math.round(numValue * 100);
}

/**
 * Extract measurements from line item properties
 * 
 * Properties is an array of { name, value } objects.
 * We filter to keep measurement-related properties.
 */
export function extractMeasurements(
    properties: Properties
): Record<string, string> | null {
    if (!properties) return null;

    // Normalize to array
    let propsArray: Array<{ name: string; value: string }> = [];

    if (Array.isArray(properties)) {
        propsArray = properties.map(p => ({
            name: String(p.name),
            value: String(p.value)
        }));
    } else {
        // Handle record
        propsArray = Object.entries(properties).map(([key, value]) => ({
            name: key,
            value: String(value)
        }));
    }

    if (propsArray.length === 0) return null;

    // Common measurement property names (case-insensitive matching)
    const measurementKeywords = [
        'bust', 'chest', 'waist', 'hip', 'hips', 'length', 'height',
        'shoulder', 'arm', 'sleeve', 'inseam', 'neck', 'thigh',
        'size', 'measurement', 'custom', 'note', 'additional comments', 'comments'
    ];

    const measurements: Record<string, string> = {};
    let hasMeasurements = false;

    for (const prop of propsArray) {
        const nameLower = prop.name.toLowerCase();
        const isMeasurement = measurementKeywords.some(kw => nameLower.includes(kw));

        // Include if it looks like a measurement or starts with underscore (hidden)
        // Shopify uses _ prefix for cart attributes
        if (isMeasurement || !prop.name.startsWith('_')) {
            measurements[prop.name] = prop.value;
            hasMeasurements = true;
        }
    }

    return hasMeasurements ? measurements : null;
}

/**
 * Convert all properties to a key-value record
 */
export function propertiesToRecord(
    properties: Properties
): Record<string, string> | null {
    if (!properties) return null;

    // If it's already a record (and not an array)
    if (!Array.isArray(properties) && typeof properties === 'object') {
        const result: Record<string, string> = {};
        for (const [key, val] of Object.entries(properties)) {
            result[key] = String(val);
        }
        return Object.keys(result).length > 0 ? result : null;
    }

    // If array
    if (Array.isArray(properties) && properties.length > 0) {
        const record: Record<string, string> = {};
        for (const prop of properties) {
            record[prop.name] = String(prop.value);
        }
        return record;
    }

    return null;
}

/**
 * Extract line items with normalized data
 */
export function extractLineItems(
    lineItems: ShopifyLineItem[] | undefined
): ExtractedLineItem[] {
    if (!lineItems || lineItems.length === 0) return [];

    return lineItems.map((item) => {
        const { size, color } = parseVariantTitle(item.variant_title);
        const unitPrice = priceToMinor(item.price);
        const quantity = typeof item.quantity === 'number' ? item.quantity : 1;

        // Calculate line total
        let lineTotal: number;
        if (item.line_price) {
            lineTotal = priceToMinor(item.line_price);
        } else {
            lineTotal = unitPrice * quantity;
        }

        return {
            shopifyLineItemId: item.id ? String(item.id) : (item.key || `temp_${Date.now()}_${Math.random()}`),
            title: item.title || '',
            variantTitle: item.variant_title || null,
            sku: item.sku || null,
            size,
            color,
            quantity,
            unitPriceMinor: unitPrice,
            lineTotalMinor: lineTotal,
            measurements: extractMeasurements(item.properties as any),
            properties: propertiesToRecord(item.properties as any),
        };
    });
}

// ============ MONEY EXTRACTION ============

/**
 * Extract shipping total from order payload
 */
export function extractShippingTotal(payload: ShopifyOrderPayload): number {
    // Try total_shipping_price_set first (newer API)
    if (payload.total_shipping_price_set?.shop_money?.amount) {
        return priceToMinor(payload.total_shipping_price_set.shop_money.amount);
    }

    // Fall back to summing shipping lines
    if (payload.shipping_lines && payload.shipping_lines.length > 0) {
        let total = 0;
        for (const line of payload.shipping_lines) {
            if (line.price) {
                total += priceToMinor(line.price);
            }
        }
        return total;
    }

    return 0;
}

/**
 * Extract total refund amount from transactions
 */
export function extractRefundAmount(
    transactions: Array<{ amount: string; currency: string }> | undefined
): number {
    if (!transactions || transactions.length === 0) return 0;

    let total = 0;
    for (const tx of transactions) {
        total += priceToMinor(tx.amount);
    }
    return total;
}

// ============ ADDRESS HELPERS ============

/**
 * Format address for storage
 */
export function formatAddressForStorage(address: ShopifyAddress | null | undefined): object | null {
    if (!address) return null;

    return {
        name: address.name || [address.first_name, address.last_name].filter(Boolean).join(' '),
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province,
        provinceCode: address.province_code,
        country: address.country,
        countryCode: address.country_code,
        zip: address.zip,
        phone: address.phone,
        company: address.company,
    };
}

// ============ MEASUREMENT HELPER ============

/**
 * Extract customer measurements (standard/custom) from line items.
 * Scans all line items and picks the first set of measurements found.
 */
export function extractCustomerMeasurements(
    lineItems: ShopifyLineItem[] | undefined
): ExtractedCustomerMeasurements | undefined {
    if (!lineItems || lineItems.length === 0) return undefined;

    // Standard sizes valid values
    const validSizes = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

    for (const item of lineItems) {
        let measurementType: 'standard' | 'custom' = 'standard';
        let standardSize: any = null;
        const custom: any = {};

        // 1. Check variant title for standard size
        const { size } = parseVariantTitle(item.variant_title);
        if (size && validSizes.includes(size.toLowerCase())) {
            standardSize = size.toLowerCase();
        }

        // 2. Check properties for measurements
        const measurements = extractMeasurements(item.properties as any);
        if (measurements) {
            // Map common keys to DB columns
            const map: Record<string, string> = {
                'bust': 'bust_cm',
                'waist': 'waist_cm',
                'hip': 'hips_cm',
                'hips': 'hips_cm',
                'sleeve': 'sleeve_length_cm',
                'sleeve length': 'sleeve_length_cm',
                'length': 'product_length_cm',
                'Length': 'product_length_cm',
                'shoulder': 'shoulder_width_cm',
                'shoulder width': 'shoulder_width_cm',
                'arm hole': 'arm_hole_cm',
                'height': 'height_cm',
                'additional comments': 'additional_comments',
                'comments': 'additional_comments',
            };

            for (const [key, val] of Object.entries(measurements)) {
                // Find matching column
                const lowerKey = key.toLowerCase().trim();
                let matchedCol: string | null = null;

                // Direct match or partial match
                for (const [search, col] of Object.entries(map)) {
                    if (lowerKey === search || lowerKey.includes(search)) {
                        matchedCol = col;
                        break;
                    }
                }

                if (matchedCol) {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) {
                        custom[matchedCol] = numVal;
                        measurementType = 'custom'; // Switch to custom if we find measurements
                    }
                }
            }
        }

        // If we found meaningful data, return it
        // (Prioritize items with custom measurements)
        if (measurementType === 'custom' || standardSize) {
            return {
                measurement_type: measurementType,
                standard_size: standardSize,
                ...custom,
            };
        }
    }

    return undefined;
}
