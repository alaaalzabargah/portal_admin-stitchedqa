-- ============================================================
-- Migration: Add customer contact fields to reviews table
-- ============================================================
-- Adds customer_name and customer_whatsapp so admins can
-- triage negative reviews via WhatsApp.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_name      TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_whatsapp  TEXT;
