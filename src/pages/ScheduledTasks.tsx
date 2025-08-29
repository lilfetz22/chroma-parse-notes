import React from 'react';
import { format } from 'date-fns';
import { Clock, Trash2, Calendar, Repeat } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { useScheduledTasks } from '@/hooks/useScheduledTasks';
import { useProject } from '@/hooks/useProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RecurrenceType } from '@/types/scheduled-task';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get display information for recurrence types including the new advanced options
 */
const getRecurrenceDisplay = (recurrenceType: RecurrenceType, daysOfWeek?: number[] | null, nextDate?: string) => {
  switch (recurrenceType) {
    case 'once':
      return {
        label: 'One-time',
        description: nextDate ? `On ${format(new Date(nextDate), 'MMM d, yyyy')}` : '',
        variant: 'secondary' as const,
      };
    case 'daily':
      return {
        label: 'Daily',
        description: 'Every day',
        variant: 'default' as const,
      };
    case 'weekdays':
      return {
        label: 'Weekdays',
        description: 'Monday to Friday',
        variant: 'outline' as const,
      };
    case 'weekly':
      return {
        label: 'Weekly',
        description: daysOfWeek && daysOfWeek.length === 1 
          ? `Every ${DAYS_OF_WEEK[daysOfWeek[0]]}` 
          : 'Weekly',
        variant: 'outline' as const,
      };
    case 'bi-weekly':
      return {
        label: 'Bi-weekly',
        description: 'Every 2 weeks',
        variant: 'outline' as const,
      };
    case 'monthly':
      return {
        label: 'Monthly',
        description: 'Every month',
        variant: 'outline' as const,
      };
    case 'custom_weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = daysOfWeek
          .map(day => DAYS_OF_WEEK[day])
          .filter(Boolean);
        return {
          label: 'Custom Weekly',
          description: `Every ${dayNames.join(' and ')}`,
          variant: 'outline' as const,
        };
      }
      return {
        label: 'Custom Weekly',
        description: 'Custom schedule',
        variant: 'outline' as const,
      };
    default:
      return {
        label: 'Unknown',
        description: '',
        variant: 'secondary' as const,
      };
  }
};

export function ScheduledTasks() {
  const { activeProject } = useProject();
  const { scheduledTasks, loading, deleteScheduledTask } = useScheduledTasks();

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
              const recurrence = getRecurrenceDisplay(
                task.recurrence_type,
                task.days_of_week,
                task.next_occurrence_date
              );

              return (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        {task.summary && (
                          <p className="text-sm text-muted-foreground">{task.summary}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteScheduledTask(task.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-muted-foreground" />
                          <Badge variant={recurrence.variant}>{recurrence.label}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {recurrence.description}
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
    </div>
  );
}