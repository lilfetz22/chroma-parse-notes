### **Project Specification: Kanban Board Feature (V2)**

#### **1. Core Objective**

You are to build a "Trello-style" Kanban board feature within the existing application. This feature allows users to organize tasks and notes visually. The implementation must support creating and managing columns, creating two distinct types of cards ("Simple" and "Linked"), and enabling full drag-and-drop functionality for both cards and columns.

#### **2. Core Technology Stack**

*   **Frontend Framework:** React
*   **Backend & Database:** Supabase
*   **Drag-and-Drop Library:** Use **`react-beautiful-dnd`**. This is a mandatory requirement.
*   **UI Components:** Use the existing `shadcn/ui` component library for modals, buttons, inputs, etc., to maintain a consistent look and feel.

#### **3. Database Schema (Supabase)**

You must create three new tables to support this feature:

1.  **`boards`**
    *   `id`: `uuid` (Primary Key, default: `uuid_generate_v4()`)
    *   `user_id`: `uuid` (Foreign Key to `auth.users`, non-nullable)
    *   `title`: `text` (default: `'My Board'`)
    *   `created_at`: `timestamp with time zone` (default: `now()`)
    *   *Note: For now, assume one board per user.*

2.  **`columns`**
    *   `id`: `uuid` (Primary Key, default: `uuid_generate_v4()`)
    *   `board_id`: `uuid` (Foreign Key to `boards.id`, non-nullable)
    *   `title`: `text` (non-nullable)
    *   `position`: `integer` (non-nullable, for ordering)
    *   `created_at`: `timestamp with time zone` (default: `now()`)

3.  **`cards`**
    *   `id`: `uuid` (Primary Key, default: `uuid_generate_v4()`)
    *   `column_id`: `uuid` (Foreign Key to `columns.id`, non-nullable)
    *   `position`: `integer` (non-nullable, for ordering within a column)
    *   **`card_type`**: `text` (non-nullable, either `'simple'` or `'linked'`)
    *   **`title`**: `text` (non-nullable, for Simple cards; for Linked cards, this can be a denormalized copy of the note title)
    *   **`content`**: `jsonb` (nullable, for the rich text of Simple cards)
    *   **`note_id`**: `uuid` (nullable, Foreign Key to the existing `notes` table. This is **required** when `card_type` is `'linked'`)
    *   `created_at`: `timestamp with time zone` (default: `now()`)

#### **4. Component Breakdown**

Create the following new React components:

1.  **`KanbanBoardView.tsx` (The Main Page/Container)**
    *   **Responsibility:** The primary view for the Kanban board.
    *   **Props:** None.
    *   **Logic:**
        *   Fetches the user's board, all its columns, and all its cards from Supabase on mount. Data should be ordered by the `position` fields.
        *   Manages the state for the entire board (columns and cards).
        *   Contains the `DragDropContext` from `react-beautiful-dnd`.
        *   Implements the `onDragEnd` logic for both card and column reordering.
        *   Renders a list of `Column` components.
        *   Renders a button to "Add new column".

2.  **`Column.tsx`**
    *   **Responsibility:** Renders a single column and the cards within it.
    *   **Props:** `column: ColumnType`, `cards: CardType[]`, `index: number`.
    *   **Logic:**
        *   Wrapped in a `Draggable` component to allow column reordering.
        *   Contains a `Droppable` area for cards.
        *   Renders an editable title that can be updated (e.g., on blur or by clicking an edit icon).
        *   Includes a dropdown menu for column actions: "Rename" and "Delete Column".
        *   Renders a list of `Card` components, ordered by `position`.
        *   Includes a button at the bottom to "Add a card".

3.  **`Card.tsx`**
    *   **Responsibility:** Renders a single card.
    *   **Props:** `card: CardType`, `index: number`.
    *   **Logic:**
        *   Wrapped in a `Draggable` component.
        *   **Conditional Rendering based on `card.card_type`:**
            *   If `'linked'`: Display the card's title and a short, truncated preview of the linked note's content. On click, it must navigate the user to the full note page (e.g., `/notes/${card.note_id}`).
            *   If `'simple'`: Display the card's title. On click, it should open a modal (`CardDetailModal.tsx`) showing the full `content` in a rich-text editor view.

4.  **`CreateCardModal.tsx`**
    *   **Responsibility:** UI for creating a new card.
    *   **Props:** `columnId: string`, `onCardCreated: (newCard) => void`.
    *   **Logic:**
        *   A form that allows the user to select the card type (`Simple` or `Linked`) via a dropdown or radio buttons.
        *   **If `Simple` is selected:** Show a text input for the `title`. A full rich-text editor for the `content` can be included here or in the `CardDetailModal`.
        *   **If `Linked` is selected:** Show a search input that allows the user to search through their existing notes by title. Display results in a list. Clicking a note from the list selects it for linking.
        *   On submit, it creates a new record in the `cards` table in Supabase and calls `onCardCreated` to update the board's state.

#### **5. Feature Implementation Details**

1.  **Data Fetching:**
    *   Create a Supabase RPC function `get_board_details` that fetches the board, its columns (ordered by `position`), and all associated cards (ordered by `position`) in a single network request to optimize loading.

2.  **Drag-and-Drop Logic (`onDragEnd` in `KanbanBoardView.tsx`):**
    *   Handle three distinct cases in the `onDragEnd` callback:
        1.  **Card reordered in the same column:** Update the `position` of all affected cards in that column.
        2.  **Card moved to a different column:** Update the card's `column_id` and the `position` of all affected cards in both the source and destination columns.
        3.  **Column reordered:** Update the `position` of all affected columns in the `boards` table.
    *   **Implementation:** Use optimistic updates in the React state for a smooth UI, followed by an asynchronous call to a Supabase function to persist the changes.

3.  **Card Creation Flow:**
    *   The "Add a card" button in `Column.tsx` should open the `CreateCardModal.tsx`, passing the current `column.id`.
    *   The note search functionality within the modal must query the `notes` table based on user input.

4.  **Column Management:**
    *   **Creation:** Add a new column record to Supabase with the correct `board_id` and the next available `position`.
    *   **Renaming:** Allow inline editing of the column title. On change, update the `title` field for that column in Supabase.
    *   **Deletion:** When deleting a column, Supabase should be configured with a cascading delete to automatically remove all cards within that column.

This specification provides a complete blueprint for building the Kanban board feature. Adherence to this spec will result in the desired functionality.