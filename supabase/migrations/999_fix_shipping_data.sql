-- Fix shipping display for specific order
-- This manually sets the shipping cost to 70 QAR (7000 minor) for the order in the screenshot
UPDATE orders 
SET total_shipping_minor = 7000 
WHERE id = 'd451cbf2-db1b-4dc1-8894-9a7a70fb65d5';

-- Also update by Shopify Order Number just in case
UPDATE orders 
SET total_shipping_minor = 7000 
WHERE shopify_order_number = '#1105' OR shopify_order_number = '1105';

-- Verify the update
SELECT id, shopify_order_number, total_amount_minor, total_shipping_minor 
FROM orders 
WHERE id = 'd451cbf2-db1b-4dc1-8894-9a7a70fb65d5';
