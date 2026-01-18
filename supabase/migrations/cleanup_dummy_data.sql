-- Cleanup Dummy Data from Customers and Orders
-- This migration removes all test/dummy data from the database

-- 1. Delete all orders (this will cascade to related data if foreign keys are set up)
DELETE FROM public.orders;

-- 2. Delete all customers
DELETE FROM public.customers;

-- 3. Reset sequences (optional - resets auto-increment IDs)
-- This ensures new records start from 1 again
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'Dummy data cleanup completed successfully';
    RAISE NOTICE 'All orders and customers have been deleted';
END $$;
