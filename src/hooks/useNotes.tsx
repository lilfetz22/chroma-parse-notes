import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Note } from '@/types/note';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching notes",
        description: error.message,
      });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const createNote = async () => {
    if (!user) return null;

    const newNote = {
      user_id: user.id,
      title: 'Untitled Note',
      content: '',
      nlh_enabled: true,
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(newNote)
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating note",
        description: error.message,
      });
      return null;
    }

    setNotes(prev => [data, ...prev]);
    return data;
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating note",
        description: error.message,
      });
    } else {
      setNotes(prev => prev.map(note => 
        note.id === id ? { ...note, ...updates } : note
      ));
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting note",
        description: error.message,
      });
    } else {
      setNotes(prev => prev.filter(note => note.id !== id));
    }
  };

  const searchNotes = async (query: string) => {
    if (!user || !query.trim()) {
      return notes;
    }

    const { data, error } = await supabase
      .rpc('search_notes', { search_term: query })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error searching notes",
        description: error.message,
      });
      return [];
    }

    return data || [];
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    refetch: fetchNotes,
  };
}