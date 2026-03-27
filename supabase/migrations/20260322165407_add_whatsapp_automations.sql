-- Create store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_review_delay_minutes INT NOT NULL DEFAULT 4320,
    whatsapp_automation_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default row if empty
INSERT INTO public.store_settings (whatsapp_review_delay_minutes, whatsapp_automation_enabled)
SELECT 4320, true
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

-- Enable RLS and add policies
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
ON public.store_settings FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Enable update for admins and moderators" 
ON public.store_settings FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.portal_users 
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
);

-- Create review automation enum
DO $$ BEGIN
    CREATE TYPE wa_review_status_enum AS ENUM ('none', 'scheduled', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS wa_review_status wa_review_status_enum NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS wa_scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
