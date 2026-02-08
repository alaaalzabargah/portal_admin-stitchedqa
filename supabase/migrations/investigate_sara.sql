-- Investigate Sara Al Thani records to find the difference
SELECT 
    id,
    full_name,
    phone,
    email,
    status_tier,
    order_count,
    total_spend_minor / 100.0 as total_spend_qar,
    external_id,
    created_at,
    -- Show exact byte length to detect hidden characters
    length(phone) as phone_length,
    length(email) as email_length,
    -- Show as hex to detect encoding differences
    encode(phone::bytea, 'hex') as phone_hex,
    encode(email::bytea, 'hex') as email_hex
FROM customers
WHERE full_name ILIKE '%Sara Al Thani%'
   OR email ILIKE '%althani%'
ORDER BY created_at;

-- Also check if they have exactly the same phone and email
SELECT 
    phone,
    email,
    COUNT(*) as count,
    array_agg(id) as customer_ids,
    array_agg(status_tier) as tiers,
    array_agg(order_count) as order_counts
FROM customers
WHERE full_name ILIKE '%Sara Al Thani%'
   OR email ILIKE '%althani%'
GROUP BY phone, email;
