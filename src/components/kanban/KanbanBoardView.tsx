import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { useKanbanBoard } from '@/hooks/useKanbanBoard';
import { Column } from './Column';
import { CreateCardModal } from './CreateCardModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader2, Clock, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ScheduleTaskModal } from './ScheduleTaskModal';
import { useScheduledTasks } from '@/hooks/useScheduledTasks';
import { useNavigate } from 'react-router-dom';
import { Card as CardType } from '@/types/kanban';

export function KanbanBoardView() {
  const navigate = useNavigate();
  const {
    boardData,
    loading,
    createColumn,
    updateColumnTitle,
    deleteColumn,
    createCard,
    deleteCard,
    updateCard,
    updatePositions,
    updateColumnPositions,
    loadBoardData,
  } = useKanbanBoard();

  const [showCreateCard, setShowCreateCard] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { createScheduledTask } = useScheduledTasks();

  // Memoize sorted cards to avoid repeated sorting
  const sortedCardsByColumn = useMemo(() => {
    if (!boardData) return new Map();
    
    const map = new Map<string, CardType[]>();
    boardData.columns.forEach(column => {
      const columnCards = boardData.cards
        .filter(card => card.column_id === column.id)
        .sort((a, b) => a.position - b.position);
      map.set(column.id, columnCards);
    });
    return map;
  }, [boardData]);

  const handleAddCard = (columnId: string) => {
    setSelectedColumnId(columnId);
    setShowCreateCard(true);
  };

  const handleCreateColumn = async () => {
    if (!newColumnTitle.trim()) return;
    
    await createColumn(newColumnTitle.trim());
    setNewColumnTitle('');
    setShowCreateColumn(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateColumn();
    } else if (e.key === 'Escape') {
      setShowCreateColumn(false);
      setNewColumnTitle('');
    }
  };

  const handleConvertToScheduledTask = async (cardId: string) => {
    // The conversion happens in the EditCardModal, we just need to refresh the board
    // to remove the converted card from the display
    window.location.reload(); // Simple refresh for now
    
    toast({
      title: 'Card Converted',
      description: 'Card has been converted to a scheduled task.',
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const startTime = performance.now();
    console.log('Drag operation started at:', startTime);

    const { destination, source, type } = result;

    console.log('Drag ended:', { destination, source, type });

    if (!destination) {
      console.log('No destination');
      return;
    }

    if (!boardData) {
      console.log('No board data, reloading...');
      await loadBoardData();
      return;
    }

    console.log('Board data cards length:', boardData.cards.length);
    console.log('Source droppableId:', source.droppableId, 'index:', source.index);
    console.log('Destination droppableId:', destination.droppableId, 'index:', destination.index);

    // Handle column reordering
    if (type === 'column') {
      if (destination.index === source.index) return;

      const newColumns = Array.from(boardData.columns);
      const [movedColumn] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, movedColumn);

      // Update positions
      const columnUpdates = newColumns.map((column, index) => ({
        id: column.id,
        position: index
      }));

      await updateColumnPositions(columnUpdates);
      return;
    }

    // Handle card reordering/moving
    if (type === 'card') {
      const sourceCards = sortedCardsByColumn.get(source.droppableId) as CardType[] || [];
      const destCards = sortedCardsByColumn.get(destination.droppableId) as CardType[] || [];

      if (!sourceCards || !destCards) {
        console.log('Source or destination cards not found, reloading data...');
        await loadBoardData();
        return;
      }

      // Same column reordering
      if (source.droppableId === destination.droppableId) {
        if (destination.index === source.index) return;

        const newCards: CardType[] = Array.from(sourceCards);
        const [movedCard] = newCards.splice(source.index, 1);
        if (!movedCard) {
          console.error('Moved card is undefined, source index:', source.index, 'source cards length:', sourceCards.length);
          await loadBoardData();
          return;
        }
        newCards.splice(destination.index, 0, movedCard);

        const updates = newCards.map((card, index) => ({
          id: card.id,
          position: index
        }));

        await updatePositions(updates, source.droppableId, source.droppableId);
      } else {
        // Moving to different column
        const sourceColumnCards = Array.from(sourceCards);
        const [movedCard] = sourceColumnCards.splice(source.index, 1);

        if (!movedCard) {
          console.error('Moved card is undefined, source index:', source.index, 'source cards length:', sourceCards.length);
          await loadBoardData();
          return;
        }

        const destColumnCards = Array.from(destCards);
        destColumnCards.splice(destination.index, 0, movedCard);

        const sourceUpdates = sourceColumnCards.map((card, index) => ({
          id: card.id,
          position: index,
        }));

        const destUpdates = destColumnCards.map((card, index) => ({
          id: card.id,
          position: index,
          // Only set column_id for the moved card
          ...(card.id === movedCard.id && { column_id: destination.droppableId })
        }));

        await updatePositions(
          [...sourceUpdates, ...destUpdates],
          source.droppableId,
          destination.droppableId
        );
      }
    }

    const endTime = performance.now();
    console.log('Drag operation completed in:', (endTime - startTime).toFixed(2), 'ms');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load board data</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{boardData.board.title}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/schedule')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            View Scheduled Tasks
          </Button>
          <Button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Schedule Task
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="column" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto pb-4"
            >
              {boardData.columns.map((column, index) => {
                const columnCards = sortedCardsByColumn.get(column.id) || [];
                return (
                  <Column
                    key={column.id}
                    column={column}
                    cards={columnCards}
                    index={index}
                    columns={boardData.columns}
                    onUpdateTitle={updateColumnTitle}
                    onDeleteColumn={deleteColumn}
                    onAddCard={handleAddCard}
                    onDeleteCard={deleteCard}
                    onUpdateCard={updateCard}
                    onConvertToScheduledTask={handleConvertToScheduledTask}
                  />
                );
              })}
              {provided.placeholder}

              {/* Add Column Button/Input */}
              <div className="w-80 flex-shrink-0">
                {showCreateColumn ? (
                  <Card>
                    <CardContent className="p-3">
                      <Input
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        onBlur={handleCreateColumn}
                        onKeyDown={handleKeyPress}
                        placeholder="Enter column title..."
                        className="mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateColumn}>
                          Add Column
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setShowCreateColumn(false);
                            setNewColumnTitle('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full h-12 border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50"
                    onClick={() => setShowCreateColumn(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <CreateCardModal
        isOpen={showCreateCard}
        onClose={() => setShowCreateCard(false)}
        columnId={selectedColumnId}
        onCardCreated={(columnId, cardData) => createCard(columnId, cardData)}
      />

      <ScheduleTaskModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        columns={boardData.columns}
        onTaskScheduled={createScheduledTask}
      />
    </div>
  );
}