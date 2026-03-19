# UAT & QA Test Plan: Product Review Submission Page
**Target URL:** `http://localhost:3000/review/s17` (and dynamic product variants)
**Focus Areas:** Functional Validation, Cinematic UI/UI, Edge Cases, Technical Integrity

---

## 1. Functional Testing (Data & Submission)

### 🟢 Positive Test Cases
| Test ID | Scenario | Steps to Execute | Expected Result |
| :--- | :--- | :--- | :--- |
| **FT-P01** | **Submit full valid review** | 1. Select a rating (e.g., 5 stars).<br>2. Fill in Name and Email (if applicable).<br>3. Enter review text.<br>4. Click "Share Your Thoughts". | Form submits successfully. A success confirmation/thank you state is displayed. |
| **FT-P02** | **Submit minimum required data** | 1. Select the mandatory rating.<br>2. Leave optional text fields empty.<br>3. Click "Share Your Thoughts". | Form submits successfully if text is optional, OR prompts for text if it is mandatory. |
| **FT-P03** | **Change rating before submission** | 1. Click 3 stars.<br>2. Change to 5 stars.<br>3. Submit. | The final selected rating (5 stars) is recorded in the payload and database. |

### 🔴 Negative Test Cases
| Test ID | Scenario | Steps to Execute | Expected Result |
| :--- | :--- | :--- | :--- |
| **FT-N01** | **Submit empty form** | 1. Load the page.<br>2. Do not interact with any fields.<br>3. Click "Share Your Thoughts". | Submission blocked. Inline validation errors appear (e.g., "Rating is required", "Name is required"). |
| **FT-N02** | **Submit without rating** | 1. Fill in all text fields (Name, Review).<br>2. Leave the star rating empty.<br>3. Click submit. | Submission blocked. Highlight the rating component indicating it is mandatory. |
| **FT-N03** | **Invalid Email Format (if applicable)** | 1. Enter `test@.com` or `invalid-email` into the email field.<br>2. Fill other required fields and submit. | Submission blocked. Inline validation error: "Please enter a valid email address." |


### 🟡 Combinatorial Field Testing (Field Dependencies)
| Test ID | Scenario | Steps to Execute | Expected Result |
| :--- | :--- | :--- | :--- |
| **FT-C01** | **Rating Only (No Name/Text)** | 1. Select a rating (e.g., 4 stars).<br>2. Leave Name and Review Text blank.<br>3. Submit. | If Name/Text are optional: success (displays "Anonymous"). If mandatory: blocked with error on Name/Text. |
| **FT-C02** | **Name Only (No Rating/Text)** | 1. Enter "Jane Doe" in Name.<br>2. Leave Rating unselected.<br>3. Submit. | Submission blocked. Highlight Rating as required. |
| **FT-C03** | **Text Only (No Rating/Name)** | 1. Enter text in Review area.<br>2. Leave Rating unselected and Name blank.<br>3. Submit. | Submission blocked. Highlight Rating as required. |
| **FT-C04** | **Rating + Name (No Text)** | 1. Select 5 stars.<br>2. Enter Name.<br>3. Leave Review Text blank.<br>4. Submit. | Form submits successfully. Review displays rating and name with no text/empty state. |
| **FT-C05** | **Rating + Text (No Name)** | 1. Select 5 stars.<br>2. Enter Review Text.<br>3. Leave Name blank.<br>4. Submit. | Form submits successfully. Review displays rating and text, with reviewer marked as "Anonymous" or similar placeholder. |
| **FT-C06** | **Name + Text (No Rating)** | 1. Enter Name and Review Text.<br>2. Leave Rating unselected.<br>3. Submit. | Submission blocked. Highlight Rating as required. |

### 🟠 Edge Cases
| Test ID | Scenario | Steps to Execute | Expected Result |
| :--- | :--- | :--- | :--- |
| **FT-E01** | **Exceed max character limit** | 1. Paste 10,000+ characters into the review text area.<br>2. Attempt to type more or submit. | The input should truncate at the max limit (e.g., 500 or 1000 chars), or submission should fail with a clear "Text too long" error. |
| **FT-E02** | **Special characters & emojis** | 1. Enter names and reviews containing emojis (✨👗), Arabic text (عباية), and symbols (`'<>;--`).<br>2. Submit. | Data is accepted, stored, and retrieved without corruption, encoding issues, or triggering SQL injection/XSS. |
| **FT-E03** | **Rapid double-click submission** | 1. Fill valid data.<br>2. Rapidly double-click/tap the "Share Your Thoughts" button. | Only ONE network request is sent. The button should enter a disabled/loading state immediately after the first click. |
| **FT-E04** | **Network drop during submission** | 1. Fill valid data.<br>2. Use browser tools to go "Offline".<br>3. Submit. | The app handles the timeout gracefully and shows "Please check your network connection" rather than crashing. |

---

## 2. Design & UI Testing (Cinematic Aesthetics)

| Test ID | Element | Expected Visual Behavior & Standards |
| :--- | :--- | :--- |
| **UI-01** | **Background Image** | The product image (S17) must cover the entire viewport (`object-fit: cover`). It should be sharp, unblurred, and scale proportionally without stretching. |
| **UI-02** | **Gradient Overlay** | A dark gradient must overlay the background image. It should transition smoothly from transparent at the top to a solid dark color at the bottom half to ensure text legibility. |
| **UI-03** | **Form Positioning** | The review form, rating, and inputs must sit entirely within the dark bottom half of the screen where the gradient is darkest. |
| **UI-04** | **Typography & Contrast** | Primary text (labels, inputs) must be crisp white. Placeholder text must be a legible light grey (`#e0d0c0` or similar). |
| **UI-05** | **Input Fields & Focus** | Text areas and inputs should have a subtle white/translucent background fill and a delicate border. Upon focus, they should highlight smoothly without jarring layout shifts. |
| **UI-06** | **"Share Your Thoughts" CTA** | The button must look premium. Hover and active states must trigger smooth transitions (e.g., color shift, slight scale, or shadow change). |
| **UI-07** | **Responsive Design** | On mobile (iPhone SE, Pro Max) and tablets: The form should stack neatly, inputs should be large enough to tap easily (min 44px height), and the on-screen keyboard should not obscure the active input field. |

---

## 3. Technical & API Testing

| Test ID | Area | Testing Steps & Expected Outcome |
| :--- | :--- | :--- |
| **TC-01** | **API Payload Structure** | Intercept the POST request. Verify the JSON payload correctly maps data (e.g., `rating`: 5, `text`: "...", `product_id`: "s17"). Types should be correct (rating as number vs. string). |
| **TC-02** | **Loading States** | Upon submission, the "Share Your Thoughts" button should become disabled and preferably show a spinner/loading text to indicate network activity. |
| **TC-03** | **Server Errors (5xx)** | Mock the API to return a `500 Internal Server Error`. The UI must catch this and display a user-friendly error string (e.g., "Something went wrong. Please try again.") instead of logging the raw error or crashing. |
| **TC-04** | **Cross-Site Scripting (XSS)** | Attempt to input `<script>alert('hack')</script>` in the review body. The backend OR frontend must sanitize the input so it is treated as plain text if rendered later. |
| **TC-05** | **Performance (LCP/CLS)** | Run Lighthouse. The large background image must be optimized (e.g., WebP, proper sizing) so the Largest Contentful Paint (LCP) is under 2.5 seconds. The layout must not shift (CLS < 0.1) as the form loads over the image limit. |

---

## 4. Multi-Language & Multi-Product Testing

| Test ID | Area | Testing Steps & Expected Outcome |
| :--- | :--- | :--- |
| **ML-01** | **Language Toggle (AR/EN)** | 1. Switch the page language to Arabic.<br>2. Verify RTL layout, Arabic fonts, and translated placeholders ("Share Your Thoughts" -> "شارك قصتك").<br>3. Submit a review in Arabic.<br>4. Switch back to English and submit an English review.<br>**Expected:** Both submit successfully. Layout behaves correctly in RTL. |
| **MP-01** | **Cross-Product Submission** | 1. Submit a review on `/review/s17`.<br>2. Navigate to another product, e.g., `/review/k4`.<br>3. Submit a review there.<br>**Expected:** Each review is correctly associated with its respective `product_id`. The S17 review should not appear under K4. |

---

## 5. End-to-End Persistence (Database & Moderation Dashboard)

| Test ID | Area | Testing Steps & Expected Outcome |
| :--- | :--- | :--- |
| **E2E-01** | **Database Insertion** | 1. Submit reviews from scenarios FT-P01, FT-C04, and ML-01.<br>2. Log into the database directly (e.g., Supabase, PostgreSQL).<br>**Expected:** Records exist. `product_id` matches the URL, `rating` is an integer, `status` defaults to "pending" or "published" based on business rules, and Arabic characters are encoded correctly (UTF-8). |
| **E2E-02** | **Appears in Moderation UI** | 1. Submit test reviews.<br>2. Log into the Admin/Moderation Dashboard (e.g., `/admin/reviews`).<br>**Expected:** The new reviews immediately appear in the queue with correct metadata (Name, Star Rating, Product ID: S17/K4, Timestamp, and Text). |
| **E2E-03** | **Moderation Actions** | 1. From the moderation dashboard, Approve one test review and Reject another.<br>2. Check the public PDP (Product Detail Page).<br>**Expected:** Only the Approved review is visible in the public Stitched Reviews widget. |

---

## 6. Final QA Test Report Specification

Once the test execution phase is completed, the QA Engineer will generate a final report. The report must contain:

1. **Executive Summary:** Pass/Fail rate (e.g., "95% Pass, 2 Blockers").
2. **Environment Details:** Browser versions tested (Chrome, Safari, iOS Safari), OS, and tested URLs (e.g., `/review/s17`, `/review/k4`).
3. **Bug Log (if any):** 
   - Severity (Blocker, High, Medium, Low)
   - Steps to Reproduce
   - Expected vs Actual behavior
   - Screenshots/Recordings (especially for UI/Design deviations)
4. **Database & Moderation Verification:** Explicit confirmation that data flowed correctly from the frontend $\rightarrow$ Database $\rightarrow$ Admin Moderation UI.
5. **Sign-off Status:** Recommended for Production / Requires Developer Fixes.
