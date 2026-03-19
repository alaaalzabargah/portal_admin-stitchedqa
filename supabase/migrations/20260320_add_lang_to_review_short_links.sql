-- Add lang column to review_short_links
-- Stores the language the review link was sent in (e.g. 'ar'),
-- so the review page opens in that language by default.

ALTER TABLE review_short_links
    ADD COLUMN IF NOT EXISTS lang TEXT;
