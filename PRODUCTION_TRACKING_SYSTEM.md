# Production & Tracking Suite Implementation Plan

## Goal
Build a high-end, "Time-Aware" Production & Tracking System to manage the lifecycle of bespoke tailoring orders. The system will feature visual deadline tracking ("Heatmap Kanban"), detailed tailor performance metrics, and automated progress notifications.

## User Review Required
> [!IMPORTANT]
> **Production Logic**: We are introducing a "Target Delivery Date" per assignment to drive the "Heatmap" logic.
> **Notifications**: We will implement a logic to alert via WhatsApp when 50% of the allocated time has elapsed.

## 1. Technical Architecture (Engineering)

### Database Schema (Normalized SQL)
We will extend the schema to support granular tracking and history.

#### `tailors`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `full_name` | text | Tailor's name |
| `phone` | text | WhatsApp-enabled phone number |
| `specialty` | text | e.g., 'Master Cutter', 'Embroiderer', 'Finisher' |
| `status` | text | 'active', 'on_leave' |
| `commission_rate` | float | Default piece rate modifier (optional) |

#### `production_assignments` (The Core Ledger)
Links a specific *item* (not just order) to a tailor.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `order_item_id` | uuid | FK to `order_items` |
| `tailor_id` | uuid | FK to `tailors` |
| `stage` | enum | 'Pending', 'Cutting', 'Sewing', 'QC', 'Ready', 'Delivered' |
| `cost_price_minor` | int | The "Piece Rate" owed to the tailor for this item |
| `assigned_at` | timestamp | Start time of the job |
| `target_due_at` | timestamp | **Critical**: Used to calculate the "Heatmap" color |
| `completed_at` | timestamp | Actual finish time |
| `is_paid` | boolean | Whether the tailor has been paid for this piece |

#### `production_status_history` (Audit Trail)
Tracks exact timestamps for every move.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `assignment_id` | uuid | FK to `production_assignments` |
| `previous_stage` | text | Old status |
| `new_stage` | text | New status |
| `changed_at` | timestamp | Time of change |
| `changed_by` | uuid | User who made the change |

---

## 2. Interface & Interaction (UI/UX)

### The "Heatmap Kanban" (Production Board)
A visual board where cards represent `production_assignments`.
-   **Columns**: Pending -> Cutting -> Sewing -> QC -> Ready.
-   **Visual Decay Logic**:
    -   **Green (Safe)**: < 50% of time elapsed.
    -   **Yellow (Warning)**: 50% - 80% time elapsed.
    -   **Red (Critical)**: > 80% time elapsed or Overdue.
-   **Card Content**: Order #, Item Name, Tailor Name (Avatar), Time Remaining (e.g., "-2h" or "+1d").

### Admin Tailor Profile (High-Density View)
A dashboard for managing individual tailors.
-   **KPI Cards**:
    -   *Current Load*: Number of active assignments.
    -   *Pending Payout*: Total `cost_price` of completed but unpaid items.
    -   *Speed Rating*: Avg time vs Target time.
-   **Performance Chart**: Bar chart showing "Items Completed" vs "Returns/QC Fails".
-   **Ledger Table**: Detailed list of unpaid items with a "Mark as Paid" bulk action.

### Notification UX
-   **Smart Alerts**: Admin receives a summary notification, not individual spam.
    -   *Example*: "3 Items hit 50% time mark recently."
-   **Tailor Interface (Optional)**: If tailors have access, they see a simple list sorted by Due Date.

---

## 3. Automation Logic

### Logic Engine: Time-Aware System
We will implement a helper utility `calculateHealth(assignedAt, targetDueAt)` that returns the status (Safe/Warning/Critical) and percentage for the UI.

### WhatsApp Triggers (Cron Job Pseudo-code)
We will create a Next.js API route that can be triggered by a Cron service (like Vercel Cron).

```typescript
// Cron Job: Runs every 30 minutes
async function checkProductionHealth() {
  const activeJobs = await fetchActiveAssignments(); // Status != Ready

  for (const job of activeJobs) {
    const elapsed = Date.now() - job.assigned_at;
    const totalDuration = job.target_due_at - job.assigned_at;
    const percent = (elapsed / totalDuration) * 100;

    // Trigger 50% Warning (Idempotent: check if alert already sent)
    if (percent >= 50 && !job.alert_50_sent) {
       await sendWhatsApp(job.tailor_phone, `Heads up! Item ${job.item_name} is halfway due.`);
       await notifyAdmin(`Alert: ${job.tailor_name} is at 50% time for ${job.item_name}`);
       await markJobAlertSent(job.id, '50%');
    }
  }
}
```

---

## 4. Implementation Steps
1.  **Schema Migration**: Create the new tables.
2.  **Tailor CRUD**: Build the page to add/edit tailors.
3.  **Production Board**: Build the Kanban with the Heatmap logic.
4.  **Assignment Modal**: Feature to assign an Item to a Tailor + Set Price + Set Due Date.
5.  **Notifications**: Integrate WhatsApp API (if credentials provided) or mock it for now.
