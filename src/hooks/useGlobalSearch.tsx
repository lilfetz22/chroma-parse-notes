import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './use-debounce';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GlobalSearchResult {
  id: string;
  type: 'project' | 'note' | 'card';
  title: string;
  preview: string;
  project_id: string | null;
  project_title: string;
  updated_at: string;
  rank?: number;
}

export function useGlobalSearch(searchTerm: string) {
  const { user } = useAuth();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
    data: results = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['globalSearch', debouncedSearchTerm],
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      if (!user || !debouncedSearchTerm.trim()) {
        return [];
      }

      const { data, error } = await supabase.rpc('global_search', {
        search_term: debouncedSearchTerm.trim(),
      });

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      // Parse the JSON results and type cast
      return (data || []).map((item: unknown) => item as GlobalSearchResult);
    },
    enabled: !!user && !!debouncedSearchTerm.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    results,
    isLoading,
    error,
    refetch,
  };
}