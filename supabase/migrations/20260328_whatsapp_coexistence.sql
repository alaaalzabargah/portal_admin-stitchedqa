-- WhatsApp Coexistence: sessions + messages tables
-- Enables full two-way messaging sync between portal and WhatsApp Cloud API

-- 1. MESSAGE DIRECTION ENUM
DO $$ BEGIN
    CREATE TYPE wa_message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. MESSAGE STATUS ENUM (distinct from wa_review_status_enum on orders)
DO $$ BEGIN
    CREATE TYPE wa_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. WHATSAPP SESSIONS (was referenced in code but never migrated)
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'idle',
    context_data JSONB DEFAULT '{}'::jsonb,
    last_interaction_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id)
);

-- 4. WHATSAPP MESSAGES (full conversation history)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_message_id TEXT UNIQUE,                    -- Meta's message ID (wamid.xxx)
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    direction wa_message_direction NOT NULL,
    status wa_message_status NOT NULL DEFAULT 'pending',
    message_type TEXT NOT NULL DEFAULT 'text',    -- text, template, image, interactive, etc.
    content JSONB NOT NULL DEFAULT '{}'::jsonb,   -- full message payload
    template_name TEXT,                           -- if type=template, store the name
    error_details JSONB,                          -- if failed, store error info
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ADD wa_id TO CUSTOMERS IF MISSING
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS wa_id TEXT UNIQUE;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_wa_messages_customer ON public.whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id ON public.whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_customer ON public.whatsapp_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_wa_id ON public.customers(wa_id);

-- 7. RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Sessions: authenticated portal users can read/write
CREATE POLICY "Portal users can read sessions"
ON public.whatsapp_sessions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Portal users can manage sessions"
ON public.whatsapp_sessions FOR ALL
TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.portal_users
        WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'moderator')
    )
);

-- Messages: authenticated portal users can read, system inserts via service role
CREATE POLICY "Portal users can read messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Portal users can insert messages"
ON public.whatsapp_messages FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.portal_users
        WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'moderator')
    )
);

-- Service role bypasses RLS for webhook inserts (no policy needed)
