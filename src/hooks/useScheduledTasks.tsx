import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import { ScheduledTask, CreateScheduledTaskData } from '@/types/scheduled-task';
import { toast } from '@/hooks/use-toast';

export function useScheduledTasks() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScheduledTasks = async () => {
    if (!user || !activeProject) {
      setScheduledTasks([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', activeProject.id)
        .order('next_occurrence_date', { ascending: true });

      if (error) throw error;
      setScheduledTasks((data || []) as ScheduledTask[]);
    } catch (error: any) {
      console.error('Error fetching scheduled tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load scheduled tasks',
      });
    } finally {
      setLoading(false);
    }
  };

  const createScheduledTask = async (taskData: CreateScheduledTaskData) => {
    if (!user || !activeProject) return null;

    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .insert({
          user_id: user.id,
          project_id: activeProject.id,
          ...taskData,
        })
        .select()
        .single();

      if (error) throw error;

      setScheduledTasks(prev => [...prev, data as ScheduledTask]);
      toast({
        title: 'Task Scheduled',
        description: `"${taskData.title}" has been scheduled successfully.`,
      });

      return data;
    } catch (error: any) {
      console.error('Error creating scheduled task:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to schedule task',
      });
      return null;
    }
  };

  const updateScheduledTask = async (taskId: string, updates: Partial<CreateScheduledTaskData>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setScheduledTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...data } : task
      ));

      toast({
        title: 'Task Updated',
        description: 'Scheduled task has been updated successfully.',
      });

      return data;
    } catch (error: any) {
      console.error('Error updating scheduled task:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update scheduled task',
      });
      return null;
    }
  };

  const deleteScheduledTask = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;

      setScheduledTasks(prev => prev.filter(task => task.id !== taskId));
      toast({
        title: 'Task Deleted',
        description: 'Scheduled task has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting scheduled task:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete scheduled task',
      });
    }
  };

  useEffect(() => {
    fetchScheduledTasks();
  }, [user, activeProject]);

  return {
    scheduledTasks,
    loading,
    createScheduledTask,
    updateScheduledTask,
    deleteScheduledTask,
    refreshScheduledTasks: fetchScheduledTasks,
  };
}