-- ================================================
-- SEED DUMMY DATA FOR TAILOR MANAGEMENT TESTING
-- ================================================
-- This file populates existing tailors with realistic data
-- and creates sample assignments for testing
--
-- TO DELETE ALL THIS DATA LATER, RUN:
-- DELETE FROM tailor_assignments WHERE created_at >= '2026-02-01';
-- UPDATE tailors SET 
--   email = NULL, location = NULL, specialties = '{}',
--   expert_in = '{}', certifications = '{}',
--   max_capacity = 10, current_load = 0,
--   quality_score = 0, total_jobs_completed = 0,
--   average_turnaround_days = 0, on_time_delivery_rate = 0,
--   ytd_earnings_minor = 0, pending_payout_minor = 0
-- WHERE updated_at >= '2026-02-01';
-- ================================================

-- First, update existing tailors with realistic extended data
-- We'll use the existing tailors and add our new fields

DO $$
DECLARE
    tailor_record RECORD;
    idx INT := 1;
BEGIN
    -- Update existing tailors with new field data
    FOR tailor_record IN 
        SELECT id, full_name FROM tailors ORDER BY created_at LIMIT 6
    LOOP
        UPDATE tailors SET
            email = CASE idx
                WHEN 1 THEN 'ahmed.ali@tailorworkshop.com'
                WHEN 2 THEN 'fatima.hassan@stitchpro.com'
                WHEN 3 THEN 'mohammed.saeed@fabricart.com'
                WHEN 4 THEN 'aisha.omar@luxuryseam.com'
                WHEN 5 THEN 'yusuf.ibrahim@designstudio.com'
                ELSE 'zahra.ahmed@customfit.com'
            END,
            location = CASE idx
                WHEN 1 THEN 'Milan, Italy'
                WHEN 2 THEN 'Istanbul, Turkey'
                WHEN 3 THEN 'Dubai, UAE'
                WHEN 4 THEN 'Doha, Qatar'
                WHEN 5 THEN 'Cairo, Egypt'
                ELSE 'Mumbai, India'
            END,
            specialties = CASE idx
                WHEN 1 THEN ARRAY['Traditional Abayas', 'Embroidery Work']
                WHEN 2 THEN ARRAY['Modern Designs', 'Beadwork']
                WHEN 3 THEN ARRAY['Bridal Abayas', 'Crystal Application']
                WHEN 4 THEN ARRAY['Casual Wear', 'Quick Turnaround']
                WHEN 5 THEN ARRAY['Premium Fabrics', 'Detailed Embellishments']
                ELSE ARRAY['Limited Editions', 'Custom Measurements']
            END,
            expert_in = CASE idx
                WHEN 1 THEN ARRAY['Hand Stitching', 'French Seams']
                WHEN 2 THEN ARRAY['Machine Work', 'Pattern Making']
                WHEN 3 THEN ARRAY['Beading', 'Sequin Work']
                WHEN 4 THEN ARRAY['Speed Sewing', 'Basic Alterations']
                WHEN 5 THEN ARRAY['Luxury Finishes', 'Quality Control']
                ELSE ARRAY['Design Consultation', 'Fit Adjustments']
            END,
            certifications = CASE 
                WHEN idx <= 3 THEN ARRAY['Master Tailor Certification', 'ISO Quality Standard']
                ELSE ARRAY['Professional Seamstress Certificate']
            END,
            max_capacity = CASE idx
                WHEN 1 THEN 15
                WHEN 2 THEN 12
                WHEN 3 THEN 20
                WHEN 4 THEN 10
                WHEN 5 THEN 18
                ELSE 14
            END,
            current_load = CASE idx
                WHEN 1 THEN 8
                WHEN 2 THEN 5
                WHEN 3 THEN 12
                WHEN 4 THEN 9
                WHEN 5 THEN 14
                ELSE 6
            END,
            quality_score = CASE idx
                WHEN 1 THEN 95.5
                WHEN 2 THEN 88.0
                WHEN 3 THEN 92.3
                WHEN 4 THEN 85.7
                WHEN 5 THEN 97.2
                ELSE 90.1
            END,
            total_jobs_completed = CASE idx
                WHEN 1 THEN 156
                WHEN 2 THEN 98
                WHEN 3 THEN 203
                WHEN 4 THEN 67
                WHEN 5 THEN 189
                ELSE 124
            END,
            average_turnaround_days = CASE idx
                WHEN 1 THEN 3.2
                WHEN 2 THEN 4.5
                WHEN 3 THEN 2.8
                WHEN 4 THEN 5.1
                WHEN 5 THEN 3.0
                ELSE 3.7
            END,
            on_time_delivery_rate = CASE idx
                WHEN 1 THEN 94.2
                WHEN 2 THEN 87.5
                WHEN 3 THEN 96.8
                WHEN 4 THEN 83.0
                WHEN 5 THEN 98.1
                ELSE 91.3
            END,
            total_earnings_minor = CASE idx
                WHEN 1 THEN 4560000  -- $45,600
                WHEN 2 THEN 2890000  -- $28,900
                WHEN 3 THEN 5730000  -- $57,300
                WHEN 4 THEN 1980000  -- $19,800
                WHEN 5 THEN 5210000  -- $52,100
                ELSE 3450000         -- $34,500
            END,
            ytd_earnings_minor = CASE idx
                WHEN 1 THEN 890000   -- $8,900
                WHEN 2 THEN 560000   -- $5,600
                WHEN 3 THEN 1120000  -- $11,200
                WHEN 4 THEN 380000   -- $3,800
                WHEN 5 THEN 1050000  -- $10,500
                ELSE 720000          -- $7,200
            END,
            pending_payout_minor = CASE idx
                WHEN 1 THEN 125000   -- $1,250
                WHEN 2 THEN 89000    -- $890
                WHEN 3 THEN 156000   -- $1,560
                WHEN 4 THEN 67000    -- $670
                WHEN 5 THEN 142000   -- $1,420
                ELSE 98000           -- $980
            END,
            notes = CASE idx
                WHEN 1 THEN 'Excellent quality, very reliable. Prefers complex projects.'
                WHEN 2 THEN 'Good for quick turnarounds on standard designs.'
                WHEN 3 THEN 'Top performer, handles high-volume orders well.'
                WHEN 4 THEN 'New tailor, still building experience.'
                WHEN 5 THEN 'Specializes in luxury pieces, premium pricing justified.'
                ELSE 'Consistent performer, good communication.'
            END,
            updated_at = now()
        WHERE id = tailor_record.id;
        
        idx := idx + 1;
    END LOOP;
END $$;

-- Create sample assignments for each tailor
DO $$
DECLARE
    tailor_record RECORD;
    assignment_count INT;
    item_types TEXT[] := ARRAY[
        'Classic Abaya',
        'Luxury Abaya',
        'Bridal Abaya',
        'Casual Abaya',
        'Premium Abaya',
        'Custom Design'
    ];
    statuses TEXT[] := ARRAY['assigned', 'in_progress', 'completed', 'qc_passed', 'paid'];
    assignment_status TEXT;
    days_offset INT;
    i INT;
BEGIN
    FOR tailor_record IN SELECT id, current_load FROM tailors LIMIT 6 LOOP
        -- Create active assignments matching current_load
        FOR i IN 1..tailor_record.current_load LOOP
            -- Mix of statuses for active assignments
            assignment_status := statuses[1 + (i % 4)]; -- assigned, in_progress, completed, qc_passed
            days_offset := -7 + (i * 2); -- Stagger dates
            
            INSERT INTO tailor_assignments (
                tailor_id,
                item_type,
                item_description,
                quantity,
                fabric_code,
                piece_rate_minor,
                total_amount_minor,
                assigned_date,
                due_date,
                started_date,
                completed_date,
                status,
                qc_passed,
                qc_notes,
                customer_rating
            ) VALUES (
                tailor_record.id,
                item_types[1 + (i % array_length(item_types, 1))],
                CASE 
                    WHEN i % 3 = 0 THEN 'Black with gold embroidery'
                    WHEN i % 3 = 1 THEN 'Navy blue with beadwork'
                    ELSE 'Cream with lace details'
                END,
                CASE WHEN i % 2 = 0 THEN 1 ELSE 2 END,
                'FAB-' || (1000 + i)::TEXT,
                CASE 
                    WHEN i % 3 = 0 THEN 15000  -- $150
                    WHEN i % 3 = 1 THEN 25000  -- $250
                    ELSE 35000                  -- $350
                END,
                CASE 
                    WHEN i % 3 = 0 THEN 15000 * CASE WHEN i % 2 = 0 THEN 1 ELSE 2 END
                    WHEN i % 3 = 1 THEN 25000 * CASE WHEN i % 2 = 0 THEN 1 ELSE 2 END
                    ELSE 35000 * CASE WHEN i % 2 = 0 THEN 1 ELSE 2 END
                END,
                now() + (days_offset || ' days')::INTERVAL,
                now() + ((days_offset + 7) || ' days')::INTERVAL,
                CASE WHEN assignment_status IN ('in_progress', 'completed', 'qc_passed') 
                    THEN now() + ((days_offset + 1) || ' days')::INTERVAL 
                    ELSE NULL 
                END,
                CASE WHEN assignment_status IN ('completed', 'qc_passed') 
                    THEN now() + ((days_offset + 5) || ' days')::INTERVAL 
                    ELSE NULL 
                END,
                assignment_status,
                CASE WHEN assignment_status = 'qc_passed' THEN true ELSE NULL END,
                CASE WHEN assignment_status = 'qc_passed' THEN 'Excellent quality, approved' ELSE NULL END,
                CASE WHEN assignment_status = 'qc_passed' THEN 4.5 + (random() * 0.5) ELSE NULL END
            );
        END LOOP;
        
        -- Create 3-5 completed/paid historical assignments per tailor
        FOR i IN 1..3 LOOP
            INSERT INTO tailor_assignments (
                tailor_id,
                item_type,
                item_description,
                quantity,
                fabric_code,
                piece_rate_minor,
                total_amount_minor,
                assigned_date,
                due_date,
                started_date,
                completed_date,
                qc_date,
                paid_date,
                status,
                qc_passed,
                qc_notes,
                customer_rating
            ) VALUES (
                tailor_record.id,
                item_types[1 + (i % array_length(item_types, 1))],
                'Historical order ' || i,
                1 + (i % 2),
                'FAB-' || (2000 + i)::TEXT,
                20000,  -- $200
                20000 * (1 + (i % 2)),
                now() - ((30 + i * 10) || ' days')::INTERVAL,
                now() - ((23 + i * 10) || ' days')::INTERVAL,
                now() - ((29 + i * 10) || ' days')::INTERVAL,
                now() - ((21 + i * 10) || ' days')::INTERVAL,
                now() - ((20 + i * 10) || ' days')::INTERVAL,
                now() - ((15 + i * 10) || ' days')::INTERVAL,
                'paid',
                true,
                'Completed successfully',
                4.0 + (random() * 1.0)
            );
        END LOOP;
    END LOOP;
END $$;

-- Create sample payments for some tailors
DO $$
DECLARE
    tailor_record RECORD;
BEGIN
    FOR tailor_record IN SELECT id FROM tailors LIMIT 3 LOOP
        INSERT INTO tailor_payments (
            tailor_id,
            assignment_ids,
            amount_minor,
            currency,
            payment_method,
            period_start,
            period_end,
            payment_date,
            transaction_id,
            notes
        ) VALUES (
            tailor_record.id,
            ARRAY[]::UUID[],  -- Empty for now, would link to actual assignments
            50000,  -- $500
            'QAR',
            'Bank Transfer',
            now() - '30 days'::INTERVAL,
            now() - '15 days'::INTERVAL,
            now() - '10 days'::INTERVAL,
            'TXN-' || substring(tailor_record.id::TEXT, 1, 8),
            'Monthly payment for completed work'
        );
    END LOOP;
END $$;

-- Verify the data
SELECT 
    id,
    full_name,
    email,
    location,
    max_capacity,
    current_load,
    quality_score,
    total_jobs_completed,
    ytd_earnings_minor / 100.0 as ytd_earnings,
    pending_payout_minor / 100.0 as pending_payout
FROM tailors
WHERE email IS NOT NULL
ORDER BY full_name;
