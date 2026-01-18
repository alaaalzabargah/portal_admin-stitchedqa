-- Migration: Add new user role enum values
-- This MUST be run separately before the audit_logs migration
-- PostgreSQL requires new enum values to be committed before use

-- Add 'admin' role if not exists
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Add 'editor' role if not exists  
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'editor';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
