# Chroma Notes 🚀

A comprehensive project management and note-taking application designed to help teams and individuals manage tasks, projects, and notes efficiently. Features rich-text editing with natural language highlighting, visual Kanban boards, and advanced task scheduling capabilities.

## ✨ Key Features

### 📝 Rich Text Notes
- **WYSIWYG Editor**: Full-featured rich text editor with support for formatting, checklists, links, and image uploads
- **Natural Language Highlighting (NLH)**: Real-time syntax highlighting for different parts of speech (nouns, verbs, adjectives, etc.) using the `compromise.js` library
- **Customizable Highlighting**: Per-note and global settings with customizable colors for each part of speech
- **Auto-save**: All changes are automatically saved to the database
- **Global Full-text Search**: Instantly search across all your notes, regardless of which project they belong to. Selecting a search result will automatically switch you to the relevant project and open the note.
- **Export Options**: Export notes in multiple formats:
  - **TXT Export**: Download notes as plain text files with all formatting stripped for compatibility
  - **PDF Export**: Generate high-quality PDF files that preserve all formatting, colors, and NLH highlighting

### 🔍 Global Search
- **Universal Search**: Comprehensive search functionality accessible from any page with `⌘K` keyboard shortcut
- **Cross-Content Search**: Search across projects, notes, and Kanban cards simultaneously with full-text search capabilities
- **Command Palette Interface**: Clean, modern search interface with grouped results and keyboard navigation
- **Intelligent Results**: Search results grouped by type (Projects, Notes, Cards) with highlighted preview snippets
- **Smart Navigation**: Automatically switches to the correct project and opens the selected content
- **Real-time Search**: Debounced input with live results and loading states
- **Performance Optimized**: PostgreSQL full-text search with GIN indexes for fast query execution

### 📋 Kanban Boards  
- **Drag & Drop Interface**: Easily move cards between columns to update their status using `react-beautiful-dnd` 🖱️
- **Real-time Updates**: Changes are reflected instantly for all users 🔄
- **Two Card Types**:
  - **Simple Cards**: Standalone tasks with rich text content
  - **Linked Cards**: Cards connected to existing notes
- **Flexible Organization**: Create custom columns and organize tasks visually
- **Task Conversion**: Convert Kanban cards into scheduled tasks 🔁
- **Column Management**: Create, update, and delete columns to customize your workflow 🗂️
- **Card Management**: Create, update, and delete cards with detailed descriptions and priorities 📝

### ⏰ Task Scheduling
- **Scheduled Tasks**: Convert cards or create new scheduled tasks with due dates and specific times 🗓️
- **Time-based Scheduling**: Set specific times for tasks to appear on your Kanban board (defaults to midnight) ⏰
- **Recurring Tasks**: Support for various recurrence patterns (daily, weekly, monthly, etc.) with customizable times
- **Task Management**: Dedicated page to view, edit, and manage all scheduled tasks with time display
- **Priority System**: Assign priorities to cards to highlight important tasks 🚩
- **Flexible Time Control**: Edit and adjust scheduled times for existing tasks
- **Timezone Awareness**: All times respect the user's current timezone settings 🌍

### 🏷️ Tagging & Organization
- **Tagging System**: Categorize cards using tags for better organization
- **Priority Management**: Organize tasks by priority levels
- **Project-specific Data**: Each project maintains its own notes, boards, and tasks

### 🏗️ Project Management
- **Multi-project Support**: Organize notes and boards into separate projects
- **Project Switching**: Easy navigation between different projects
- **Project-specific Data**: Each project maintains its own notes, boards, and tasks

### 🔐 Authentication & Security
- **Supabase Authentication**: Secure user authentication with email/password 🔒
- **User Isolation**: All data is user-specific and properly isolated
- **Session Management**: Persistent login sessions across browser restarts

### 🎨 User Experience
- **Consolidated Navigation**: Streamlined header with dropdown menu for organized access to all features
- **Clean Interface Design**: Waffle menu (⚏) consolidates actions while preserving key features like global search
- **Theming**: Customizable themes to personalize your experience
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Performance Optimized**: Fast loading and smooth interactions

## 🆕 Recent Updates

### Header UI Redesign (Latest)
- **Consolidated Actions Menu**: Replaced multiple header buttons with a clean dropdown menu using waffle icon (⚏)
- **Preserved Global Search**: Maintained prominent global search button with `⌘K` shortcut as top-level element
- **Organized Navigation**: Grouped actions into logical sections (Navigation, Settings, Account) with clear icons
- **Improved Visual Density**: Reduced header clutter while maintaining all functionality
- **Enhanced Accessibility**: Better organization and screen reader support for all menu items

### Global Search Feature
- **Universal Access**: New search button in header accessible from any page
- **Keyboard Shortcuts**: Press `⌘K` (Cmd+K) to instantly open the search interface
- **Cross-Platform Search**: Search across all projects, notes, and Kanban cards simultaneously
- **Command Palette UI**: Clean, modern interface with grouped results and keyboard navigation
- **Highlighted Previews**: Search terms are highlighted in result snippets for quick scanning
- **Smart Navigation**: Clicking results automatically switches projects and opens the correct content
- **Performance Optimized**: Uses PostgreSQL full-text search with GIN indexes for fast results

### Time-Based Task Scheduling
- **Custom Time Setting**: Set specific times for when scheduled tasks should appear on your Kanban board
- **Midnight Default**: All new and existing scheduled tasks default to midnight (00:00) for consistent behavior
- **Time Display**: View scheduled times in HH:MM format on the scheduled tasks page
- **Time Editing**: Edit and adjust times for existing scheduled tasks
- **Comprehensive Coverage**: Time selection available in all scheduling interfaces (card conversion, new task creation, scheduled task editing)
- **User Timezone Support**: All times respect the user's current timezone

### Enhanced Timezone Support (Latest)
- **Automatic Detection**: Browser timezone is automatically detected when converting cards to scheduled tasks
- **IANA Timezone Standards**: Uses standard timezone identifiers (e.g., 'America/New_York', 'Europe/London')
- **Robust Fallback**: Gracefully falls back to UTC if timezone detection fails
- **Database Integration**: Scheduled timestamps stored as timezone-aware values in UTC for consistency
- **No Configuration Required**: Works seamlessly without user setup or timezone selection

## 🛠️ Technology Stack

- **Frontend:**
  - React 18 with TypeScript
  - React Router DOM (v6)
  - React Query (@tanstack/react-query) for state management
  - React Beautiful DnD for drag-and-drop functionality
  - Radix UI (shadcn/ui components) with Tailwind CSS
  - Lucide React for icons
  - Sonner & React Hot Toast for notifications
- **Backend:**
  - Supabase (PostgreSQL database + Auth + Storage)
  - PostgreSQL with real-time subscriptions
- **Build Tool:**
  - Vite for fast development and building
- **Rich Text & NLP:**
  - Custom contentEditable implementation for rich text editing
  - compromise.js for natural language analysis and highlighting
- **Other Libraries:**
  - date-fns for date manipulation
  - Tailwind CSS for styling
  - TypeScript for type safety

## 📦 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- Node.js (>=18) - recommended version via [nvm](https://github.com/nvm-sh/nvm)
- npm or bun package manager
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chroma-parse-notes
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   - Create a `.env` file in the root directory
   - Set up your Supabase project and add your credentials:
   ```env
   VITE_SUPABASE_URL=<your_supabase_url>
   VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
   ```

4. **Database Setup**
   - Run the SQL migrations located in the `supabase/migrations` directory against your Supabase database
   ```bash
   # Example using the Supabase CLI (if installed)
   supabase db push
   ```

5. **Start development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173` to view the application

## 📂 Project Structure

```
├── supabase/               # Supabase related files
│   ├── migrations/         # SQL migration scripts
│   │   ├── 20250824120000_add_scheduling_to_cards.sql
│   │   ├── 20250827000001_upgrade_process_scheduled_tasks.sql
│   │   ├── 20250831000000_add_priority_and_tagging_system.sql
│   │   ├── 20250901000000_add_convert_card_to_scheduled_task.sql
│   │   ├── 20251018000000_add_scheduled_time_to_tasks.sql
│   │   └── 20251018000001_add_global_search_function.sql
│   └── config.toml        # Supabase configuration
├── src/                    # Source code
│   ├── components/         # React components
│   │   ├── kanban/         # Kanban specific components
│   │   │   ├── KanbanBoardView.tsx   # Main kanban board container
│   │   │   ├── Card.tsx              # Individual card component
│   │   │   ├── Column.tsx            # Column component
│   │   │   ├── CreateCardModal.tsx   # Card creation modal
│   │   │   ├── EditCardModal.tsx     # Card editing modal
│   │   │   └── ScheduleTaskModal.tsx # Task scheduling modal
│   │   ├── ui/             # shadcn/ui components
│   │   ├── AppHeader.tsx             # Header with consolidated dropdown menu navigation
│   │   ├── RichTextEditor.tsx        # Custom rich text editor
│   │   ├── NLHHighlighter.tsx        # Natural language highlighter
│   │   ├── SchedulingOptions.tsx     # Task scheduling options with time picker
│   │   ├── EditScheduledTaskModal.tsx # Scheduled task editor with time control
│   │   ├── TagInput.tsx              # Tag input component
│   │   └── SettingsDialog.tsx        # Settings configuration
│   ├── hooks/              # Custom React hooks
│   │   ├── useKanbanBoard.tsx        # Kanban board state management
│   │   ├── useScheduledTasks.tsx     # Scheduled tasks management
│   │   ├── useNotes.tsx              # Notes management
│   │   ├── useProject.tsx            # Project management
│   │   ├── useTags.tsx               # Tags management
│   │   ├── useGlobalSearch.tsx       # Global search functionality
│   │   ├── use-debounce.tsx          # Debouncing utility hook
│   │   └── useNLHSettings.tsx        # NLH settings management
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx             # Main notes interface
│   │   ├── KanbanBoard.tsx           # Kanban board page
│   │   ├── ScheduledTasks.tsx        # Scheduled tasks page
│   │   ├── ProjectManagement.tsx     # Project management page
│   │   └── Auth.tsx                  # Authentication page
│   ├── types/              # TypeScript type definitions
│   │   ├── note.ts                   # Note and NLH types
│   │   ├── kanban.ts                 # Kanban board types
│   │   ├── scheduled-task.ts         # Scheduled task types
│   │   └── project.ts                # Project types
│   ├── lib/                # Utility functions
│   │   ├── utils.ts                  # General utilities
│   │   └── recurrence-utils.ts       # Recurrence pattern utilities
│   ├── integrations/       # External service integrations
│   │   └── supabase/       # Supabase client configuration
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point for React application
│   └── index.css           # Global CSS styles
├── vite.config.ts          # Vite configuration file
├── tsconfig.json           # TypeScript configuration file
├── tailwind.config.ts      # Tailwind CSS configuration
├── package.json            # Project dependencies and scripts
└── README.md               # This file
```

## 🔑 Key Components

- **Dashboard**: Main notes interface with list and editor featuring Natural Language Highlighting
- **Kanban Board**: Visual task management with drag-and-drop functionality and real-time updates
- **Scheduled Tasks**: Advanced task scheduling and management with recurring patterns and customizable times
- **Global Search**: Universal search interface accessible via header button or `⌘K` shortcut with cross-content search capabilities
- **Project Management**: Multi-project organization and switching accessible via dropdown menu
- **Settings**: User preferences and NLH customization with color pickers accessible via dropdown menu
- **Rich Text Editor**: Custom contentEditable implementation with formatting tools
- **Natural Language Highlighter**: Real-time part-of-speech highlighting using compromise.js
- **Time Scheduler**: Comprehensive time-based task scheduling with timezone support

## 📊 Database Schema

The application uses Supabase PostgreSQL with the following main tables:

- **`notes`** - Rich text notes with NLH settings and project association
- **`projects`** - Project organization and user workspace management
- **`boards`** - Kanban boards linked to projects
- **`columns`** - Board columns with positioning and titles
- **`cards`** - Kanban cards (simple and linked) with scheduling, priority, and tagging
- **`scheduled_tasks`** - Task scheduling with recurrence patterns, activation tracking, and time-based scheduling
- **`user_settings`** - User preferences and NLH configuration settings
- **`tags`** - Tagging system for better organization

### Key Database Features:
- **Real-time subscriptions** for live updates across users
- **RLS (Row Level Security)** for user data isolation
- **Stored procedures** for complex operations like task scheduling and global search
- **Full-text search** capabilities with GIN indexes for optimal performance across notes, projects, and cards
- **Search ranking** using PostgreSQL's ts_rank for relevance-based result ordering

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature or bug fix (`git checkout -b feature/amazing-feature`)
3. Make your changes and commit them with descriptive messages (`git commit -m 'Add amazing feature'`)
4. Push your changes to your fork (`git push origin feature/amazing-feature`)
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices and maintain type safety
- Use the existing UI component library (shadcn/ui) for consistency
- Write clear, descriptive commit messages
- Test your changes thoroughly before submitting
- Update documentation as needed

## 📝 License

This project is available under the MIT License.

## 📬 Contact

If you have any questions or suggestions, feel free to open an issue or reach out through the repository.

## 💖 Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Natural language processing powered by [compromise.js](https://github.com/spencermountain/compromise)
- Database and authentication by [Supabase](https://supabase.com/)
- Drag and drop functionality by [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd)

---

Thank you for checking out Chroma Notes! We hope it helps you manage your tasks and projects more effectively. ✨
