import React from 'react';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';

export function KanbanBoard() {
  return (
    <div className="container mx-auto px-4 py-6 h-screen">
      <KanbanBoardView />
    </div>
  );
}