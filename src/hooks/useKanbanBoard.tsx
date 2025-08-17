import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { BoardData, Column, Card } from '@/types/kanban';

export function useKanbanBoard() {
  const { user } = useAuth();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load board data
  const loadBoardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_board_details');
      
      if (error) throw error;
      
      setBoardData(data as unknown as BoardData);
    } catch (error) {
      console.error('Error loading board data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load board data."
      });
    } finally {
      setLoading(false);
    }
  };

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
  }) => {
    if (!boardData) return;

    const columnCards = boardData.cards.filter(card => card.column_id === columnId);
    const newPosition = Math.max(...columnCards.map(c => c.position), -1) + 1;

    try {
      const { data, error } = await supabase
        .from('cards')
        .insert({
          column_id: columnId,
          position: newPosition,
          ...cardData
        })
        .select()
        .single();

      if (error) throw error;

      setBoardData(prev => prev ? {
        ...prev,
        cards: [...prev.cards, data].sort((a, b) => a.position - b.position)
      } : null);

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
      for (const update of updates) {
        const updateData: any = { position: update.position };
        if (update.column_id) {
          updateData.column_id = update.column_id;
        }

        const { error } = await supabase
          .from('cards')
          .update(updateData)
          .eq('id', update.id);

        if (error) throw error;
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
    if (user) {
      loadBoardData();
    }
  }, [user]);

  return {
    boardData,
    loading,
    loadBoardData,
    createColumn,
    updateColumnTitle,
    deleteColumn,
    createCard,
    deleteCard,
    updatePositions,
    updateColumnPositions
  };
}