# WhatsApp Coexistence — Technical Documentation

## Overview

This document describes the WhatsApp Cloud API integration built into the Stitched Admin Portal. The system uses **Meta's Coexistence mode**, which allows the WhatsApp Business App (phone) and the Cloud API (this portal) to operate on the **same phone number** simultaneously.

**What this means:**
- Staff can chat manually with customers on the WhatsApp Business phone app
- The portal sends automated and manual messages via the Cloud API
- Both see the same conversation thread — messages sent from either side appear in the customer's chat

---

## Architecture

```
Customer WhatsApp
       |
       v
Meta Cloud API (graph.facebook.com/v25.0)
       |
       +-------> POST /api/whatsapp/webhook     (inbound messages + delivery receipts)
       |              |
       |              +-> lib/whatsapp/session.ts  (session state machine)
       |              +-> lib/whatsapp/handlers.ts (auto-reply logic)
       |              +-> lib/whatsapp/api.ts      (persist to DB)
       |
       +<------- lib/whatsapp/api.ts               (outbound messages)
                      ^
                      |
       +--------------+------------------+------------------+
       |              |                  |                  |
  /marketing     /marketing/       /api/marketing/    /api/marketing/
  (Direct Msg)   send-campaign     automations/cron   send-message
  (Template)     (Template API)    (Scheduled)        (Direct API)
```

---

## Credentials & Environment Variables

All WhatsApp functionality uses a **single unified credential set**:

| Variable | Purpose | Where to find |
|----------|---------|---------------|
| `META_PHONE_ID` | Your WhatsApp phone number ID for API calls | Meta Business Manager > WhatsApp > Phone Numbers |
| `META_ACCESS_TOKEN` | Permanent access token for Meta Graph API | Meta Business Manager > System Users > Generate Token |
| `WHATSAPP_VERIFY_TOKEN` | Custom string for webhook verification handshake | You define this (any secret string) — must match what you enter in Meta webhook config |
| `WHATSAPP_APP_SECRET` | App secret for verifying webhook payload signatures (HMAC-SHA256) | Meta App Dashboard > App Settings > Basic > App Secret |
| `CRON_SECRET` | Bearer token to authorize the cron endpoint | You define this — used in Authorization header |

**Legacy variables (no longer used):**
- `WHATSAPP_PHONE_NUMBER_ID` — replaced by `META_PHONE_ID`
- `WHATSAPP_API_ACCESS_TOKEN` — replaced by `META_ACCESS_TOKEN`

---

## API Routes

### 1. `GET /api/whatsapp/webhook` — Verification Handshake

**Purpose:** One-time setup. Meta sends a GET request to verify you own the webhook URL.

**How it works:**
- Meta sends `hub.mode=subscribe`, `hub.verify_token=<your_token>`, `hub.challenge=<random_string>`
- The endpoint checks `hub.verify_token` matches your `WHATSAPP_VERIFY_TOKEN` env var
- If valid, responds with the challenge string as plain text (not JSON)

**File:** `app/api/whatsapp/webhook/route.ts`

---

### 2. `POST /api/whatsapp/webhook` — Receive Messages & Status Updates

**Purpose:** Receives all inbound messages from customers and delivery status updates for outbound messages.

**What it handles:**
- **Inbound messages** (text, image, interactive buttons, location, etc.)
  1. Persists message to `whatsapp_messages` table (direction: `inbound`)
  2. Resolves or creates a customer record in `customers` table
  3. Creates/resumes a WhatsApp session in `whatsapp_sessions` table
  4. Routes through the conversation state machine in `handlers.ts`
  5. Sends auto-reply via `api.ts` (also persisted as `outbound`)

- **Status updates** (sent -> delivered -> read -> failed)
  1. Updates `whatsapp_messages.status` for the message ID
  2. Syncs to `orders.wa_review_status` if the message was a review request

**Security:**
- Optionally verifies `X-Hub-Signature-256` header using HMAC-SHA256 with `WHATSAPP_APP_SECRET`
- Public route (no auth) — Meta must be able to reach it
- Added to middleware public routes list

**File:** `app/api/whatsapp/webhook/route.ts`

---

### 3. `POST /api/marketing/send-campaign` — Template Campaign

**Purpose:** Sends WhatsApp template messages to selected customers (bulk).

**Payload:**
```json
{
  "customers": [{ "id": "uuid", "name": "Ahmed", "phone": "97412345678" }],
  "templateName": "hello_world",
  "languageCode": "ar",
  "headerImageUrl": "https://...",
  "bodyVariables": [{ "position": 1, "value": "Ahmed", "source": "customer_name" }],
  "buttonVariables": [{ "buttonIndex": 0, "urlSuffix": "summer-2025", "source": "static" }]
}
```

**Key details:**
- Uses Meta Graph API v25.0
- Supports header images, body text variables, and dynamic URL button variables
- 100ms delay between messages to avoid rate limiting
- Phone numbers auto-formatted (8-digit numbers get `974` prefix for Qatar)

**File:** `app/api/marketing/send-campaign/route.ts`

---

### 4. `POST /api/marketing/send-message` — Direct Text Message

**Purpose:** Sends free-form text messages (not templates) to selected customers.

**Payload:**
```json
{
  "customers": [{ "id": "uuid", "name": "Ahmed", "phone": "97412345678" }],
  "message": "Hello Ahmed, your order is ready for pickup!"
}
```

**Important limitation:** Direct text messages only work within the **24-hour customer service window**. This window opens when a customer sends you a message and closes 24 hours after their last message. Outside this window, you must use approved template messages.

**File:** `app/api/marketing/send-message/route.ts`

---

### 5. `POST /api/marketing/automations/cron` — Scheduled Review Requests

**Purpose:** Processes scheduled review request messages. Triggered externally (e.g., Vercel Cron, EasyCron, cURL).

**Authorization:** `Authorization: Bearer <CRON_SECRET>` header required.

**What it does:**
1. Queries orders where `wa_review_status = 'scheduled'` AND `wa_scheduled_for <= now()`
2. For each order:
   - Generates a unique 7-character short link code
   - Inserts into `review_short_links` table
   - Sends `review_request` WhatsApp template with the code as a button URL suffix
   - Updates `orders.wa_review_status` to `sent` or `failed`

**Trigger example:**
```bash
curl -X POST https://your-domain.com/api/marketing/automations/cron \
  -H "Authorization: Bearer moh@b-107-2025" \
  -H "Content-Type: application/json"
```

**File:** `app/api/marketing/automations/cron/route.ts`

---

## Core Libraries

### `lib/whatsapp/api.ts` — Unified WhatsApp SDK

The central layer for all WhatsApp communication. Every outbound message goes through this file.

**Key functions:**

| Function | Purpose |
|----------|---------|
| `sendWhatsAppMessage(to, type, content)` | Core send — calls Meta API and persists to DB |
| `sendSimpleText(to, body)` | Convenience: sends a plain text message |
| `sendTemplate(to, templateName, lang, components)` | Convenience: sends a template message |
| `sendMenu(to)` | Sends an interactive button menu (New Order / Measurements / Track Order) |
| `persistInboundMessage(params)` | Stores an inbound webhook message in `whatsapp_messages` |
| `updateMessageStatus(waMessageId, status)` | Updates delivery status for a message + syncs to orders |
| `resolveCustomerId(phone)` | Finds a customer by `wa_id` or `phone` |

**All outbound messages are automatically persisted** to the `whatsapp_messages` table with direction `outbound`, including the Meta message ID, content, and status.

---

### `lib/whatsapp/session.ts` — Session Manager

Manages per-customer conversational state for automated flows.

**Functions:**
- `getOrCreateSession(waId, profileName)` — Finds or creates customer + session
- `updateSessionState(sessionId, newState, contextUpdate)` — Transitions the state machine

**Session states:** `idle`, `collecting_info`, `measurements`, `marketing_flow`

---

### `lib/whatsapp/handlers.ts` — Conversation State Machine

Routes inbound messages through a state machine for automated responses.

**Current flows:**
- `idle` + greeting → sends interactive menu
- `idle` + "new_order" → starts order collection flow
- `collecting_info` → collects product type, then fabric preference
- Default → sends menu

---

### `lib/whatsapp/types.ts` — TypeScript Types

Defines interfaces for Meta webhook payloads:
- `WhatsAppWebhookPayload`, `WhatsAppEntry`, `WhatsAppChange`
- `WhatsAppMessage` (text, image, location, interactive, button, order)
- `WhatsAppStatus` (sent, delivered, read)
- `WhatsAppContact` (profile name, wa_id)

---

## Database Tables

### `whatsapp_messages` (NEW)

Full conversation history — stores every message in both directions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `wa_message_id` | TEXT (unique) | Meta's message ID (wamid.xxx) |
| `customer_id` | UUID (FK -> customers) | Links to customer record |
| `direction` | ENUM: inbound / outbound | Who sent the message |
| `status` | ENUM: pending / sent / delivered / read / failed | Current delivery status |
| `message_type` | TEXT | text, template, image, interactive, etc. |
| `content` | JSONB | Full message payload |
| `template_name` | TEXT | If type=template, the template name |
| `error_details` | JSONB | Error info if failed |
| `created_at` | TIMESTAMPTZ | When the message was created |
| `updated_at` | TIMESTAMPTZ | Last status update |

**Indexes:** `customer_id`, `wa_message_id`, `created_at DESC`, `direction`

---

### `whatsapp_sessions` (NEW)

Tracks conversational state per customer for automated flows.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `customer_id` | UUID (FK -> customers, unique) | One session per customer |
| `state` | TEXT | Current state: idle, collecting_info, measurements, marketing_flow |
| `context_data` | JSONB | Arbitrary context (current step, collected data, etc.) |
| `last_interaction_at` | TIMESTAMPTZ | Last message timestamp |
| `created_at` | TIMESTAMPTZ | Session creation time |

---

### `customers` — Updated

Added column: `wa_id` (TEXT, unique) — the customer's WhatsApp ID (phone number without `+`).
Used to link inbound webhook messages to existing customer records.

---

### `orders` — Existing WhatsApp Fields

| Column | Type | Description |
|--------|------|-------------|
| `wa_review_status` | ENUM: none / scheduled / sent / delivered / read / failed | Review request lifecycle |
| `wa_scheduled_for` | TIMESTAMPTZ | When the review request should be sent |
| `wa_message_id` | TEXT | Meta's message ID for the review request |

---

### `review_short_links` — Existing

| Column | Type | Description |
|--------|------|-------------|
| `code` | TEXT (unique, 7 chars) | Short code for review URL |
| `product_handle` | TEXT | Shopify product handle |
| `customer_name` | TEXT | First name for personalization |
| `customer_whatsapp` | TEXT | Customer's phone number |

---

## Portal UI

### `/marketing` — Campaign & Direct Message Page

Two sending modes, toggled via a pill selector:

1. **Template Campaign** — Select customers, choose a template, configure variables, send bulk
2. **Direct Message** — Select customers, type a free-form text, send (24h window required)

Both modes share the same customer selection panel (left column on desktop, Step 1 on mobile).

### `/marketing/reviews/automations` — Review Request Automation

- **Configuration card:** Toggle automation on/off, set delay (days/hours/minutes after fulfillment)
- **Send to Existing Orders:** Select fulfilled orders that haven't received a review request, send immediately
- **Queue History:** View all scheduled/sent/delivered/read/failed review requests with filters and search

---

## Setup Checklist

### 1. Environment Variables

Ensure these are set in `.env.local`:

```env
META_PHONE_ID=your_phone_number_id
META_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_VERIFY_TOKEN=your_chosen_verify_token
WHATSAPP_APP_SECRET=your_app_secret
CRON_SECRET=your_cron_secret
```

### 2. Database Migration

Run the migration to create the new tables:

```bash
# Via Supabase CLI
supabase db push

# Or apply manually in Supabase Dashboard > SQL Editor
# File: supabase/migrations/20260328_whatsapp_coexistence.sql
```

### 3. Meta Business Manager Configuration

1. Go to [Meta Business Manager](https://business.facebook.com) > WhatsApp > Configuration
2. **Enable Coexistence** on your phone number (allows API + Business App simultaneously)
3. **Set Webhook URL:** `https://your-production-domain.com/api/whatsapp/webhook`
4. **Set Verify Token:** Must match your `WHATSAPP_VERIFY_TOKEN` env var exactly
5. **Subscribe to webhook fields:** `messages`, `message_status_updates`
6. **Create message templates** (if needed): `review_request` template with body variable and URL button

### 4. Cron Job Setup

Set up an external cron to trigger review request automation:

```bash
# Every 15 minutes (recommended)
*/15 * * * * curl -X POST https://your-domain.com/api/marketing/automations/cron \
  -H "Authorization: Bearer your_cron_secret"
```

Options: Vercel Cron, EasyCron, GitHub Actions, AWS EventBridge, or any cron service.

### 5. Deploy

Deploy the application to get a public HTTPS URL (required for Meta webhooks).

---

## Data Flow Diagrams

### Outbound: Sending a Campaign

```
Admin selects customers in /marketing
  -> Clicks "Send Campaign"
  -> POST /api/marketing/send-campaign
  -> For each customer:
     -> lib/whatsapp/api.ts sendWhatsAppMessage()
        -> POST graph.facebook.com/v25.0/{phone_id}/messages
        -> Persist to whatsapp_messages (direction: outbound, status: sent)
  -> Returns results to UI (success/error per customer)
```

### Outbound: Automated Review Request

```
Shopify webhook: order fulfilled
  -> lib/webhooks/shopify/data-layer.ts upsertOrder()
  -> Checks store_settings.whatsapp_automation_enabled
  -> Sets orders.wa_review_status = 'scheduled'
  -> Sets orders.wa_scheduled_for = now() + delay_minutes

External cron (every 15 min):
  -> POST /api/marketing/automations/cron
  -> Queries orders WHERE wa_review_status = 'scheduled' AND wa_scheduled_for <= now()
  -> For each order:
     -> Generates review short link code
     -> lib/whatsapp/api.ts sendTemplate('review_request', ...)
     -> Updates orders.wa_review_status = 'sent'
```

### Inbound: Customer Messages You

```
Customer sends WhatsApp message
  -> Meta Cloud API
  -> POST /api/whatsapp/webhook
  -> persistInboundMessage() -> whatsapp_messages (direction: inbound)
  -> getOrCreateSession() -> whatsapp_sessions
  -> handleWhatsAppMessage() -> state machine in handlers.ts
  -> Auto-reply via sendSimpleText() or sendMenu()
  -> Response persisted to whatsapp_messages (direction: outbound)
```

### Status Tracking

```
Meta sends delivery receipt
  -> POST /api/whatsapp/webhook (statuses array)
  -> updateMessageStatus(waMessageId, 'delivered'|'read')
  -> Updates whatsapp_messages.status
  -> If message has matching orders.wa_message_id:
     -> Updates orders.wa_review_status too
```

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/whatsapp/api.ts` | Unified WhatsApp SDK — send messages, persist to DB |
| `lib/whatsapp/session.ts` | Session state management (per-customer) |
| `lib/whatsapp/handlers.ts` | Conversation state machine (auto-replies) |
| `lib/whatsapp/types.ts` | TypeScript interfaces for Meta webhook payloads |
| `app/api/whatsapp/webhook/route.ts` | Webhook endpoint (GET verify + POST receive) |
| `app/api/marketing/send-campaign/route.ts` | Template campaign API |
| `app/api/marketing/send-message/route.ts` | Direct text message API |
| `app/api/marketing/automations/cron/route.ts` | Scheduled review request processor |
| `app/(dashboard)/marketing/page.tsx` | Campaign & Direct Message UI |
| `app/(dashboard)/marketing/reviews/automations/` | Review automation settings & queue UI |
| `supabase/migrations/20260328_whatsapp_coexistence.sql` | Migration: whatsapp_messages + whatsapp_sessions tables |
| `middleware.ts` | Auth middleware (webhook route whitelisted) |

---

## Rate Limits & Best Practices

- **Meta rate limit:** 80 messages/second for standard tier, 1,000/second for high tier
- **Current throttling:** 100ms delay between messages in bulk sends
- **24-hour window:** Free-form text messages require the customer to have messaged you within the last 24 hours. Template messages can be sent anytime.
- **Template approval:** New templates must be approved by Meta before they can be used (takes minutes to hours)
- **Phone number formatting:** All numbers are stripped to digits only. 8-digit numbers get `974` (Qatar) prefix automatically.
