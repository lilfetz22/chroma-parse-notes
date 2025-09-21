import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tag } from '@/types/kanban';
import { useAuth } from './useAuth';
import { toast } from './use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

const TAGS_QUERY_KEY = 'tags';

export function useTags() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tags using React Query for better caching and state management
  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: [TAGS_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user, // Only run the query if the user is available
  });

  // Mutation for creating a tag
  const { mutate: createTag } = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('tags')
        .insert({ name, color, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_QUERY_KEY, user?.id] });
      toast({ title: 'Tag created successfully' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error creating tag',
        description: error.message,
      });
    },
  });

  // Mutation for updating a tag
  const { mutate: updateTag } = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_QUERY_KEY, user?.id] });
      toast({ title: 'Tag updated successfully' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error updating tag',
        description: error.message,
      });
    },
  });

  // Mutation for deleting a tag
  const { mutate: deleteTag } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAGS_QUERY_KEY, user?.id] });
      toast({ title: 'Tag deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting tag',
        description: error.message,
      });
    },
  });

  return {
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
}