-- ============================================================
-- Migration: Create reviews table
-- ============================================================
-- This table stores customer product reviews submitted from the
-- public review page (m-kai.com/review/{handle}).
--
-- Triage logic: Ratings 4-5 are auto-published, 1-3 go to NEEDS_ATTENTION.

-- Create the review status enum (safe — skips if already exists)
DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('NEEDS_ATTENTION', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create the reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id                  UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    product_handle      TEXT            NOT NULL,
    product_title       TEXT            NOT NULL,
    customer_name       TEXT,
    customer_whatsapp   TEXT,
    rating              INTEGER         NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text         TEXT,
    status              review_status   NOT NULL DEFAULT 'NEEDS_ATTENTION',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_handle ON reviews (product_handle);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews (rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews (status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (safe — skips if already exists)
DO $$ BEGIN
    CREATE POLICY "Service role full access" ON reviews
        FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
