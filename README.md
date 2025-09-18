# Chroma Notes

A comprehensive project management and note-taking application featuring rich-text editing, natural language highlighting, Kanban boards, and task scheduling capabilities.

## Features

### 📝 Rich Text Notes
- **WYSIWYG Editor**: Full-featured rich text editor with support for formatting, checklists, links, and image uploads
- **Natural Language Highlighting (NLH)**: Real-time syntax highlighting for different parts of speech (nouns, verbs, adjectives, etc.) using the `compromise.js` library
- **Customizable Highlighting**: Per-note and global settings with customizable colors for each part of speech
- **Auto-save**: All changes are automatically saved to the database
- **Full-text Search**: Search across all note titles and content

### 📋 Kanban Boards  
- **Drag & Drop Interface**: Reorder cards and columns with smooth drag-and-drop functionality using `react-beautiful-dnd`
- **Two Card Types**:
  - **Simple Cards**: Standalone tasks with rich text content
  - **Linked Cards**: Cards connected to existing notes
- **Flexible Organization**: Create custom columns and organize tasks visually
- **Task Conversion**: Convert Kanban cards into scheduled tasks

### ⏰ Task Scheduling
- **Scheduled Tasks**: Convert cards or create new scheduled tasks with due dates
- **Recurring Tasks**: Support for various recurrence patterns (daily, weekly, monthly, etc.)
- **Task Management**: Dedicated page to view, edit, and manage all scheduled tasks
- **Priority System**: Organize tasks by priority levels

### 🏗️ Project Management
- **Multi-project Support**: Organize notes and boards into separate projects
- **Project Switching**: Easy navigation between different projects
- **Project-specific Data**: Each project maintains its own notes, boards, and tasks

### 🔐 Authentication & Security
- **Supabase Authentication**: Secure user authentication with email/password
- **User Isolation**: All data is user-specific and properly isolated
- **Session Management**: Persistent login sessions across browser restarts

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL database + Auth + Storage)
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Drag & Drop**: react-beautiful-dnd
- **Rich Text**: TipTap editor
- **NLP Processing**: compromise.js for natural language analysis
- **Routing**: React Router v6
- **State Management**: React Query + Custom hooks

## Getting Started

### Prerequisites
- Node.js (recommended version via [nvm](https://github.com/nvm-sh/nvm))
- npm or bun package manager

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
   - Set up your Supabase project
   - Configure environment variables for Supabase connection
   - Run database migrations from the `supabase/migrations` folder

4. **Start development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` to view the application

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── kanban/         # Kanban board specific components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── types/              # TypeScript type definitions
├── lib/                # Utility functions
└── integrations/       # External service integrations
    └── supabase/       # Supabase client configuration
```

## Key Components

- **Dashboard**: Main notes interface with list and editor
- **Kanban Board**: Visual task management with drag-and-drop
- **Scheduled Tasks**: Task scheduling and management
- **Project Management**: Multi-project organization
- **Settings**: User preferences and NLH customization

## Database Schema

The application uses Supabase with the following main tables:
- `notes` - Rich text notes with NLH settings
- `projects` - Project organization
- `boards` - Kanban boards
- `columns` - Board columns
- `cards` - Kanban cards (simple and linked)
- `scheduled_tasks` - Task scheduling with recurrence
- `user_settings` - User preferences and NLH configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is available under the MIT License.
