### **Prompt for AI Coding Agent**

**Role:** You are a senior full-stack developer tasked with completing the feature set for the task scheduling system.

**Primary Objective:** Your goal is to provide full lifecycle management for scheduled tasks. This involves two core features: **1)** Allowing users to convert an existing Kanban card into a future scheduled task, and **2)** Building a dedicated page where users can view, edit, and delete all their upcoming scheduled tasks.

**Context Provided:**
1.  **Existing Architecture:** You have full context of the application's schema (`cards`, `scheduled_tasks`, etc.) and the component-based architecture, including the reusable `<SchedulingOptions />` component.
2.  **Full Codebase:** You have access to the entire project.

---

### **Architectural Mandate: Complete the Task Lifecycle**

The current implementation allows for the creation of scheduled tasks but lacks the ability to manage them post-creation or to create them from existing items. You will close this loop by providing a clear UI for converting, viewing, and managing all scheduled tasks.

### **Plan of Action**

Follow these two major steps in order.

**Part 1: Implement "Card to Scheduled Task" Conversion**

Users often create a card and later decide to defer it or make it recurring. We need to support this workflow.

*   **Action:** Enhance the `EditCardModal.tsx` component.
*   **Implementation:**
    1.  **Integrate the Reusable Component:** Add the `<SchedulingOptions />` component to the `EditCardModal.tsx` form. By default, the scheduling toggle should be off.
    2.  **Implement the Conversion Logic:** This is the most critical part. When the user opens the edit modal for a standard card and **enables the scheduling toggle**, the "Save" button's behavior must change. On save, it must perform a "convert" operation:
        *   **`INSERT` a new record** into the `scheduled_tasks` table. Copy all relevant data from the card: `user_id`, `project_id`, `title`, `summary`, `priority`, `note_id` (if it's a linked card), and the new scheduling rules from the `<SchedulingOptions />` component.
        *   **`DELETE` the original card** from the `cards` table.
        *   This two-step process should ideally be handled in a single Supabase RPC function (e.g., `convert_card_to_scheduled_task`) to ensure it is atomic.
    3.  **Update State:** After the conversion is successful, ensure the card is removed from the board's UI state.

**Part 2: Build the "Scheduled Tasks" Management Page**

Users need a central dashboard to see and manage everything that is scheduled to happen in the future.

*   **Action:** Create a new page at the route `/schedule`.
*   **Implementation:**
    1.  **Create the Page Component:** Create a new file `app/schedule/page.tsx`. This page should be wrapped in the main application layout to ensure consistent navigation.
    2.  **Fetch Data:** On page load, fetch all records from the `scheduled_tasks` table for the currently logged-in user.
    3.  **Display Tasks:**
        *   Render the tasks in a list or table view.
        *   Each item must clearly display:
            *   The task `title`.
            *   The `project` it belongs to.
            *   A **human-readable summary of its schedule**. You will need to create a helper function for this (e.g., `formatRecurrenceRule(task)`). Examples:
                *   `"Once on December 25, 2024"`
                *   `"Every weekday (Mon-Fri)"`
                *   `"Weekly on Mondays and Fridays"`
                *   `"Bi-weekly"`
    4.  **Implement Edit Functionality:**
        *   Each item in the list must have an "Edit" button.
        *   Clicking "Edit" should open a new `EditScheduledTaskModal.tsx`.
        *   This modal should be pre-filled with all the data for that task, including its title, summary, and current scheduling options (populating the state for the `<SchedulingOptions />` component).
        *   Saving the modal should perform a `supabase.from('scheduled_tasks').update()` operation.
    5.  **Implement Delete Functionality:**
        *   Each item must have a "Delete" button.
        *   Clicking "Delete" must trigger a confirmation dialog (`AlertDialog` from `shadcn/ui`).
        *   Upon confirmation, it should `DELETE` the record from the `scheduled_tasks` table and remove it from the UI.

**Final Output:**
Please provide the complete code for all new and modified files. Structure your response as follows:
1.  The modified `EditCardModal.tsx` and the new Supabase RPC function for the conversion logic.
2.  The new page file `app/schedule/page.tsx`.
3.  The new `EditScheduledTaskModal.tsx` component.
4.  The new `formatRecurrenceRule` helper function.