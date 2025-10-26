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

  console.log('[GlobalSearch] Hook called with searchTerm:', searchTerm, 'debouncedSearchTerm:', debouncedSearchTerm);
  console.log('[GlobalSearch] User authenticated:', !!user, 'user ID:', user?.id);
  console.log('[GlobalSearch] Supabase client available:', !!supabase);

  const {
    data: results = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['globalSearch', debouncedSearchTerm],
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      console.log('[GlobalSearch] Query function executing for term:', debouncedSearchTerm);

      if (!user) {
        console.warn('[GlobalSearch] No authenticated user, returning empty results');
        return [];
      }

      if (!debouncedSearchTerm.trim()) {
        console.log('[GlobalSearch] Empty search term, returning empty results');
        return [];
      }

      const trimmedTerm = debouncedSearchTerm.trim();
      console.log('[GlobalSearch] Searching for:', trimmedTerm);
      console.log('[GlobalSearch] Calling supabase.rpc with user ID:', user.id);

      const { data, error } = await supabase.rpc('global_search', {
        search_term: trimmedTerm,
      });

      console.log('[GlobalSearch] RPC call completed');
      console.log('[GlobalSearch] Error from RPC:', error);
      console.log('[GlobalSearch] Raw data received:', data);
      console.log('[GlobalSearch] Data type:', typeof data, 'Is array:', Array.isArray(data));
      console.log('[GlobalSearch] Data length:', data?.length);

      if (error) {
        console.error('[GlobalSearch] RPC Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Search failed: ${error.message}`);
      }

      if (!data) {
        console.warn('[GlobalSearch] No data returned from RPC call');
        return [];
      }

      // Data is now returned as a proper array of objects
      // After regenerating types, this will be properly typed
      const results = (data || []) as unknown as GlobalSearchResult[];
      console.log('[GlobalSearch] Parsed results count:', results.length);
      console.log('[GlobalSearch] First result sample:', results[0]);
      console.log('[GlobalSearch] All result IDs:', results.map(r => ({ id: r.id, type: r.type, title: r.title })));

      return results;
    },
    enabled: !!user && !!debouncedSearchTerm.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  console.log('[GlobalSearch] Query state - isLoading:', isLoading, 'hasError:', !!error, 'resultsCount:', results.length);

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