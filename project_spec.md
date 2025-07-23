Of course. Based on the V1 project specification and the conventions of AI-driven development configuration, here is the `GEMINI.md` file for Chroma Notes.

***

# GEMINI.md

This file specifies the requirements for Version 1.0 of the **Chroma Notes** web application.

# project

-   **name**: Chroma Notes
-   **version**: 1.0
-   **description**: A web-based notes application with a unique real-time "Natural Language Highlighting" feature.

# stack

-   **frontend**: React
-   **backend**: Supabase
-   **language**: TypeScript

# authentication

-   **provider**: Supabase Auth
-   **methods**:
    -   Email/Password

# database

-   **provider**: Supabase DB (Postgres)
-   **schema**:
    -   **table**: `notes`
        -   `id`: UUID (Primary Key)
        -   `user_id`: UUID (Foreign Key to `auth.users`)
        -   `title`: TEXT
        -   `content`: JSONB (To store rich-text editor content, e.g., from TipTap/Editor.js)
        -   `nlh_enabled`: BOOLEAN (Per-note override for highlighting)
        -   `created_at`: TIMESTAMPZ
        -   `updated_at`: TIMESTAMPZ
    -   **table**: `user_settings`
        -   `user_id`: UUID (Primary Key, Foreign Key to `auth.users`)
        -   `nlh_global_enabled`: BOOLEAN (Default: `true`)
        -   `nlh_highlight_noun`: BOOLEAN (Default: `true`)
        -   `nlh_highlight_verb`: BOOLEAN (Default: `true`)
        -   `nlh_highlight_adverb`: BOOLEAN (Default: `true`)
        -   `nlh_highlight_adjective`: BOOLEAN (Default: `true`)
        -   `nlh_highlight_number`: BOOLEAN (Default: `true`)
        -   `nlh_highlight_proper_noun`: BOOLEAN (Default: `true`)
        -   `nlh_color_noun`: TEXT (Default: `'#28a745'`)
        -   `nlh_color_verb`: TEXT (Default: `'#ffc107'`)
        -   `nlh_color_adverb`: TEXT (Default: `'#fd7e14'`)
        -   `nlh_color_adjective`: TEXT (Default: `'#007bff'`)
        -   `nlh_color_number`: TEXT (Default: `'#dc3545'`)
        -   `nlh_color_proper_noun`: TEXT (Default: `'#6f42c1'`)

# features

-   **User Authentication**:
    -   Implement a signup page with email and password fields.
    -   Implement a login page with email and password fields.
    -   Users should remain logged in across sessions.
    -   Provide a global logout button.

-   **Main Layout**:
    -   Create a two-pane UI.
    -   The left pane must list all notes by title, sorted by `updated_at` descending.
    -   Clicking a note in the left pane opens it for editing in the right pane.
    -   A "New Note" button should exist, which creates a new note record and loads it in the editor.

-   **Rich-Text Editor**:
    -   Use a WYSIWYG editor (e.g., TipTap).
    -   The editor must support interactive checklists.
    -   The editor must allow highlighting text and embedding a hyperlink.
    -   The editor must support image embedding via both clipboard paste and a file upload button.
    -   All image uploads must be stored in Supabase Storage.
    -   All note changes must be autosaved to the database.

-   **Natural Language Highlighting (NLH)**:
    -   **Engine**: Use the `compromise.js` library exclusively on the client-side.
    -   **Activation**: Highlighting should be applied automatically as the user types, using a debounce of ~500ms to ensure performance.
    -   **Settings Panel**: Create a dedicated settings modal or page for all NLH controls.
        -   **Toggles**: The panel must contain on/off toggles for:
            -   Global NLH (affects all notes unless overridden).
            -   Each part of speech: Noun, Verb, Adverb, Adjective, Number, Proper Noun.
        -   **Color Pickers**: Next to each part-of-speech toggle, include a color input that allows the user to change its highlight color.
    -   **Per-Note Toggle**: The editor UI must include an on/off switch to enable/disable NLH for the current note, overriding the global setting.

-   **Search**:
    -   Implement a single, global search bar.
    -   The search must perform a full-text query across the `title` and `content` of all the user's notes.
    -   Display search results in a clear list. Clicking a result should navigate to that note.