# WhatsApp Campaign UI/API Upgrade Implementation Plan

## Goal
Upgrade the Marketing/Send Campaign page to fully support advanced WhatsApp Business API templates, including:
-   Distinguishing **Body Variables** from **Button Variables**.
-   Supporting **Dynamic URL Buttons** (where only the suffix is templated).
-   Adding a **Live Preview** for the bilingual (Arabic/English) message.
-   Ensuring the backend sends the correct `components` structure to Meta.

---

## 1. Technical Architecture (API & Data)

### Current State
The `variables` array is sent as a flat list, and the API maps them all to `type: "body"`.

### Required Changes

#### API Route: [send-campaign/route.ts](file:///Users/alaa/Documents/Stitched/Google/abaya_portal_admin/app/api/marketing/send-campaign/route.ts)

**New Payload Structure from Frontend:**
```typescript
interface SendCampaignRequest {
    customers: ...;
    templateName: string;
    languageCode: string; // e.g., "ar"
    headerImageUrl?: string;
    bodyVariables: Array<{ position: number; value: string; source: string }>;
    buttonVariables: Array<{ buttonIndex: number; urlSuffix: string; source: string }>;
}
```

**New `components` structure for Meta API:**
```json
[
  {
    "type": "header",
    "parameters": [{ "type": "image", "image": { "link": "..." } }]
  },
  {
    "type": "body",
    "parameters": [
      { "type": "text", "text": "Moneera" },
      { "type": "text", "text": "Sorbet Summers" }
    ]
  },
  {
    "type": "button",
    "sub_type": "url",
    "index": "0",
    "parameters": [{ "type": "text", "text": "sorbet-summers" }]
  }
]
```

---

## 2. Interface & Interaction (UI/UX)

### Page Layout Updates: [marketing/page.tsx](file:///Users/alaa/Documents/Stitched/Google/abaya_portal_admin/app/(dashboard)/marketing/page.tsx)

We will refactor the Right Column ("Campaign Configuration") to have clearly separated sections.

#### Section A: Template & Language
| Field | Notes |
| :--- | :--- |
| **Template Name** | (Existing) Lookup from saved templates. |
| **Language Code** | Default to `ar`. Add helper text: "Use `ar` for bilingual templates." |

#### Section B: Header Image
| Field | Notes |
| :--- | :--- |
| **Header Image URL** | (Existing) Supports direct `.jpg`/`.png` links. |

#### Section C: Body Parameters (NEW)
A dedicated card/section for body text variables.
-   Title: "Body Variables (Text)"
-   Button: "Add Body Variable"
-   Each row: `{{1}} → [Dropdown: Customer Name, Static Value] [Input if Static]`

#### Section D: Button Parameters (NEW)
A dedicated card/section for button variables.
-   Title: "Button Variables (Dynamic URL)"
-   Helper Text: "For dynamic URL buttons, enter only the **suffix** (e.g., `sorbet-summers` for `your-site.com/collections/sorbet-summers`)."
-   Each row: `Button 0 → {{1}} → [Input for URL Suffix]`

#### Section E: Live Preview (NEW - "Apple Style")
A visual preview card that simulates the WhatsApp message.
-   Displays: Header Image (if provided), combined Arabic/English body text with placeholders resolved, CTA Button.
-   Styling: Clean, white background, rounded corners, iOS message bubble aesthetic.

---

## 3. Detailed File Changes

### [MODIFY] [page.tsx](file:///Users/alaa/Documents/Stitched/Google/abaya_portal_admin/app/(dashboard)/marketing/page.tsx)
1.  **State Refactor:**
    -   Replace `variables` state with `bodyVariables` and `buttonVariables`.
2.  **UI Refactor:**
    -   Create a new `<BodyVariablesSection />` component.
    -   Create a new `<ButtonVariablesSection />` component.
    -   Create a new `<LivePreview />` component.
3.  **`sendCampaign` Function:**
    -   Update the `fetch` body to send `bodyVariables` and `buttonVariables` separately.

### [MODIFY] [route.ts](file:///Users/alaa/Documents/Stitched/Google/abaya_portal_admin/app/api/marketing/send-campaign/route.ts)
1.  **Interface Update:**
    -   Add `bodyVariables` and `buttonVariables` to `SendCampaignRequest`.
2.  **Component Building Logic:**
    -   Build `type: "body"` component from `bodyVariables`.
    -   Build `type: "button"` component from `buttonVariables`, including `sub_type: "url"` and `index`.
3.  **Language Code:**
    -   The `languageCode` will be passed directly from the frontend (defaulting to `ar`).

---

## 4. UI/UX Details ("Apple Style")

### Live Preview Component
-   **Header**: Rounded image container.
-   **Body**: Paragraph text that dynamically replaces `{{1}}`, `{{2}}` with sample data or current field values. Support RTL for Arabic.
-   **Button**: A tappable-looking CTA button (e.g., "Shop Now").

### Color & Typography
-   Use existing design system colors (`accent`, `primary`, `sand-*`).
-   Font: `font-sans` (Montserrat if configured).
-   High-contrast states for input focus.

---

## 5. Implementation Steps
1.  ✅ Research current UI and API (Done)
2.  ⬜ Update `route.ts` to handle separate body/button variables.
3.  ⬜ Refactor `page.tsx` state.
4.  ⬜ Build `<BodyVariablesSection />`.
5.  ⬜ Build `<ButtonVariablesSection />`.
6.  ⬜ Build `<LivePreview />`.
7.  ⬜ Test end-to-end with a real bilingual template.
