import React, { useState, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card as CardType } from '@/types/kanban';
import { Card as UICard, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { EditCardModal } from '../EditCardModal';

interface CardProps {
  card: CardType;
  index: number;
  onDelete: (cardId: string) => void;
  onUpdate?: (cardId: string, updates: Partial<CardType>) => void;
  onConvertToScheduledTask?: (cardId: string) => void;
}

export function Card({ card, index, onDelete, onUpdate, onConvertToScheduledTask }: CardProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [currentCard, setCurrentCard] = useState<CardType | null>(card);

  useEffect(() => {
    setCurrentCard(card);
  }, [card]);

  const getPriorityBorderClass = () => {
    switch (card.priority) {
      case 1: return 'border-l-4'; // Low - green border will be applied via style
      case 2: return 'border-l-4'; // Medium - yellow border will be applied via style
      case 3: return 'border-l-4'; // High - red border will be applied via style
      default: return ''; // Default (no border)
    }
  };

  const getPriorityBorderStyle = () => {
    switch (card.priority) {
      case 1: return { borderLeftColor: 'hsl(142 76% 36%)' }; // Low - green
      case 2: return { borderLeftColor: 'hsl(48 96% 53%)' }; // Medium - yellow  
      case 3: return { borderLeftColor: 'hsl(0 84% 60%)' }; // High - red
      default: return {}; // Default (no border)
    }
  };

  const getPriorityBackgroundClass = () => {
    switch (card.priority) {
      case 1: return ''; // Low - just border
      case 2: return ''; // Medium - just border
      case 3: return ''; // High - just border
      default: return '';
    }
  };

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
          } ${getPriorityBorderClass()} ${getPriorityBackgroundClass()}`}
          style={getPriorityBorderStyle()}
          onClick={handleCardClick}
        >
          <CardContent className="p-3 select-auto">
            <div className="flex items-start justify-between gap-2 group">
              <div className="flex-1 min-w-0 select-text">
                <h4 className="font-medium text-sm line-clamp-2 mb-1 flex items-center gap-2 select-text">
                  {card.title}
                  {card.card_type === 'linked' && (
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  )}
                </h4>
                {card.completed_at && (
                  <span className="text-xs text-destructive ml-2 font-medium">
                    Completed: {new Date(card.completed_at).toLocaleDateString()}
                  </span>
                )}
                <div className="select-text">
                  {getContentPreview()}
                </div>
                
                {/* Tags Display */}
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {card.tags.map(tag => (
                      <Badge 
                        key={tag.id} 
                        variant="secondary" 
                        className={`${tag.color} text-white text-xs px-1.5 py-0.5`}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {card.scheduled_at && (
                  <div className="text-xs text-muted-foreground mt-2 select-text">
                    Scheduled: {new Date(card.scheduled_at).toLocaleString()}
                    {card.recurrence ? ` • ${card.recurrence}` : ''}
                  </div>
                )}
                {card.activated_at && (
                  <div className="text-xs text-muted-foreground mt-1 select-text">
                    Created On: {new Date(card.activated_at).toLocaleDateString()}
                  </div>
                )}
                {/* completed_at now shown inline with the title */}
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
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(true);
                    }}
                  >
                    <Edit3 className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
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
        <EditCardModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          card={currentCard}
          onSave={(cardId, updates) => {
            setCurrentCard(prev => prev ? { ...prev, ...updates } : null);
            setEditing(false);
            if (typeof onUpdate === 'function') {
              onUpdate(cardId, updates);
            }
          }}
          onConvertToScheduledTask={(cardId) => {
            setEditing(false);
            if (typeof onConvertToScheduledTask === 'function') {
              onConvertToScheduledTask(cardId);
            }
          }}
        />
      )}
    </>
  );
}