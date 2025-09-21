import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Trash2, Calendar, Repeat, Edit } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { useScheduledTasks } from '@/hooks/useScheduledTasks';
import { useProject } from '@/hooks/useProject';
import { useKanbanBoard } from '@/hooks/useKanbanBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditScheduledTaskModal } from '@/components/EditScheduledTaskModal';
import { formatRecurrenceRule } from '@/lib/recurrence-utils';
import { ScheduledTask } from '@/types/scheduled-task';
import { Tag } from '@/types/kanban'; // --- MODIFICATION: Import Tag
import { supabase } from '@/integrations/supabase/client'; // --- MODIFICATION: Import supabase
import { useAuth } from '@/hooks/useAuth'; // --- MODIFICATION: Import useAuth

export function ScheduledTasks() {
  const { user } = useAuth(); // --- MODIFICATION: Get user for fetching tags
  const { activeProject } = useProject();
  const { scheduledTasks, loading, updateScheduledTask, deleteScheduledTask } = useScheduledTasks();
  const { boardData } = useKanbanBoard();
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]); // --- MODIFICATION: State to hold all user tags

  // --- MODIFICATION START: Fetch all user tags once ---
  useEffect(() => {
    const fetchAllTags = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        setAllTags(data || []);
      } catch (error) {
        console.error("Failed to fetch all user tags:", error);
      }
    };
    fetchAllTags();
  }, [user]);
  // --- MODIFICATION END ---


  const handleUpdateTask = async (taskId: string, updates: any) => {
    await updateScheduledTask(taskId, updates);
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteScheduledTask(taskId);
  };

  if (!activeProject) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 flex-1">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Please select a project to view scheduled tasks.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Scheduled Tasks</h1>
          <Badge variant="outline">{activeProject.title}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading scheduled tasks...</p>
          </div>
        ) : scheduledTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scheduled Tasks</h3>
              <p className="text-muted-foreground text-center">
                You haven't scheduled any tasks yet. Create a scheduled task from your Kanban board to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {scheduledTasks.map((task) => {
              const recurrenceDescription = formatRecurrenceRule(
                task.recurrence_type,
                task.days_of_week,
                task.next_occurrence_date
              );

              // --- MODIFICATION START: Find tags for the current task ---
              const taskTags = (task.tag_ids || [])
                .map(tagId => allTags.find(t => t.id === tagId))
                .filter((t): t is Tag => t !== undefined);
              // --- MODIFICATION END ---

              return (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {task.title}
                           {/* --- MODIFICATION START: Display tags in header --- */}
                          <div className="flex flex-wrap gap-1">
                            {taskTags.map(tag => (
                              <Badge 
                                key={tag.id} 
                                variant="secondary" 
                                className={`${tag.color} text-white text-xs px-1.5 py-0.5`}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                           {/* --- MODIFICATION END --- */}
                        </CardTitle>
                        {task.summary && (
                          <p className="text-sm text-muted-foreground">{task.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTask(task)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Scheduled Task</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{task.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTask(task.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="outline">{task.recurrence_type}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {recurrenceDescription}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Next: {format(new Date(task.next_occurrence_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(task.created_at), 'MMM d, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {editingTask && boardData && (
        <EditScheduledTaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          columns={boardData.columns}
          onSave={handleUpdateTask}
        />
      )}
    </div>
  );
}