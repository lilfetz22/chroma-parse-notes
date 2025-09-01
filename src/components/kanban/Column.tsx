import React, { useState } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { Column as ColumnType, Card as CardType } from '@/types/kanban';
import { Card } from './Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card as UICard, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
  index: number;
  onUpdateTitle: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddCard: (columnId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onUpdateCard?: (cardId: string, updates: Partial<CardType>) => void;
  onConvertToScheduledTask?: (cardId: string) => void;
}

export function Column({ 
  column, 
  cards, 
  index, 
  onUpdateTitle, 
  onDeleteColumn, 
  onAddCard,
  onDeleteCard,
  onUpdateCard,
  onConvertToScheduledTask
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateTitle(column.id, editTitle.trim());
    }
    setIsEditing(false);
    setEditTitle(column.title);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(column.title);
    }
  };

  return (
    <Draggable draggableId={`column-${column.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`w-80 flex-shrink-0 ${snapshot.isDragging ? 'opacity-50' : ''}`}
        >
          <UICard className="h-full bg-muted/30">
            <CardHeader 
              {...provided.dragHandleProps}
              className="pb-3 group"
            >
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={handleKeyPress}
                    className="h-8 text-sm font-medium"
                    autoFocus
                  />
                ) : (
                  <h3 className="font-medium text-sm">{column.title}</h3>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-md">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-3 h-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDeleteColumn(column.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete Column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
              <Droppable droppableId={column.id} type="card">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[100px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : ''
                    }`}
                  >
                    {cards.map((card, index) => (
                      <div key={card.id} className="group">
                        <Card 
                          card={card} 
                          index={index} 
                          onDelete={onDeleteCard}
                          onUpdate={onUpdateCard}
                          onConvertToScheduledTask={onConvertToScheduledTask}
                        />
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
                onClick={() => onAddCard(column.id)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add a card
              </Button>
            </CardContent>
          </UICard>
        </div>
      )}
    </Draggable>
  );
}