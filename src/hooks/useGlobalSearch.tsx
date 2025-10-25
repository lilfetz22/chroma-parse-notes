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

      console.log('[GlobalSearch] Searching for:', debouncedSearchTerm.trim());

      const { data, error } = await supabase.rpc('global_search', {
        search_term: debouncedSearchTerm.trim(),
      });

      if (error) {
        console.error('[GlobalSearch] RPC Error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      console.log('[GlobalSearch] Raw data received:', data);
      console.log('[GlobalSearch] Data type:', typeof data, 'Is array:', Array.isArray(data));

      // Data is now returned as a proper array of objects
      // After regenerating types, this will be properly typed
      const results = (data || []) as unknown as GlobalSearchResult[];
      console.log('[GlobalSearch] Parsed results:', results);
      
      return results;
    },
    enabled: !!user && !!debouncedSearchTerm.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Log error if present
  if (error) {
    console.error('[GlobalSearch] Query error:', error);
  }

  return {
    results,
    isLoading,
    error,
    refetch,
  };
}