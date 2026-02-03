-- Production Settings Table
-- Stores global configuration for production tracking system

CREATE TABLE IF NOT EXISTS public.production_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Stage Display Labels (IDs are fixed, labels are customizable)
    stage_labels JSONB NOT NULL DEFAULT '{
        "pending": "Pending",
        "cutting": "Cutting", 
        "sewing": "Sewing",
        "qc": "Quality Check",
        "ready": "Ready",
        "delivered": "Delivered"
    }',
    
    -- Expected Duration for Each Stage (in days)
    stage_durations JSONB NOT NULL DEFAULT '{
        "pending": 1,
        "cutting": 2,
        "sewing": 5,
        "qc": 1,
        "ready": 1
    }',
    
    -- Stage Badge Colors
    stage_colors JSONB NOT NULL DEFAULT '{
        "pending": "gray",
        "cutting": "pink",
        "sewing": "blue",
        "qc": "green",
        "ready": "emerald",
        "delivered": "purple"
    }',
    
    -- Alert Thresholds (percentage of time elapsed)
    alert_thresholds JSONB NOT NULL DEFAULT '{
        "warning": 50,
        "critical": 80
    }',
    
    -- Notification Channels
    telegram_enabled BOOLEAN NOT NULL DEFAULT true,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    
    -- Telegram Alert Template
    telegram_alert_template TEXT NOT NULL DEFAULT '🔔 *Production Alert*\n\nItem: {item}\nCustomer: {customer}\nStage: {stage}\nStatus: {status}\nDue: {due_date}',
    
    -- Working Hours Configuration
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '18:00',
    working_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","saturday"]',
    use_business_days BOOLEAN DEFAULT false,
    
    -- Workflow Rules
    auto_assignment_enabled BOOLEAN DEFAULT false,
    quality_check_required BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

-- Ensure only one settings row exists (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS production_settings_singleton ON public.production_settings ((true));

-- Insert default settings if not exists
INSERT INTO public.production_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.production_settings);

-- RLS Policies
ALTER TABLE public.production_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for production board)
CREATE POLICY "Everyone can read production settings"
    ON public.production_settings
    FOR SELECT
    USING (true);

-- Only authenticated users can update settings (you can restrict further by checking a role column)
CREATE POLICY "Authenticated users can update production settings"
    ON public.production_settings
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_production_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER production_settings_updated
    BEFORE UPDATE ON public.production_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_production_settings_timestamp();

-- Grant permissions
GRANT SELECT ON public.production_settings TO authenticated;
GRANT UPDATE ON public.production_settings TO authenticated;
