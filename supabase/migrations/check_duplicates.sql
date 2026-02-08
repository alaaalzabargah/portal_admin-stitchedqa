-- Query to check for duplicate email+phone combinations
-- Run this BEFORE applying the migration to see what will be cleaned up

SELECT 
    c.email,
    c.phone,
    c.full_name,
    c.status_tier,
    c.order_count,
    c.total_spend_minor / 100.0 as total_spend_qar,
    c.created_at,
    c.external_id as shopify_id,
    COUNT(*) OVER (PARTITION BY c.email, c.phone) as duplicate_count
FROM customers c
WHERE c.email IS NOT NULL
ORDER BY c.email, c.phone, c.order_count DESC, c.total_spend_minor DESC;

-- Summary of duplicates
SELECT 
    'Total duplicate combinations' as description,
    COUNT(*) as count
FROM (
    SELECT email, phone, COUNT(*) as cnt
    FROM customers
    WHERE email IS NOT NULL
    GROUP BY email, phone
    HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
    'Total duplicate customer records' as description,
    SUM(cnt - 1) as count
FROM (
    SELECT email, phone, COUNT(*) as cnt
    FROM customers
    WHERE email IS NOT NULL
    GROUP BY email, phone
    HAVING COUNT(*) > 1
) duplicates;
