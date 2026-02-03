-- Dummy Data for Production Tracking System
-- This script creates sample tailors and production assignments for testing

-- =====================================================
-- STEP 1: Create Sample Tailors
-- =====================================================

INSERT INTO public.tailors (full_name, phone, specialty, commission_rate, status)
VALUES
    ('Ahmed Hassan', '123456789', 'Sewing', 15.0, 'active'),
    ('Fatima Ali', '987654321', 'Cutting', 12.5, 'active'),
    ('Mohammad Khalid', '555123456', 'Quality Control', 10.0, 'active'),
    ('Sara Ibrahim', '444987654', 'Sewing', 15.0, 'active'),
    ('Omar Yousef', '333555777', 'Cutting', 12.0, 'inactive')
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: Create Sample Production Assignments
-- =====================================================

-- First, let's get some existing order_item IDs
-- Note: You'll need to replace these with actual order_item IDs from your database
-- Run this query first to see available order items:
-- SELECT id, product_name FROM order_items LIMIT 10;

-- Get tailor IDs (we'll use these in assignments)
DO $$
DECLARE
    tailor_ahmed UUID;
    tailor_fatima UUID;
    tailor_mohammad UUID;
    tailor_sara UUID;
    order_item_1 UUID;
    order_item_2 UUID;
    order_item_3 UUID;
    order_item_4 UUID;
    order_item_5 UUID;
BEGIN
    -- Get tailor IDs
    SELECT id INTO tailor_ahmed FROM tailors WHERE full_name = 'Ahmed Hassan' LIMIT 1;
    SELECT id INTO tailor_fatima FROM tailors WHERE full_name = 'Fatima Ali' LIMIT 1;
    SELECT id INTO tailor_mohammad FROM tailors WHERE full_name = 'Mohammad Khalid' LIMIT 1;
    SELECT id INTO tailor_sara FROM tailors WHERE full_name = 'Sara Ibrahim' LIMIT 1;

    -- Get some order item IDs (we'll just grab the first 5 available)
    SELECT id INTO order_item_1 FROM order_items ORDER BY created_at DESC LIMIT 1 OFFSET 0;
    SELECT id INTO order_item_2 FROM order_items ORDER BY created_at DESC LIMIT 1 OFFSET 1;
    SELECT id INTO order_item_3 FROM order_items ORDER BY created_at DESC LIMIT 1 OFFSET 2;
    SELECT id INTO order_item_4 FROM order_items ORDER BY created_at DESC LIMIT 1 OFFSET 3;
    SELECT id INTO order_item_5 FROM order_items ORDER BY created_at DESC LIMIT 1 OFFSET 4;

    -- Only insert if we have order items
    IF order_item_1 IS NOT NULL THEN
        
        -- Assignment 1: PENDING - Just started (Safe - Green)
        INSERT INTO production_assignments (
            order_item_id, 
            tailor_id, 
            stage, 
            cost_price_minor,
            assigned_at,
            target_due_at,
            notes
        ) VALUES (
            order_item_1,
            tailor_ahmed,
            'pending',
            5000, -- QAR 50.00
            NOW() - INTERVAL '1 day',
            NOW() + INTERVAL '6 days', -- Total 7 days, 1 day elapsed = 14% (Green)
            'New order - needs cutting'
        );

        -- Assignment 2: CUTTING - 60% time elapsed (Warning - Yellow)
        INSERT INTO production_assignments (
            order_item_id,
            tailor_id,
            stage,
            cost_price_minor,
            assigned_at,
            target_due_at,
            alert_50_sent,
            notes
        ) VALUES (
            order_item_2,
            tailor_fatima,
            'cutting',
            4500,
            NOW() - INTERVAL '3 days',
            NOW() + INTERVAL '2 days', -- Total 5 days, 3 elapsed = 60% (Yellow)
            true,
            'Standard cutting work'
        );

        -- Assignment 3: SEWING - 85% time elapsed (Critical - Red)
        INSERT INTO production_assignments (
            order_item_id,
            tailor_id,
            stage,
            cost_price_minor,
            assigned_at,
            target_due_at,
            alert_50_sent,
            alert_80_sent,
            notes
        ) VALUES (
            order_item_3,
            tailor_sara,
            'sewing',
            8000,
            NOW() - INTERVAL '6 days',
            NOW() + INTERVAL '1 day', -- Total 7 days, 6 elapsed = 85% (Red)
            true,
            true,
            'Complex embroidery work - running behind'
        );

        -- Assignment 4: QC - Almost ready (Safe)
        INSERT INTO production_assignments (
            order_item_id,
            tailor_id,
            stage,
            cost_price_minor,
            assigned_at,
            target_due_at,
            notes
        ) VALUES (
            order_item_4,
            tailor_mohammad,
            'qc',
            3000,
            NOW() - INTERVAL '1 day',
            NOW() + INTERVAL '5 days', -- 16% elapsed (Green)
            'Final quality inspection'
        );

        -- Assignment 5: READY - Completed
        IF order_item_5 IS NOT NULL THEN
            INSERT INTO production_assignments (
                order_item_id,
                tailor_id,
                stage,
                cost_price_minor,
                assigned_at,
                target_due_at,
                completed_at,
                is_paid,
                notes
            ) VALUES (
                order_item_5,
                tailor_ahmed,
                'ready',
                5500,
                NOW() - INTERVAL '8 days',
                NOW() - INTERVAL '1 day',
                NOW() - INTERVAL '1 day',
                false,
                'Completed and ready for delivery'
            );
        END IF;

    END IF;

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all tailors
-- SELECT * FROM tailors ORDER BY created_at DESC;

-- View all production assignments with details
-- SELECT 
--     pa.id,
--     pa.stage,
--     t.full_name as tailor_name,
--     oi.product_name,
--     pa.assigned_at,
--     pa.target_due_at,
--     pa.cost_price_minor,
--     pa.is_paid
-- FROM production_assignments pa
-- LEFT JOIN tailors t ON pa.tailor_id = t.id
-- LEFT JOIN order_items oi ON pa.order_item_id = oi.id
-- ORDER BY pa.created_at DESC;

-- Check time-based health status
-- SELECT 
--     pa.stage,
--     EXTRACT(EPOCH FROM (NOW() - pa.assigned_at)) / EXTRACT(EPOCH FROM (pa.target_due_at - pa.assigned_at)) * 100 as percent_elapsed,
--     CASE 
--         WHEN EXTRACT(EPOCH FROM (NOW() - pa.assigned_at)) / EXTRACT(EPOCH FROM (pa.target_due_at - pa.assigned_at)) * 100 >= 80 THEN 'RED (Critical)'
--         WHEN EXTRACT(EPOCH FROM (NOW() - pa.assigned_at)) / EXTRACT(EPOCH FROM (pa.target_due_at - pa.assigned_at)) * 100 >= 50 THEN 'YELLOW (Warning)'
--         ELSE 'GREEN (Safe)'
--     END as health_status
-- FROM production_assignments pa
-- WHERE pa.assigned_at IS NOT NULL 
--   AND pa.target_due_at IS NOT NULL
--   AND pa.stage NOT IN ('ready', 'delivered');
