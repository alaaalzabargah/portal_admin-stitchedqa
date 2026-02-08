-- Migration: Add Email + Phone Composite Unique Constraint
-- This prevents duplicate customers with the same email AND phone combination
-- while allowing the same email with different phones (e.g., family members)

-- Step 1: Find and display any existing duplicates (for logging purposes)
DO $$
DECLARE
    duplicate_count INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, phone, COUNT(*) as cnt
        FROM customers
        WHERE email IS NOT NULL
        GROUP BY email, phone
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % email+phone duplicate combinations that need to be cleaned up', duplicate_count;
        
        -- Log the duplicates
        RAISE NOTICE 'Duplicate combinations:';
        FOR rec IN 
            SELECT email, phone, COUNT(*) as cnt
            FROM customers
            WHERE email IS NOT NULL
            GROUP BY email, phone
            HAVING COUNT(*) > 1
        LOOP
            RAISE NOTICE 'Email: %, Phone: %, Count: %', rec.email, rec.phone, rec.cnt;
        END LOOP;
    ELSE
        RAISE NOTICE 'No email+phone duplicates found. Safe to add constraint.';
    END IF;
END $$;

-- Step 2: Clean up duplicates by keeping the one with orders or highest spend
-- This handles the Sara Al Thani case and any other duplicates
WITH duplicates AS (
    SELECT 
        email, 
        phone,
        array_agg(id ORDER BY order_count DESC, total_spend_minor DESC, created_at ASC) as customer_ids
    FROM customers
    WHERE email IS NOT NULL
    GROUP BY email, phone
    HAVING COUNT(*) > 1
),
keep_first AS (
    SELECT 
        email,
        phone,
        customer_ids[1] as keep_id,
        customer_ids[2:] as delete_ids
    FROM duplicates
)
-- Update any orders pointing to duplicate customers to point to the kept customer
UPDATE orders
SET customer_id = kf.keep_id
FROM keep_first kf
WHERE customer_id = ANY(kf.delete_ids);

-- Delete the duplicate customer records (keeping the one with most orders/spend)
WITH duplicates AS (
    SELECT 
        email, 
        phone,
        array_agg(id ORDER BY order_count DESC, total_spend_minor DESC, created_at ASC) as customer_ids
    FROM customers
    WHERE email IS NOT NULL
    GROUP BY email, phone
    HAVING COUNT(*) > 1
)
DELETE FROM customers
WHERE id IN (
    SELECT unnest(customer_ids[2:])
    FROM duplicates
);

-- Step 3: Add the composite unique constraint
-- Note: We allow NULL emails (phone is already unique and NOT NULL)
ALTER TABLE customers 
ADD CONSTRAINT customers_email_phone_unique 
UNIQUE NULLS NOT DISTINCT (email, phone);

-- Step 4: Create an index to improve query performance on email+phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_email_phone 
ON customers(email, phone) 
WHERE email IS NOT NULL;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'Successfully added email+phone composite unique constraint';
END $$;
