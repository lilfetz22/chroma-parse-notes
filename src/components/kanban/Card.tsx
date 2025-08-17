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

interface CardProps {
  card: CardType;
  index: number;
  onDelete: (cardId: string) => void;
}

export function Card({ card, index, onDelete }: CardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (card.card_type === 'linked' && card.note_id) {
      navigate('/', { state: { selectedNoteId: card.note_id } });
    }
    // For simple cards, we could open a modal here in the future
  };

  const getContentPreview = () => {
    if (card.card_type === 'linked') {
      return (
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Linked Note
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
                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                  {card.title}
                </h4>
                {getContentPreview()}
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
  );
}