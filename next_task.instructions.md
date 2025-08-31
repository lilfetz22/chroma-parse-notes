**Primary Objective:** Your goal is to implement two new, deeply integrated features into the Kanban board: a **Priority System** and a **Tagging System**. These features must be available for all card types and scheduled tasks, and the UI must visually reflect the new metadata.

**Context Provided:**
1.  **Existing Architecture:** You have the full context of the application, including the Supabase schema for projects, boards, columns, cards, and the advanced `scheduled_tasks` system.
2.  **Full Codebase:** You have access to the entire project. You will be modifying the database, backend functions, and several React components.

---

### **Architectural Mandate: Data-First Implementation**

These features require significant changes to the data model. You must begin with the database schema modifications, as they will inform all subsequent backend and frontend work.

### **Plan of Action**

Follow these steps precisely in the order they are presented.

**Step 1: Evolve the Database Schema (The Foundation)**

*   **Action:** Create a single new Supabase migration file to contain all the following schema changes.

*   **Implementation:**

    1.  **Priority System - Modify the `cards` table:**
        *   Add a `priority` column.
        *   **Type:** `integer`.
        *   **Constraints:** `NOT NULL`.
        *   **Default Value:** `0`.

    2.  **Tagging System - Create two new tables:**
        *   **`tags` table:** This table will store the master list of all tags for a user.
            *   `id`: `uuid` (Primary Key)
            *   `user_id`: `uuid` (Foreign Key to `auth.users`)
            *   `name`: `text` (The text of the tag, e.g., "Frontend", "Bug")
            *   `color`: `text` (A hex code or Tailwind color class name, e.g., "bg-blue-500")
        *   **`card_tags` join table:** This table creates the many-to-many relationship between cards and tags.
            *   `card_id`: `uuid` (Foreign Key to `cards.id`, part of a composite primary key)
            *   `tag_id`: `uuid` (Foreign Key to `tags.id`, part of a composite primary key)

    3.  **Update `scheduled_tasks` for Feature Parity:** The scheduled tasks must also support these new features so that the generated cards inherit them.
        *   Add a `priority` column: `integer`, `NOT NULL`, `DEFAULT 0`.
        *   Add a `tag_ids` column: `uuid[]` (an array of UUIDs), `nullable`. This will store an array of the `tag.id`s to be applied when the card is created.

**Step 2: Upgrade the Backend Logic**

*   **Action:** Modify the backend functions to support the new data.
*   **Implementation:**
    1.  **`process_scheduled_tasks()` function:** When this function creates a new card from a scheduled task, it must now also populate the `priority` field and create the necessary entries in the `card_tags` join table using the `tag_ids` array.
    2.  **`get_board_details()` RPC function:** Update this function to be more efficient. It must now perform a `JOIN` to fetch all associated tags for each card in a single query, preventing N+1 query problems on the frontend.

**Step 3: Enhance the Frontend UI (Creation and Editing)**

*   **Action:** Modify the modals for creating and editing cards to include UI for setting priority and tags.
*   **Implementation:** In both `CreateCardModal.tsx` and `EditCardModal.tsx`:
    1.  **Priority Input:**
        *   Add a `Select` or `RadioGroup` component for "Priority."
        *   The options should be "Default" (value 0), "Low" (1), "Medium" (2), and "High" (3).
    2.  **Tagging Input (Advanced):**
        *   Add a tag input component. This should be a sophisticated input that allows the user to:
            *   Type to search for existing tags (autocomplete).
            *   Select tags from the search results to add them.
            *   Type a new tag name and hit "Enter" to create a new tag on the fly.
            *   Display the currently selected tags as dismissible "pills" or "badges" within the input area.
        *   When a new tag is created, it should be saved to the `tags` table with a randomly assigned default color.

**Step 4: Update the Card Display Component (`Card.tsx`)**

*   **Action:** Modify the `Card.tsx` component to visually display the new priority and tag information.
*   **Implementation:**
    1.  **Priority Visualization:**
        *   Use the `priority` value to conditionally apply a colored border to the card. For example, a `border-l-4` with a specific color on the left edge.
        *   **Color Mapping:**
            *   `0`: Default (no border or a subtle gray border).
            *   `1 (Low)`: A blue border (e.g., `border-l-blue-400`).
            *   `2 (Medium)`: A yellow or orange border (e.g., `border-l-yellow-400`).
            *   `3 (High)`: A red border (e.g., `border-l-red-500`).
    2.  **Tag Display:**
        *   At the bottom of the card content, render the list of associated tags.
        *   Each tag should be a small, colored "badge" or "pill" (`Badge` component from `shadcn/ui`) that displays the tag's name and uses its `color` property for the background.

**Final Output:**
Please provide the complete code for all new and modified files. Follow this structure:
1.  The new **Supabase migration file** with all schema changes.
2.  The updated backend functions (`process_scheduled_tasks` and `get_board_details`).
3.  The modified UI components: `CreateCardModal.tsx`, `EditCardModal.tsx`, and finally the visually updated `Card.tsx`.