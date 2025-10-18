import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export function useUserSettings() {
  const { user } = useAuth();
  const [isOnVacation, setIsOnVacation] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('is_on_vacation')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no row exists, Supabase returns an error. We should handle this gracefully
        // by creating a settings row for the user.
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id, is_on_vacation: false })
            .select('is_on_vacation')
            .single();

          if (insertError) {
            throw insertError;
          }
          setIsOnVacation(newSettings?.is_on_vacation || false);
        } else {
          throw error;
        }
      } else {
        setIsOnVacation(data?.is_on_vacation || false);
      }
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'Error Fetching Settings',
        description: 'Could not load your vacation settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleVacationMode = useCallback(async () => {
    if (!user) return;

    const newStatus = !isOnVacation;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ is_on_vacation: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsOnVacation(newStatus);
      toast({
        title: newStatus ? 'Vacation Mode On' : 'Welcome Back!',
        description: newStatus
          ? 'Scheduled tasks will be paused.'
          : 'Scheduled tasks will now resume.',
      });
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'Error Updating Settings',
        description: 'Could not update your vacation status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, supabase, isOnVacation]);

  return { isOnVacation, toggleVacationMode, loading, error, refetch: fetchSettings };
}