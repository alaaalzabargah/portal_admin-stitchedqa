-- Refactor production_stage enum

BEGIN;

-- 1. Rename old type
ALTER TYPE production_stage RENAME TO production_stage_old;

-- 2. Create new type
CREATE TYPE production_stage AS ENUM (
    'assigned',
    'in_progress',
    'completed',
    'qc_passed',
    'qc_failed',
    'rework',
    'out_for_delivery',
    'delivered'
);

-- 3. Update production_assignments table
-- Mapping:
-- pending -> assigned
-- cutting -> in_progress
-- sewing -> in_progress
-- qc -> completed
-- ready -> qc_passed
-- delivered -> delivered

-- First, drop the default value which causes the casting error
ALTER TABLE production_assignments ALTER COLUMN stage DROP DEFAULT;

ALTER TABLE production_assignments
ALTER COLUMN stage TYPE production_stage
USING (
    CASE stage::text
        WHEN 'pending' THEN 'assigned'::production_stage
        WHEN 'cutting' THEN 'in_progress'::production_stage
        WHEN 'sewing' THEN 'in_progress'::production_stage
        WHEN 'qc' THEN 'completed'::production_stage
        WHEN 'ready' THEN 'qc_passed'::production_stage
        WHEN 'delivered' THEN 'delivered'::production_stage
        ELSE 'assigned'::production_stage -- fallback
    END
);

-- Set new default
ALTER TABLE production_assignments ALTER COLUMN stage SET DEFAULT 'assigned'::production_stage;

-- 4. Update production_status_history table
-- We need to update both previous_stage and new_stage columns

-- Update previous_stage
ALTER TABLE production_status_history
ALTER COLUMN previous_stage TYPE production_stage
USING (
    CASE previous_stage::text
        WHEN 'pending' THEN 'assigned'::production_stage
        WHEN 'cutting' THEN 'in_progress'::production_stage
        WHEN 'sewing' THEN 'in_progress'::production_stage
        WHEN 'qc' THEN 'completed'::production_stage
        WHEN 'ready' THEN 'qc_passed'::production_stage
        WHEN 'delivered' THEN 'delivered'::production_stage
        ELSE NULL::production_stage
    END
);

-- Update new_stage
ALTER TABLE production_status_history
ALTER COLUMN new_stage TYPE production_stage
USING (
    CASE new_stage::text
        WHEN 'pending' THEN 'assigned'::production_stage
        WHEN 'cutting' THEN 'in_progress'::production_stage
        WHEN 'sewing' THEN 'in_progress'::production_stage
        WHEN 'qc' THEN 'completed'::production_stage
        WHEN 'ready' THEN 'qc_passed'::production_stage
        WHEN 'delivered' THEN 'delivered'::production_stage
        ELSE 'assigned'::production_stage
    END
);

-- 5. Drop old type
DROP TYPE production_stage_old;

-- 6. Update production_settings defaults
-- Since keys are changing completely, we'll reset to new defaults rather than trying to map inside JSON
UPDATE production_settings
SET 
    stage_labels = '{
        "assigned": "Assigned",
        "in_progress": "In Progress", 
        "completed": "Completed", 
        "qc_passed": "QC Passed",
        "qc_failed": "QC Failed",
        "rework": "Rework",
        "out_for_delivery": "Out For Delivery",
        "delivered": "Delivered"
    }'::jsonb,
    stage_durations = '{
        "assigned": 1,
        "in_progress": 5, 
        "completed": 1, 
        "qc_passed": 1,
        "qc_failed": 1,
        "rework": 2,
        "out_for_delivery": 1,
        "delivered": 0
    }'::jsonb,
    stage_colors = '{
        "assigned": "gray",
        "in_progress": "blue", 
        "completed": "orange", 
        "qc_passed": "green",
        "qc_failed": "red",
        "rework": "purple",
        "out_for_delivery": "emerald",
        "delivered": "green"
    }'::jsonb;

COMMIT;
