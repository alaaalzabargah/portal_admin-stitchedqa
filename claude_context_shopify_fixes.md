# Shopify Synchronization & Finance Orders Fixes

**Date:** March 22, 2026
**Context:** For future AI coding assistants to understand the core webhook and database patches made to resolve data duplication, inflated totals, and missing customer measurements.

---

## 1. The Root Problem: "Ghost Items" & Order Edits
When merchants manually edited orders in the Shopify Admin dashboard (specifically replacing custom deposit items with full-priced items after balance payments), Shopify's webhook payloads did not permanently delete the removed line items. Instead, they were sent in the payload with `current_quantity: 0`.

### Previous Bugs Caused by This:
1. **Item Duplication**: Our `replaceOrderItems` database logic previously inserted every line item from the payload blindly, leading to ghost/deleted items being permanently attached to orders in the Supabase DB.
2. **Inflated Totals**: Shopify's high-level `total_price` field never decreases when items are removed. Because our handlers were syncing the historical `total_price` instead of the dynamic `current_total_price`, orders appeared massively overvalued.
3. **Lost Measurements**: When tailors had already attached 8-point body measurements to the *original* deposit item, deleting that item on Shopify caused the system to permanently orphan/lose the sizing data, forcing the tailor to ask again.

## 2. The Fixes Implemented

### A. Webhook Subtotal & Total Patch (handlers.ts)
The payload parsing logic in `ShopifyOrderSchema` (`schemas.ts`) and `ShopifyOrderPayload` (`types.ts`) was updated to correctly accept `current_total_price` and `current_subtotal_price`.
- `handleOrderCreate` now prioritizes `current_total_price` over `total_price`.
- The deposit calculations intelligently use `current_subtotal_price`.

### B. Intelligent Measurement Merging (extractors.ts)
`extractLineItems` and `extractMeasurements` were completely overhauled:
1.  It iterates over the payload, separating *active* items (`current_quantity !== 0`) from *ghost* items (`current_quantity === 0`).
2.  If it detects ghost items that possessed custom body metrics (`has_measurements`), it securely copies those measurements over to the new active replacement item in the same exact order.
3.  Ghost items are then fully purged from the array before returning, ensuring the database never sees them.

### C. The Cleanup Audit Mechanism (scripts/audit_orders.ts)
To retroactively fix the months of corrupted data prior to the fix, a sophisticated bulk-processing audit script was written at `scripts/audit_orders.ts` and `scripts/fix_order.ts`.
- It accurately detected orders suffering from `GHOST_ITEMS`, `DB_MISMATCH`, and `EDITED` discrepancies.
- We routed every corrupted order from #1181 onwards through `fix_order.ts`, perfectly aligning Supabase DB totals and items with the accurate active state of the Shopify dashboard.

---

## 3. Moderator Access & Navigation (UI/UX)
Finally, for the Administrative UI, we expanded the system's role-based access control.

1. **Access Bypass (`middleware.ts`)**: The router's middleware was patched so users with `role === 'moderator'` are formally permitted to directly view the `finance/orders` URL without bouncing to the standard reviews dashboard.
2. **Sidebar & Mobile Injection**: `/finance/orders` was injected into `moderatorPaths` within `Sidebar.tsx` and `MobileNav.tsx`.
3. **Immersive Navigation**: 
    - The Shopify Order Number strings within `/finance/orders` were wrapped in `<Link>` tags with a beautiful `underline-offset` hover state.
    - They pass `?tab=orders&from=/finance/orders` internally to `CustomerDetailsClient`.
    - This automatically defaults the Customer Detail page to the Orders widget.
    - A dedicated `<CustomerBackButton>` was constructed. It triggers a purely native `router.back()` if history length exists. This guarantees that when an admin returns to the finance page, all client-side `useState` text searches, sort parameters, and deposit filter toggles are fully preserved exactly as they had left them!
