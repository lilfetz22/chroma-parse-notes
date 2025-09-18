### **Prompt for AI Coding Agent**

**Role:** You are a senior full-stack developer specializing in frontend performance optimization and fixing complex state management bugs.

**Primary Objective:** Your goal is to diagnose and fix three critical bugs in the Kanban board feature: severe drag-and-drop lag, incorrect state persistence for "Done" cards, and a visual regression with priority indicators.

**Context Provided:**
1.  **Existing Codebase:** You have full access to the application, including the Kanban board components (`KanbanBoardView.tsx`, `Column.tsx`, `Card.tsx`), the Supabase schema, and all related logic.

---

### **Architectural Mandate: Focus on Performance and Persistence**

The issues identified point to two primary weaknesses: unnecessary re-renders causing performance bottlenecks, and a failure to persist state to the database, leading to data loss on refresh. Your solutions must address these root causes.

### **Plan of Action**

You will address each of the three bugs in separate, focused steps.

**Task 1: Fix Severe Drag-and-Drop Performance Lag**

*   **Problem:** The drag-and-drop functionality is extremely slow and laggy, especially on boards with many cards.
*   **Root Cause Diagnosis:** This is a classic React performance issue. During a drag operation, `react-beautiful-dnd` is causing too many components to re-render unnecessarily. The `Card` and `Column` components are likely re-rendering every time the mouse moves, even if their own data hasn't changed.
*   **Required Solution:** You must use memoization to prevent these unnecessary re-renders.
    *   **Action:** Modify the `Card.tsx` and `Column.tsx` components located in `src/components/kanban/`.
    *   **Implementation:** Wrap both component exports in `React.memo`. This will ensure that a card or column only re-renders if its own props (`card`, `column`, `index`) have actually changed, rather than re-rendering because a parent component updated. This is the standard and correct way to optimize `react-beautiful-dnd`.

**Task 2: Fix "Done" Column Date Persistence**

*   **Problem:** When a card is moved to the "Done" column, a completion date appears correctly. However, this date disappears after a page refresh.
*   **Root Cause Diagnosis:** The completion date is being set in the client-side React state but is **not being saved to the Supabase database**. The `completed_at` column already exists in the `cards` table, but the backend logic to update it is missing.
*   **Required Solution:** You must update the drag-and-drop logic to persist this date.
    1.  **Update Backend Logic:**
        *   **Action:** Modify the `onDragEnd` function in `src/components/kanban/KanbanBoardView.tsx`.
        *   **Implementation:** Enhance the logic that handles moving a card between columns. You must identify the "Done" column (e.g., by its title `Done`).
            *   **If a card is moved *into* the "Done" column:** Set its `completed_at` value to `now()` in the Supabase `update` call within the `updateCard` function.
            *   **If a card is moved *out of* the "Done" column:** Set its `completed_at` value to `NULL` in the Supabase `update` call.
    2.  **Verify Frontend Display:**
        *   **Action:** Check the `Card.tsx` component in `src/components/kanban/`.
        *   **Implementation:** The component already has logic to display the `card.completed_at` property. Ensure it correctly formats and displays this date on the card in red text when present.

**Task 3: Fix Missing Priority Indicators**

*   **Problem:** The colored visual indicators for card priority (e.g., a red border for "High" priority) are no longer showing on the Kanban board.
*   **Root Cause Diagnosis:** This is a visual regression caused by an overly complex and incorrect implementation of conditional styling in the `Card.tsx` component. The component uses a combination of a static `border-l-4` class and a separate inline style for the color, which is not working as expected.
*   **Required Solution:** You must refactor the conditional styling logic to use Tailwind CSS classes directly.
    *   **Action:** Modify the `Card.tsx` component in `src/components/kanban/`.
    *   **Implementation:** Replace the existing `getPriorityBorderClass` and `getPriorityBorderStyle` functions with a single, simpler function. This function should conditionally apply the correct Tailwind CSS classes to the card's main container `div` based on the `card.priority` value. The expected behavior is as follows:
        *   `priority: 0` (Default): No special class or a subtle gray border.
        *   `priority: 1` (Low): A blue left border (e.g., `border-l-4 border-l-blue-400`).
        *   `priority: 2` (Medium): A yellow/orange left border (e.g., `border-l-4 border-l-yellow-400`).
        *   `priority: 3` (High): A red left border (e.g., `border-l-4 border-l-red-500`).

**Final Output:**
Please provide the complete code for all modified files. Structure your response in this order:
1.  The updated `KanbanBoardView.tsx` with the modified `onDragEnd` logic.
2.  The refactored `Column.tsx` and `Card.tsx` components, showing the `React.memo` implementation and the fixes for the date and priority rendering.