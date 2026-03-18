-- Review Short Links
-- Stores short codes that redirect to personalized review URLs.
-- This avoids exposing long base64-encoded parameters in WhatsApp messages.

CREATE TABLE IF NOT EXISTS review_short_links (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    code                TEXT        UNIQUE NOT NULL,
    product_handle      TEXT        NOT NULL,
    customer_name       TEXT,
    customer_whatsapp   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ -- optional expiry; NULL = never expires
);

CREATE INDEX IF NOT EXISTS idx_review_short_links_code
    ON review_short_links (code);

-- Row Level Security
ALTER TABLE review_short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on review_short_links"
    ON review_short_links
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
