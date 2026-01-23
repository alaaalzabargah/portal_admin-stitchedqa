-- Finance Page Performance Optimization
-- Adds indices to support efficient date-range queries

-- Index for orders date range queries
-- Supports: WHERE created_at >= X AND created_at <= Y AND status IN (...)
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status 
ON orders(created_at, status);

-- Index for expenses date range queries  
-- Supports: WHERE incurred_at >= X AND incurred_at <= Y
CREATE INDEX IF NOT EXISTS idx_expenses_incurred_at 
ON expenses(incurred_at);

-- Index for order_items lookup by order_id
-- Supports: WHERE order_id IN (...)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items(order_id);

-- Note: These indices improve the batch queries used in the optimized
-- fetchTimeSeries function, which now fetches all data for a date range
-- in 4 queries instead of N×3 sequential queries.
