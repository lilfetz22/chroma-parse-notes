import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import { toast } from '@/hooks/use-toast';
import { BoardData, Column, Card } from '@/types/kanban';

export function useKanbanBoard() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBoardData = useCallback(async () => {
    if (!user || !activeProject) {
      setLoading(false);
      setBoardData(null);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_board_details', { project_id_param: activeProject.id });

      if (error) throw error;
      
      const board = data as unknown as BoardData;

      setBoardData(board);
    } catch (error: any) {
      console.error('Error loading board data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading board',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user, activeProject]);

  // Create a new column
  const createColumn = async (title: string) => {
    if (!boardData) return;

    const newPosition = Math.max(...boardData.columns.map(c => c.position), -1) + 1;

    try {
      const { data, error } = await supabase
        .from('columns')
        .insert({
          board_id: boardData.board.id,
          title,
          position: newPosition
        })
        .select()
        .single();

      if (error) throw error;

      setBoardData(prev => prev ? {
        ...prev,
        columns: [...prev.columns, data].sort((a, b) => a.position - b.position)
      } : null);

      toast({ title: "Column created successfully" });
    } catch (error) {
      console.error('Error creating column:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create column."
      });
    }
  };

  // Update column title
  const updateColumnTitle = async (columnId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('columns')
        .update({ title })
        .eq('id', columnId);

      if (error) throw error;

      setBoardData(prev => prev ? {
        ...prev,
        columns: prev.columns.map(col => 
          col.id === columnId ? { ...col, title } : col
        )
      } : null);
    } catch (error) {
      console.error('Error updating column:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update column."
      });
    }
  };

  // Delete column
  const deleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      setBoardData(prev => prev ? {
        ...prev,
        columns: prev.columns.filter(col => col.id !== columnId),
        cards: prev.cards.filter(card => card.column_id !== columnId)
      } : null);

      toast({ title: "Column deleted successfully" });
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete column."
      });
    }
  };

  // Create a new card
  const createCard = async (columnId: string, cardData: {
    card_type: 'simple' | 'linked';
    title: string;
    content?: any;
    note_id?: string;
    summary?: string | null;
    priority?: number;
    tag_ids?: string[];
    scheduled_at?: string | null;
    recurrence?: string | null;
  }) => {
    if (!boardData) return;

    const columnCards = boardData.cards.filter(card => card.column_id === columnId);
    const newPosition = Math.max(...columnCards.map(c => c.position), -1) + 1;

    try {
      // Extract tag_ids to handle separately
      const { tag_ids, ...cardInsertData } = cardData;
      
      const { data, error } = await supabase
        .from('cards')
        .insert({
          column_id: columnId,
          position: newPosition,
          priority: cardData.priority || 0,
          ...cardInsertData
        })
        .select()
        .single();

      if (error) throw error;

      // If tags are provided, create card_tags entries
      if (tag_ids && tag_ids.length > 0) {
        const cardTagInserts = tag_ids.map(tagId => ({
          card_id: data.id,
          tag_id: tagId
        }));

        const { error: tagsError } = await supabase
          .from('card_tags')
          .insert(cardTagInserts);

        if (tagsError) {
          console.error('Error creating card tags:', tagsError);
          // Continue anyway - the card was created successfully
        }
      }

      // Reload the board data to get updated tags
      await loadBoardData();

      toast({ title: "Card created successfully" });
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create card."
      });
    }
  };

  // Delete card
  const deleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      setBoardData(prev => prev ? {
        ...prev,
        cards: prev.cards.filter(card => card.id !== cardId)
      } : null);

      toast({ title: "Card deleted successfully" });
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete card."
      });
    }
  };

  // Update card (title/summary/content)
  const updateCard = async (cardId: string, updates: Partial<Card> & { tag_ids?: string[] }) => {
    try {
      // Extract tag_ids to handle separately
      const { tag_ids, tags, ...cardUpdates } = updates;
      
      const { data, error } = await supabase
        .from('cards')
        .update(cardUpdates)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      // Handle tag updates if provided
      if (tag_ids !== undefined) {
        // First, delete all existing tags for this card
        await supabase
          .from('card_tags')
          .delete()
          .eq('card_id', cardId);

        // Then, insert the new tags
        if (tag_ids.length > 0) {
          const cardTagInserts = tag_ids.map(tagId => ({
            card_id: cardId,
            tag_id: tagId
          }));

          const { error: tagsError } = await supabase
            .from('card_tags')
            .insert(cardTagInserts);

          if (tagsError) {
            console.error('Error updating card tags:', tagsError);
          }
        }
        
        // Reload the board data to get updated tags
        await loadBoardData();
      } else {
        // Update local state if not dealing with tags
        // Refresh board data to get updated card with tags
        await loadBoardData();
      }

      toast({ title: 'Card updated' });
    } catch (error) {
      console.error('Error updating card:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update card.' });
    }
  };

  // Update positions after drag and drop
  const updatePositions = async (updates: Array<{ id: string; position: number; column_id?: string }>) => {
    try {
      // Optimistically update the state first
      setBoardData(prev => {
        if (!prev) return null;

        const updatedCards = prev.cards.map(card => {
          const update = updates.find(u => u.id === card.id);
          if (update) {
            return {
              ...card,
              position: update.position,
              column_id: update.column_id || card.column_id
            };
          }
          return card;
        });

        return {
          ...prev,
          cards: updatedCards.sort((a, b) => a.position - b.position)
        };
      });

      // Update in database
      // helper to compute next scheduled date based on recurrence
      const computeNextScheduled = (recurrence: string | null | undefined, fromIso: string) => {
        if (!recurrence) return null;
        const from = new Date(fromIso);
        let next = new Date(from);
        switch (recurrence) {
          case 'daily':
            next.setDate(next.getDate() + 1);
            break;
          case 'weekdays':
            // advance until weekday Mon-Fri
            do { next.setDate(next.getDate() + 1); } while (next.getDay() === 0 || next.getDay() === 6);
            break;
          case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
          case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
          case 'monthly':
            // increment month, keep date where possible
            const month = next.getMonth();
            next.setMonth(month + 1);
            break;
          default:
            return null;
        }
        return next.toISOString();
      };

      for (const update of updates) {
        const updateData: any = { position: update.position };
        if (update.column_id) {
          updateData.column_id = update.column_id;
        }

        // If the card is moved into a "Done/Completed" column, set completed_at; if moved out, clear completed_at
        if (update.column_id && boardData) {
          // allow some flexibility in matching the done column title (e.g. "Done", "Completed", "Done ✅")
          const doneColumn = boardData.columns.find(col => {
            const t = (col.title || '').toLowerCase();
            return t === 'done' || t.includes('done') || t.includes('complete');
          });

          if (doneColumn && update.column_id === doneColumn.id) {
            updateData.completed_at = new Date().toISOString();
          } else {
            // If moving out of Done, clear completed_at
            const cardBefore = boardData.cards.find(c => c.id === update.id);
            if (cardBefore && cardBefore.column_id === doneColumn?.id) {
              updateData.completed_at = null;
            }
          }
        }

        const { error } = await supabase
          .from('cards')
          .update(updateData)
          .eq('id', update.id);

        if (error) throw error;

        // Note: Recurrence logic handled by scheduled_tasks table now
      }
    } catch (error) {
      console.error('Error updating positions:', error);
      // Reload data on error to revert optimistic update
      loadBoardData();
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update card positions."
      });
    }
  };

  // Update column positions
  const updateColumnPositions = async (columnUpdates: Array<{ id: string; position: number }>) => {
    try {
      // Optimistically update the state first
      setBoardData(prev => {
        if (!prev) return null;

        const updatedColumns = prev.columns.map(column => {
          const update = columnUpdates.find(u => u.id === column.id);
          return update ? { ...column, position: update.position } : column;
        });

        return {
          ...prev,
          columns: updatedColumns.sort((a, b) => a.position - b.position)
        };
      });

      // Update in database
      for (const update of columnUpdates) {
        const { error } = await supabase
          .from('columns')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating column positions:', error);
      // Reload data on error to revert optimistic update
      loadBoardData();
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update column positions."
      });
    }
  };

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  return {
    boardData,
    loading,
    loadBoardData,
    createColumn,
    updateColumnTitle,
    deleteColumn,
    createCard,
    deleteCard,
  updateCard,
    updatePositions,
    updateColumnPositions
  };
}