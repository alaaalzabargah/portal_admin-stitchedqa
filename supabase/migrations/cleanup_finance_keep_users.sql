-- CLEANUP SCRIPT: Keep Finance Data for Current Users Only
-- This script removes "orphaned" finance data (not linked to existing customers)
-- and optionally allows wiping all testing finance data while keeping customer profiles.

BEGIN;

-- 1. DELETE ORPHANED ORDERS
-- Removes orders where the customer_id does not exist in the customers table OR is NULL (Guest Orders)
DELETE FROM public.orders 
WHERE customer_id IS NULL 
   OR customer_id NOT IN (SELECT id FROM public.customers);

-- 2. DELETE ORPHANED CHECKOUTS
-- Removes shopify checkouts where the customer_id does not exist OR is NULL
DELETE FROM public.shopify_checkouts 
WHERE customer_id IS NULL 
   OR customer_id NOT IN (SELECT id FROM public.customers);

-- 3. DELETE ORPHANED REFUNDS
-- Removes refunds linked to deleted orders (should happen via cascade, but safety first)
DELETE FROM public.shopify_refunds
WHERE order_id IS NULL 
   OR order_id NOT IN (SELECT id FROM public.orders);


-- OPTIONAL: If ALL finance data was testing data and you want to keep JUST the Customer Profiles
-- but delete ALL Orders/Transactions (even for current users):
/*
    -- Delete ALL Orders
    TRUNCATE TABLE public.orders CASCADE;
    
    -- Delete ALL Expenses
    TRUNCATE TABLE public.expenses CASCADE;
    
    -- Delete ALL Shopify External Data
    TRUNCATE TABLE public.shopify_checkouts CASCADE;
    TRUNCATE TABLE public.shopify_refunds CASCADE;
    TRUNCATE TABLE public.shopify_order_events CASCADE;
    
    -- Reset Customer Finance Stats
    UPDATE public.customers 
    SET total_spend_minor = 0, order_count = 0;
*/

COMMIT;
