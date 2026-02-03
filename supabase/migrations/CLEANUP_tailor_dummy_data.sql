-- ================================================
-- CLEANUP SCRIPT FOR TAILOR DUMMY DATA
-- ================================================
-- Run this SQL to remove all the dummy data created by 021_seed_tailor_dummy_data.sql
-- ================================================

-- Delete all assignments created by the seed script
DELETE FROM tailor_assignments 
WHERE created_at >= '2026-02-01';

-- Delete all payments created by the seed script
DELETE FROM tailor_payments 
WHERE created_at >= '2026-02-01';

-- Reset tailor fields to defaults (keep the tailor records, just clear the new fields)
UPDATE tailors SET 
    email = NULL,
    location = NULL,
    specialties = '{}',
    expert_in = '{}',
    certifications = '{}',
    max_capacity = 10,
    current_load = 0,
    quality_score = 0,
    total_jobs_completed = 0,
    average_turnaround_days = 0,
    on_time_delivery_rate = 0,
    total_earnings_minor = 0,
    ytd_earnings_minor = 0,
    pending_payout_minor = 0,
    notes = NULL,
    updated_at = now()
WHERE updated_at >= '2026-02-01';

-- Verify cleanup
SELECT COUNT(*) as remaining_assignments FROM tailor_assignments;
SELECT COUNT(*) as remaining_payments FROM tailor_payments;
SELECT COUNT(*) as tailors_with_data FROM tailors WHERE email IS NOT NULL;
