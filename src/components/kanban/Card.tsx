import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card as CardType } from '@/types/kanban';
import { Card as UICard, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, ExternalLink, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { EditLinkedCardModal } from './EditLinkedCardModal';
import { Edit3 } from 'lucide-react';

interface CardProps {
  card: CardType;
  index: number;
  onDelete: (cardId: string) => void;
  onUpdate?: (cardId: string, updates: Partial<CardType>) => void;
}

export function Card({ card, index, onDelete, onUpdate }: CardProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [currentCard, setCurrentCard] = useState<CardType | null>(card);

  const handleCardClick = () => {
    if (card.card_type === 'linked' && card.note_id) {
      navigate('/', { state: { selectedNoteId: card.note_id } });
    }
    // For simple cards, we could open a modal here in the future
  };

  const getContentPreview = () => {
    if (card.card_type === 'linked') {
      return (
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ExternalLink className="w-3 h-3" />
            <span className="text-xs">Linked Note</span>
          </div>
          {card.summary ? (
            <div className="text-sm text-muted-foreground line-clamp-3">{card.summary}</div>
          ) : null}
        </div>
      );
    }
    
    if (card.content) {
      // Extract text from JSONB content if it's a rich text structure
      const textContent = typeof card.content === 'string' 
        ? card.content 
        : JSON.stringify(card.content);
      
      return (
        <div className="text-sm text-muted-foreground line-clamp-3">
          {textContent.slice(0, 100)}...
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <UICard
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 cursor-pointer transition-shadow hover:shadow-md ${
            snapshot.isDragging ? 'shadow-lg' : ''
          }`}
          onClick={handleCardClick}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2 mb-1 flex items-center gap-2">
                  {card.title}
                  {card.card_type === 'linked' && (
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  )}
                </h4>
                  {getContentPreview()}
                  {card.scheduled_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Scheduled: {new Date(card.scheduled_at).toLocaleString()}
                      {card.recurrence ? ` • ${card.recurrence}` : ''}
                    </div>
                  )}
                  {card.activated_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Created On: {new Date(card.activated_at).toLocaleDateString()}
                    </div>
                  )}
                  {card.completed_at && (
                    <div className="text-xs text-destructive mt-1">
                      Completed: {new Date(card.completed_at).toLocaleDateString()}
                    </div>
                  )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border shadow-md">
                  {card.card_type === 'linked' && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                      }}
                    >
                      <Edit3 className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(card.id);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </UICard>
      )}
    </Draggable>
      {editing && currentCard && (
      <EditLinkedCardModal
        isOpen={editing}
        onClose={() => setEditing(false)}
        card={currentCard}
        onSaved={(updated) => {
          setCurrentCard(updated);
          setEditing(false);
          if (typeof onUpdate === 'function') {
            onUpdate(updated.id, { title: updated.title, summary: updated.summary });
          }
        }}
      />
    )}
    </>
  );
}