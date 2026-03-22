/**
 * Supabase Data Layer for Shopify Webhooks
 * 
 * All database operations for storing webhook data.
 * Uses Supabase service role key for server-only writes.
 */

import { createClient } from '@supabase/supabase-js';
import { type WebhookLogger, maskEmail, maskPhone } from './logger';
import type { ExtractedLineItem, OrderEventType, ExtractedCustomerMeasurements } from './types';

// ============ SUPABASE CLIENT ============

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase credentials');
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ============ CUSTOMER OPERATIONS ============

// ============ SHOPIFY ADMIN API HELPERS ============

/**
 * Fetch a customer's real name from Shopify Admin API.
 * Used when the webhook payload has empty first_name/last_name (logged-in account customers).
 */
async function fetchShopifyCustomerName(shopifyCustomerId: string): Promise<string | null> {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g. your-store.myshopify.com
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!storeDomain || !accessToken) {
        console.warn('[Shopify API] Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ACCESS_TOKEN — cannot fetch customer name');
        return null;
    }

    try {
        const url = `https://${storeDomain}/admin/api/2026-01/customers/${shopifyCustomerId}.json`;
        const res = await fetch(url, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            console.warn(`[Shopify API] Failed to fetch customer ${shopifyCustomerId}: ${res.status}`);
            return null;
        }

        const data = await res.json();
        const c = data?.customer;
        if (!c) return null;

        // Build name from first_name + last_name
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
        return name || null;
    } catch (err) {
        console.error('[Shopify API] Error fetching customer name:', err);
        return null;
    }
}



/**
 * Find or create customer by external_id (Shopify customer ID)
 * Returns the internal UUID
 */
export async function findOrCreateCustomer(
    shopifyCustomerId: string | undefined,
    customerInfo: {
        email: string | null;
        fullName: string | null;
        phone: string | null;
        totalSpent?: number | null;
        additionalComments?: string | null;
        measurements?: ExtractedCustomerMeasurements;
    },
    logger: WebhookLogger
): Promise<string | null> {
    // Need at least email for placeholder phone generation
    if (!customerInfo.email && !customerInfo.phone) return null;

    const supabase = getServiceClient();

    try {
        let existingId: string | null = null;
        let existingExternalId: string | null = null;

        // EMAIL + PHONE COMBINATION MATCHING
        // Same email + same phone = UPDATE existing customer
        // Same email + different phone = CREATE NEW customer  
        // Different email + same phone = CREATE NEW customer
        // Both must match to update

        const hasRealPhone = Boolean(
            customerInfo.phone &&
            !customerInfo.phone.startsWith('+shop') &&
            !customerInfo.phone.startsWith('guest:') &&
            !customerInfo.phone.startsWith('unknown:')
        );

        if (customerInfo.email && hasRealPhone) {
            logger.info('[MATCH] Searching by email AND phone combination', {
                phone: maskPhone(customerInfo.phone),
                email: maskEmail(customerInfo.email)
            });

            // Search by BOTH email AND phone (both must match)
            const { data, error: queryError } = await supabase
                .from('customers')
                .select('id, external_id, phone, email')
                .eq('email', customerInfo.email)
                .eq('phone', customerInfo.phone)
                .single();

            if (queryError && queryError.code !== 'PGRST116') {
                logger.warn('[MATCH] Query failed', { error: queryError.message });
            }

            if (data) {
                existingId = data.id;
                existingExternalId = data.external_id;

                logger.info('[MATCH] ✅ Found existing customer - will UPDATE', {
                    customerId: existingId,
                    phone: maskPhone(customerInfo.phone),
                    email: maskEmail(customerInfo.email)
                });
            } else {
                logger.info('[MATCH] ❌ No match - will CREATE NEW customer', {
                    phone: maskPhone(customerInfo.phone),
                    email: maskEmail(customerInfo.email),
                    reason: 'Email+phone combination not found'
                });
            }
        } else if (hasRealPhone) {
            // Only phone is available in the payload (common for guest checkouts or logged-in user partial updates)
            logger.info('[MATCH] Searching by phone only (no email in payload)', {
                phone: maskPhone(customerInfo.phone)
            });

            const { data, error: queryError } = await supabase
                .from('customers')
                .select('id, external_id, phone, email')
                .eq('phone', customerInfo.phone)
                .single();

            if (data) {
                existingId = data.id;
                existingExternalId = data.external_id;
                logger.info('[MATCH] ✅ Found existing customer by phone - will UPDATE', { customerId: existingId });
            } else {
                logger.info('[MATCH] ❌ No match by phone - will CREATE NEW customer');
            }

        } else if (customerInfo.email) {
            // Only email is available
            logger.info('[MATCH] Searching by email only (no valid phone in payload)', {
                email: maskEmail(customerInfo.email)
            });

            const { data, error: queryError } = await supabase
                .from('customers')
                .select('id, external_id, phone, email')
                .eq('email', customerInfo.email)
                .single();

            if (data) {
                existingId = data.id;
                existingExternalId = data.external_id;
                logger.info('[MATCH] ✅ Found existing customer by email - will UPDATE', { customerId: existingId });
            } else {
                logger.info('[MATCH] ❌ No match by email - will CREATE NEW customer');
            }

        } else {
            logger.warn('[MATCH] Missing both valid email and phone - skipping match');
        }

        // If found by phone, update customer data
        if (existingId) {
            const updates: any = {};

            // Update measurements if provided
            if (customerInfo.measurements) {
                Object.assign(updates, customerInfo.measurements);
                if (!customerInfo.measurements.measurement_type) {
                    updates.measurement_type = 'standard';
                }
            }

            // Update phone if we have a real phone and current might be placeholder
            if (customerInfo.phone) {
                const isRealPhone = !customerInfo.phone.startsWith('+shop') &&
                    !customerInfo.phone.startsWith('guest:') &&
                    !customerInfo.phone.startsWith('unknown:');

                if (isRealPhone) {
                    updates.phone = customerInfo.phone;
                }
            }

            // Update name from order if provided.
            // If missing (logged-in account customer), try Shopify Admin API.
            if (customerInfo.fullName) {
                updates.full_name = customerInfo.fullName;
            } else if (shopifyCustomerId) {
                // Check current DB name — only fetch if it's the generic fallback
                const { data: currentCust } = await supabase
                    .from('customers')
                    .select('full_name')
                    .eq('id', existingId)
                    .single();

                if (!currentCust?.full_name || currentCust.full_name === 'Shopify Customer') {
                    logger.info('[UPDATE] Name is generic fallback — fetching from Shopify Admin API', {
                        shopifyCustomerId
                    });
                    const apiName = await fetchShopifyCustomerName(shopifyCustomerId);
                    if (apiName) {
                        updates.full_name = apiName;
                        logger.info('[UPDATE] Got real name from Shopify API', { name: apiName });
                    }
                }
            }

            // Update email if provided (both email and phone matched)
            if (customerInfo.email) {
                updates.email = customerInfo.email;
            }

            // Update Shopify external ID if provided
            if (shopifyCustomerId) {
                updates.external_id = shopifyCustomerId;
            }

            const minorSpend = customerInfo.totalSpent ? Math.round(customerInfo.totalSpent * 100) : undefined;

            if (Object.keys(updates).length > 0) {
                logger.info('[UPDATE] Updating existing customer fields', {
                    customerId: existingId,
                    fieldsToUpdate: Object.keys(updates),
                    hasEmail: !!updates.email,
                    hasName: !!updates.full_name,
                    hasMeasurements: !!updates.measurement_type
                });

                const updatePayload: any = { ...updates };
                if (minorSpend !== undefined) {
                    updatePayload.shopify_total_spend_minor = minorSpend;
                }

                const { error } = await supabase
                    .from('customers')
                    .update(updatePayload)
                    .eq('id', existingId);

                if (error) {
                    logger.error('[UPDATE] Failed to update customer', error.message);
                } else {
                    logger.info('[UPDATE] Customer updated successfully', {
                        customerId: existingId,
                        fieldsUpdated: Object.keys(updatePayload)
                    });
                }
            } else if (minorSpend !== undefined) {
                await supabase
                    .from('customers')
                    .update({ shopify_total_spend_minor: minorSpend })
                    .eq('id', existingId);
            }

            // Trigger stats update
            updateCustomerStats(existingId, logger).catch(err => console.error(err));

            return existingId;
        }

        // No existing customer found - create new
        logger.info('[CREATE] Creating new customer - no phone match found', {
            hasShopifyId: !!shopifyCustomerId,
            hasEmail: !!customerInfo.email,
            hasPhone: !!customerInfo.phone,
            phone: maskPhone(customerInfo.phone),
            email: maskEmail(customerInfo.email)
        });

        // Generate placeholder phone if missing (Phone is required/unique in DB)
        let phone = customerInfo.phone;
        if (!phone) {
            logger.warn('No phone provided, generating placeholder', {
                email: maskEmail(customerInfo.email),
                shopifyCustomerId
            });
            if (shopifyCustomerId) {
                phone = `+shop${shopifyCustomerId}`;
            } else if (customerInfo.email) {
                phone = `guest:${customerInfo.email}`;
            } else {
                // Fallback (unlikely given check at top)
                phone = `unknown:${Date.now()}`;
            }
        }

        // Check if external_id already exists (to avoid unique constraint failure)
        // If it does, we'll create a new customer WITHOUT linking to Shopify
        // This allows same Shopify account to have multiple phone numbers
        let useExternalId: string | null = shopifyCustomerId || null;
        if (shopifyCustomerId) {
            const { data: existingByExtId } = await supabase
                .from('customers')
                .select('id, phone')
                .eq('external_id', shopifyCustomerId)
                .single();

            if (existingByExtId) {
                logger.info('[CREATE] External ID already exists with different phone - creating without linking', {
                    existingPhone: maskPhone(existingByExtId.phone),
                    newPhone: maskPhone(phone)
                });
                useExternalId = null; // Don't link to Shopify - allow new customer
            }
        }

        // If name is missing from the webhook payload (common for logged-in Shopify account customers),
        // call the Shopify Admin API to get the real name before we create the record.
        let resolvedName = customerInfo.fullName;
        if (!resolvedName && useExternalId) {
            logger.info('[CREATE] Name missing from webhook payload — fetching from Shopify Admin API', {
                shopifyCustomerId: useExternalId
            });
            resolvedName = await fetchShopifyCustomerName(useExternalId);
            if (resolvedName) {
                logger.info('[CREATE] Got real name from Shopify API', { name: resolvedName });
            }
        }

        const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
                external_id: useExternalId,
                full_name: resolvedName || 'Shopify Customer',
                phone: phone,
                email: customerInfo.email,
                measurement_type: customerInfo.measurements?.measurement_type || null,
                standard_size: (customerInfo.measurements as any)?.standard_size || null,
                status_tier: await calculateTier(0),
                shopify_total_spend_minor: customerInfo.totalSpent ? Math.round(customerInfo.totalSpent * 100) : 0,
                additional_comments: customerInfo.additionalComments || null,
                // Add all measurement fields from extracted data
                ...(customerInfo.measurements ? {
                    product_length_cm: (customerInfo.measurements as any).product_length_cm,
                    sleeve_length_cm: (customerInfo.measurements as any).sleeve_length_cm,
                    shoulder_width_cm: (customerInfo.measurements as any).shoulder_width_cm,
                    bust_cm: (customerInfo.measurements as any).bust_cm,
                    waist_cm: (customerInfo.measurements as any).waist_cm,
                    hips_cm: (customerInfo.measurements as any).hips_cm,
                    arm_hole_cm: (customerInfo.measurements as any).arm_hole_cm,
                    height_cm: (customerInfo.measurements as any).height_cm,
                } : {})
            })
            .select('id')
            .single();

        if (error) {
            // Handle duplicate phone race condition
            if (error.code === '23505') {
                logger.info('[CREATE] Duplicate constraint hit - finding existing customer by phone');
                const { data: byPhone } = await supabase
                    .from('customers')
                    .select('id, full_name')
                    .eq('phone', phone)
                    .single();

                if (byPhone) {
                    // CRITICAL FIX: Apply name + external_id updates to the existing record
                    // This handles the race condition where checkouts/update creates a nameless
                    // customer, then orders/paid arrives with the real name but hits the duplicate constraint.
                    const rescueUpdates: any = {};
                    if (resolvedName && resolvedName !== 'Shopify Customer' &&
                        (!byPhone.full_name || byPhone.full_name === 'Shopify Customer')) {
                        rescueUpdates.full_name = resolvedName;
                    }
                    if (customerInfo.fullName && customerInfo.fullName !== 'Shopify Customer' &&
                        (!byPhone.full_name || byPhone.full_name === 'Shopify Customer')) {
                        rescueUpdates.full_name = customerInfo.fullName;
                    }
                    if (useExternalId) {
                        rescueUpdates.external_id = useExternalId;
                    }

                    if (Object.keys(rescueUpdates).length > 0) {
                        logger.info('[CREATE] Applying rescue updates to existing customer', {
                            customerId: byPhone.id,
                            updates: Object.keys(rescueUpdates)
                        });
                        await supabase.from('customers').update(rescueUpdates).eq('id', byPhone.id);
                    }

                    return byPhone.id;
                }
                return null;
            }

            logger.warn('Failed to create customer', { error: error.message });
            return null;
        }

        return newCustomer?.id || null;

    } catch (err) {
        logger.warn('Error in findOrCreateCustomer', {
            error: err instanceof Error ? err.message : String(err)
        });
        return null;
    }
}

// ============ CHECKOUT OPERATIONS ============

export interface CheckoutData {
    shopifyCheckoutId: string;
    shopifyCheckoutToken?: string | null;
    customerId?: string | null;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
    shippingAddress?: object | null;
    subtotalMinor: number;
    totalTaxMinor: number;
    totalShippingMinor: number;
    totalPriceMinor: number;
    currency: string;
    abandonedCheckoutUrl?: string | null;
    completedAt?: string | null;
    rawPayload?: unknown;
}

/**
 * Upsert a checkout record
 */
export async function upsertCheckout(
    data: CheckoutData,
    logger: WebhookLogger
): Promise<string | null> {
    const supabase = getServiceClient();

    try {
        const { data: result, error } = await supabase
            .from('shopify_checkouts')
            .upsert({
                shopify_checkout_id: data.shopifyCheckoutId,
                shopify_checkout_token: data.shopifyCheckoutToken,
                customer_id: data.customerId,
                email: data.email,
                full_name: data.fullName,
                phone: data.phone,
                shipping_address: data.shippingAddress,
                subtotal_minor: data.subtotalMinor,
                total_tax_minor: data.totalTaxMinor,
                total_shipping_minor: data.totalShippingMinor,
                total_price_minor: data.totalPriceMinor,
                currency: data.currency,
                abandoned_checkout_url: data.abandonedCheckoutUrl,
                completed_at: data.completedAt,
                raw_payload: data.rawPayload,
            }, {
                onConflict: 'shopify_checkout_id'
            })
            .select('id')
            .single();

        if (error) {
            logger.error('Failed to upsert checkout', error);
            return null;
        }

        return result?.id || null;
    } catch (err) {
        logger.error('Exception in upsertCheckout', err instanceof Error ? err : String(err));
        return null;
    }
}

/**
 * Replace checkout items (delete existing + insert new)
 */
export async function replaceCheckoutItems(
    checkoutId: string,
    items: ExtractedLineItem[],
    logger: WebhookLogger
): Promise<boolean> {
    const supabase = getServiceClient();

    try {
        // Delete existing items
        await supabase
            .from('shopify_checkout_items')
            .delete()
            .eq('checkout_id', checkoutId);

        // Insert new items
        if (items.length > 0) {
            const itemsToInsert = items.map(item => ({
                checkout_id: checkoutId,
                shopify_line_item_id: item.shopifyLineItemId,
                title: item.title,
                variant_title: item.variantTitle,
                sku: item.sku,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unit_price_minor: item.unitPriceMinor,
                line_total_minor: item.lineTotalMinor,
                measurements: item.measurements,
                properties: item.properties,
            }));

            const { error } = await supabase
                .from('shopify_checkout_items')
                .insert(itemsToInsert);

            if (error) {
                logger.warn('Failed to insert checkout items', { error: error.message });
                return false;
            }
        }

        return true;
    } catch (err) {
        logger.error('Exception in replaceCheckoutItems', err instanceof Error ? err : String(err));
        return false;
    }
}

// ============ CUSTOMER STATS & TIERING ============

/**
 * Calculate Customer Tier based on total spend (in QAR minor units)
 * Fetches tiers from DB or falls back to defaults.
 */
async function calculateTier(totalSpendMinor: number): Promise<string> {
    const supabase = getServiceClient();

    // Fetch configured tiers
    const { data: tiers } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('min_spend_minor', { ascending: false }); // Highest first for easy check

    if (tiers && tiers.length > 0) {
        // Find the first tier that matches
        for (const tier of tiers) {
            if (totalSpendMinor >= tier.min_spend_minor) {
                return tier.name;
            }
        }
        // If below all tiers, return the lowest one (last in list) or a default
        return tiers[tiers.length - 1].name;
    }

    // Fallback if no tiers configured
    const spend = totalSpendMinor / 100;
    if (spend >= 10000) return 'VIP';
    if (spend >= 5000) return 'Gold';
    if (spend >= 1000) return 'Silver';
    return 'Bronze';
}

/**
 * Update customer stats (total spend, order count, tier)
 * Should be called after order creation/update
 */
export async function updateCustomerStats(
    customerId: string,
    logger?: WebhookLogger
): Promise<void> {
    const supabase = getServiceClient();

    try {
        // 1. Get ALL orders for this customer (for order_count)
        const { data: allOrders } = await supabase
            .from('orders')
            .select('source, total_amount_minor, paid_amount_minor, financial_status')
            .eq('customer_id', customerId);

        let dbShopifySpend = 0;
        let dbLocalSpend = 0;
        let totalOrderCount = 0;
        let hasDeposit = false;

        if (allOrders) {
            totalOrderCount = allOrders.length; // Count ALL orders
            for (const order of allOrders) {
                // Track deposit orders
                if (order.financial_status === 'partially_paid') {
                    hasDeposit = true;
                    // For deposit orders, count the amount actually paid towards spend
                    if (order.source === 'shopify') {
                        dbShopifySpend += (order.paid_amount_minor || 0);
                    } else {
                        dbLocalSpend += (order.paid_amount_minor || 0);
                    }
                }
                // Only count spend from fully PAID orders
                else if (order.financial_status === 'paid') {
                    if (order.source === 'shopify') {
                        dbShopifySpend += (order.total_amount_minor || 0);
                    } else {
                        dbLocalSpend += (order.total_amount_minor || 0);
                    }
                }
            }
        }

        // 2. Get Customer Shopify Spend from Column
        const { data: customer } = await supabase
            .from('customers')
            .select('shopify_total_spend_minor')
            .eq('id', customerId)
            .single();

        const storedShopifySpend = customer?.shopify_total_spend_minor || 0;

        // 3. Calculate Final Total
        const finalShopifySpend = Math.max(storedShopifySpend, dbShopifySpend);
        const totalSpendMinor = finalShopifySpend + dbLocalSpend;

        const newTier = await calculateTier(totalSpendMinor);

        await supabase
            .from('customers')
            .update({
                total_spend_minor: totalSpendMinor,
                order_count: totalOrderCount,
                status_tier: newTier,
            })
            .eq('id', customerId);

    } catch (err) {
        logger?.warn('Error in updateCustomerStats', {
            error: err instanceof Error ? err.message : String(err)
        });
    }
}

// ============ ORDER OPERATIONS ============

export interface OrderData {
    shopifyOrderId: string;
    shopifyOrderNumber?: string | number | null;
    orderName?: string | null;
    customerId?: string | null;
    email?: string | null;
    shippingAddress?: object | null;
    subtotalMinor: number;
    totalTaxMinor: number;
    totalShippingMinor: number;
    totalAmountMinor: number;
    paidAmountMinor?: number;
    currency: string;
    financialStatus?: string | null;
    fulfillmentStatus?: string | null;
    notes?: string | null;
    createdAt?: string;
    rawPayload?: unknown;
    isTest?: boolean;
}

/**
 * Map Shopify financial status to our order status
 */
function mapToOrderStatus(financialStatus: string | null | undefined): string {
    const statusMap: Record<string, string> = {
        'pending': 'pending',
        'authorized': 'pending',
        'partially_paid': 'pending',
        'paid': 'paid',
        'partially_refunded': 'paid',
        'refunded': 'returned',
        'voided': 'cancelled',
    };
    return statusMap[financialStatus || ''] || 'pending';
}

/**
 * Upsert an order record
 */
export async function upsertOrder(
    data: OrderData,
    logger: WebhookLogger
): Promise<string | null> {
    const supabase = getServiceClient();

    try {
        // First check if order exists
        const { data: existing } = await supabase
            .from('orders')
            .select('id, external_id, shopify_order_id')
            .or(`external_id.eq.${data.shopifyOrderId},shopify_order_id.eq.${data.shopifyOrderId}`)
            .single();

        const orderRecord = {
            external_id: data.shopifyOrderId,
            shopify_order_id: data.shopifyOrderId,
            shopify_order_number: data.shopifyOrderNumber,
            customer_id: data.customerId,
            source: 'shopify' as const,
            status: mapToOrderStatus(data.financialStatus),
            currency: data.currency,
            total_amount_minor: data.totalAmountMinor,
            subtotal_minor: data.subtotalMinor,
            total_tax_minor: data.totalTaxMinor,
            total_shipping_minor: data.totalShippingMinor,
            paid_amount_minor: data.paidAmountMinor || 0,
            financial_status: data.financialStatus,
            fulfillment_status: data.fulfillmentStatus,
            shipping_address: data.shippingAddress,
            notes: data.notes,
            raw_payload: data.rawPayload,
            is_test: data.isTest || false,
        };

        console.log('--- UPSERT_ORDER DEBUG ---');
        console.log('financialStatus input:', data.financialStatus);
        console.log('paidAmountMinor input:', data.paidAmountMinor);
        console.log('orderRecord to insert/update:', JSON.stringify(orderRecord, null, 2));

        let result;
        if (existing) {
            // Update existing
            const { data: updated, error } = await supabase
                .from('orders')
                .update(orderRecord)
                .eq('id', existing.id)
                .select('id')
                .single();

            if (error) {
                logger.error('Failed to update order', error);
                return null;
            }
            result = updated;
        } else {
            // Insert new with created_at
            const { data: inserted, error } = await supabase
                .from('orders')
                .insert({
                    ...orderRecord,
                    created_at: data.createdAt,
                })
                .select('id')
                .single();

            if (error) {
                // Handle unique constraint
                if (error.code === '23505') {
                    const { data: found } = await supabase
                        .from('orders')
                        .select('id')
                        .eq('shopify_order_id', data.shopifyOrderId)
                        .single();
                    return found?.id || null;
                }
                logger.error('Failed to insert order', error);
                return null;
            }
            result = inserted;
        }



        if (result?.id && data.customerId) {
            // Trigger background stats update (fire and forget)
            updateCustomerStats(data.customerId, logger).catch(err =>
                logger.warn('Background stats update failed', { error: String(err) })
            );
        }

        return result?.id || null;
    } catch (err) {
        logger.error('Exception in upsertOrder', err instanceof Error ? err : String(err));
        return null;
    }
}

/**
 * Upsert order items (uses unique constraint on order_id + shopify_line_item_id)
 */
export async function replaceOrderItems(
    orderId: string,
    items: ExtractedLineItem[],
    logger: WebhookLogger
): Promise<boolean> {
    const supabase = getServiceClient();

    try {
        // NOTE: We do NOT delete existing items first — that causes race conditions
        // when orders/create and orders/paid webhooks fire simultaneously.
        // Instead, we upsert with shopify_line_item_id as the conflict key.

        // Insert new items (deduplicate by shopify_line_item_id to prevent race conditions)
        if (items.length > 0) {
            // Deduplicate items by shopify_line_item_id
            const seenIds = new Set<string>();
            const uniqueItems = items.filter(item => {
                if (!item.shopifyLineItemId) return true; // keep items without Shopify ID
                if (seenIds.has(item.shopifyLineItemId)) return false;
                seenIds.add(item.shopifyLineItemId);
                return true;
            });

            // Cleanup obsolete items: When Shopify edits an order, line item IDs change.
            // Delete items in the DB that belong to this order but are NOT in the incoming payload.
            const incomingIds = uniqueItems.map(i => i.shopifyLineItemId).filter(Boolean) as string[];
            if (incomingIds.length > 0) {
                await supabase
                    .from('order_items')
                    .delete()
                    .eq('order_id', orderId)
                    .not('shopify_line_item_id', 'in', `(${incomingIds.join(',')})`);
            }

            const itemsToInsert = uniqueItems.map(item => ({
                order_id: orderId,
                shopify_line_item_id: item.shopifyLineItemId,
                product_name: item.title,
                variant_title: item.variantTitle,
                sku: item.sku,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unit_price_minor: item.unitPriceMinor,
                measurements: item.measurements,
            }));

            const { error } = await supabase
                .from('order_items')
                .upsert(itemsToInsert, {
                    onConflict: 'order_id,shopify_line_item_id',
                    ignoreDuplicates: false
                });

            if (error) {
                logger.error('Failed to upsert order items', error.message);
                return false;
            }
        } else {
            // If items array is explicitly empty, delete all items
            await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId);
        }

        return true;
    } catch (err) {
        logger.error('Exception in replaceOrderItems', err instanceof Error ? err : String(err));
        return false;
    }
}

/**
 * Mark order as paid
 */
export async function markOrderPaid(
    shopifyOrderId: string,
    paidAmountMinor: number,
    logger: WebhookLogger
): Promise<boolean> {
    const supabase = getServiceClient();

    try {
        console.log('--- MARK_ORDER_PAID DEBUG ---');
        console.log(`Called markOrderPaid for shopifyOrderId: ${shopifyOrderId} with paidAmountMinor: ${paidAmountMinor}`);

        const { error } = await supabase
            .from('orders')
            .update({
                status: 'paid',
                financial_status: 'paid',
                paid_amount_minor: paidAmountMinor,
            })
            .or(`external_id.eq.${shopifyOrderId},shopify_order_id.eq.${shopifyOrderId}`);

        if (error) {
            logger.error('Failed to mark order paid', error);
            return false;
        }

        // Trigger stats update if we can find the customer_id
        // We need to fetch the order first to get the customer_id efficiently or use a subquery
        // For simplicity, let's fetch the order id and customer id
        const { data: order } = await supabase
            .from('orders')
            .select('customer_id')
            .or(`external_id.eq.${shopifyOrderId},shopify_order_id.eq.${shopifyOrderId}`)
            .single();

        if (order?.customer_id) {
            updateCustomerStats(order.customer_id, logger).catch(console.error);
        }

        return true;
    } catch (err) {
        logger.error('Exception in markOrderPaid', err instanceof Error ? err : String(err));
        return false;
    }
}

/**
 * Mark order as cancelled
 */
export async function markOrderCancelled(
    shopifyOrderId: string,
    cancelReason: string | null,
    logger: WebhookLogger
): Promise<boolean> {
    const supabase = getServiceClient();

    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                financial_status: 'voided',
                notes: cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled',
            })
            .or(`external_id.eq.${shopifyOrderId},shopify_order_id.eq.${shopifyOrderId}`);

        if (error) {
            logger.error('Failed to mark order cancelled', error);
            return false;
        }

        return true;
    } catch (err) {
        logger.error('Exception in markOrderCancelled', err instanceof Error ? err : String(err));
        return false;
    }
}

// ============ REFUND OPERATIONS ============

export interface RefundData {
    shopifyRefundId: string;
    shopifyOrderId: string;
    orderId?: string | null;
    reason?: string | null;
    note?: string | null;
    refundAmountMinor: number;
    currency: string;
    refundLineItems?: unknown;
    refundedAt?: string;
    rawPayload?: unknown;
}

/**
 * Insert a refund record
 */
export async function insertRefund(
    data: RefundData,
    logger: WebhookLogger
): Promise<string | null> {
    const supabase = getServiceClient();

    try {
        // Find the order ID if not provided
        let orderId = data.orderId;
        if (!orderId) {
            const { data: order } = await supabase
                .from('orders')
                .select('id')
                .or(`external_id.eq.${data.shopifyOrderId},shopify_order_id.eq.${data.shopifyOrderId}`)
                .single();
            orderId = order?.id || null;
        }

        const { data: result, error } = await supabase
            .from('shopify_refunds')
            .upsert({
                shopify_refund_id: data.shopifyRefundId,
                shopify_order_id: data.shopifyOrderId,
                order_id: orderId,
                reason: data.reason,
                note: data.note,
                refund_amount_minor: data.refundAmountMinor,
                currency: data.currency,
                refund_line_items: data.refundLineItems,
                refunded_at: data.refundedAt,
                raw_payload: data.rawPayload,
            }, {
                onConflict: 'shopify_refund_id',
            })
            .select('id')
            .single();

        if (error) {
            logger.error('Failed to insert refund', error);
            return null;
        }

        return result?.id || null;
    } catch (err) {
        logger.error('Exception in insertRefund', err instanceof Error ? err : String(err));
        return null;
    }
}

// ============ ORDER EVENT OPERATIONS ============

/**
 * Insert an order timeline event
 */
export async function insertOrderEvent(
    shopifyOrderId: string,
    eventType: OrderEventType,
    topic: string,
    payloadHash: string,
    metadata?: Record<string, unknown>,
    occurredAt?: string,
    logger?: WebhookLogger
): Promise<boolean> {
    const supabase = getServiceClient();

    try {
        // Find order ID
        const { data: order } = await supabase
            .from('orders')
            .select('id')
            .or(`external_id.eq.${shopifyOrderId},shopify_order_id.eq.${shopifyOrderId}`)
            .single();

        const { error } = await supabase
            .from('shopify_order_events')
            .insert({
                shopify_order_id: shopifyOrderId,
                order_id: order?.id || null,
                event_type: eventType,
                topic: topic,
                payload_hash: payloadHash,
                metadata: metadata,
                occurred_at: occurredAt || new Date().toISOString(),
            });

        if (error) {
            logger?.warn('Failed to insert order event', { error: error.message });
            return false;
        }

        return true;
    } catch (err) {
        logger?.warn('Exception in insertOrderEvent', {
            error: err instanceof Error ? err.message : String(err)
        });
        return false;
    }
}

/**
 * Find the most recent phone number from checkouts for a given email
 */
export async function findLatestCheckoutPhone(
    email: string,
    logger?: WebhookLogger
): Promise<string | null> {
    const supabase = getServiceClient();

    try {
        const { data } = await supabase
            .from('shopify_checkouts')
            .select('phone')
            .eq('email', email)
            .not('phone', 'is', null) // Only checkouts with phone
            .order('updated_at', { ascending: false }) // Most recent
            .limit(1)
            .single();

        return data?.phone || null;
    } catch (err) {
        logger?.warn('Error finding checkout phone', {
            email: maskEmail(email),
            error: String(err)
        });
        return null;
    }
}
