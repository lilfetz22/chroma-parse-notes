import React from 'react';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';
import { AppHeader } from '@/components/AppHeader';

export function KanbanBoard() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 flex-1">
        <KanbanBoardView />
      </main>
    </div>
  );
}