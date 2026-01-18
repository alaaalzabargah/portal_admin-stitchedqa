-- Migration: Create audit_logs table
-- Run this AFTER 012_add_user_roles.sql has been committed

-- Create audit_logs table for tracking all user actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Who performed the action
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email text,
    user_role text,
    
    -- What action was performed
    action text NOT NULL,
    action_category text NOT NULL DEFAULT 'general',
    
    -- What entity was affected
    entity_type text NOT NULL,
    entity_id text,
    entity_name text,
    
    -- Change details
    old_values jsonb,
    new_values jsonb,
    changes_summary text,
    
    -- Request context
    metadata jsonb,
    ip_address text,
    user_agent text
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Owners can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Owners and admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Only owners and admins can view audit logs
CREATE POLICY "Owners and admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.portal_users
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- Insert allowed for authenticated users (for logging their own actions)
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Add helpful comments
COMMENT ON TABLE public.audit_logs IS 'Tracks all significant user actions for security and compliance';
COMMENT ON COLUMN public.audit_logs.action IS 'The action performed: user.invite, user.update, user.disable, etc.';
COMMENT ON COLUMN public.audit_logs.action_category IS 'Category: user_management, customer, order, settings, finance';
COMMENT ON COLUMN public.audit_logs.changes_summary IS 'Human-readable summary of what changed';
