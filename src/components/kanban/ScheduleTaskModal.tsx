import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SchedulingOptions, ScheduleData } from '@/components/SchedulingOptions';
import { CreateScheduledTaskData, RecurrenceType } from '@/types/scheduled-task';
import { Column } from '@/types/kanban';
import { format, addDays, nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday } from 'date-fns';

interface ScheduleTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onTaskScheduled: (taskData: CreateScheduledTaskData) => void;
}

export function ScheduleTaskModal({ isOpen, onClose, columns, onTaskScheduled }: ScheduleTaskModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [targetColumnId, setTargetColumnId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    isScheduled: true,
    recurrenceType: 'once' as RecurrenceType,
    selectedDate: undefined,
    daysOfWeek: undefined,
  });

  /**
   * Calculate the next occurrence date based on recurrence type and selected options
   */
  const calculateNextOccurrenceDate = (): string | null => {
    const today = new Date();

    switch (scheduleData.recurrenceType) {
      case 'once':
        return scheduleData.selectedDate ? format(scheduleData.selectedDate, 'yyyy-MM-dd') : null;
        
      case 'daily':
        return format(addDays(today, 1), 'yyyy-MM-dd');
        
      case 'weekdays':
        // Find next weekday (skip weekends)
        let nextWeekday = addDays(today, 1);
        while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6) {
          nextWeekday = addDays(nextWeekday, 1);
        }
        return format(nextWeekday, 'yyyy-MM-dd');
        
      case 'weekly':
        if (!scheduleData.daysOfWeek || scheduleData.daysOfWeek.length === 0) return null;
        const nextDayFunctions = [
          nextSunday, nextMonday, nextTuesday, nextWednesday, 
          nextThursday, nextFriday, nextSaturday
        ];
        const nextOccurrence = nextDayFunctions[scheduleData.daysOfWeek[0]](today);
        return format(nextOccurrence, 'yyyy-MM-dd');
        
      case 'bi-weekly':
        return format(addDays(today, 14), 'yyyy-MM-dd');
        
      case 'monthly':
        // Add one month to today
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return format(nextMonth, 'yyyy-MM-dd');
        
      case 'custom_weekly':
        if (!scheduleData.daysOfWeek || scheduleData.daysOfWeek.length === 0) return null;
        
        // Find the next scheduled day from the selected days
        const currentDayOfWeek = today.getDay();
        let nextScheduledDay = null;
        let daysUntilNext = 0;
        
        // First, look for the next day in the current week
        for (const day of scheduleData.daysOfWeek) {
          if (day > currentDayOfWeek) {
            daysUntilNext = day - currentDayOfWeek;
            nextScheduledDay = day;
            break;
          }
        }
        
        // If no day found in current week, wrap to next week
        if (nextScheduledDay === null) {
          daysUntilNext = (7 - currentDayOfWeek) + scheduleData.daysOfWeek[0];
          nextScheduledDay = scheduleData.daysOfWeek[0];
        }
        
        const nextCustomWeekly = addDays(today, daysUntilNext);
        return format(nextCustomWeekly, 'yyyy-MM-dd');
        
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetColumnId) return;

    const nextOccurrenceDate = calculateNextOccurrenceDate();
    if (!nextOccurrenceDate) return;

    setIsSubmitting(true);

    const taskData: CreateScheduledTaskData = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      target_column_id: targetColumnId,
      recurrence_type: scheduleData.recurrenceType,
      days_of_week: scheduleData.daysOfWeek,
      next_occurrence_date: nextOccurrenceDate,
    };

    await onTaskScheduled(taskData);
    
    // Reset form
    setTitle('');
    setSummary('');
    setTargetColumnId('');
    setScheduleData({
      isScheduled: true,
      recurrenceType: 'once',
      selectedDate: undefined,
      daysOfWeek: undefined,
    });
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  /**
   * Check if the form is valid based on the selected recurrence type
   */
  const isFormValid = (): boolean => {
    if (!title.trim() || !targetColumnId) return false;
    
    switch (scheduleData.recurrenceType) {
      case 'once':
        return scheduleData.selectedDate !== undefined;
      case 'weekly':
        return scheduleData.daysOfWeek !== undefined && scheduleData.daysOfWeek.length === 1;
      case 'custom_weekly':
        return scheduleData.daysOfWeek !== undefined && scheduleData.daysOfWeek.length > 0;
      default:
        return true; // daily, weekdays, bi-weekly, monthly don't need additional validation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary (Optional)</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Add task description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="column">Target Column</Label>
            <Select value={targetColumnId} onValueChange={setTargetColumnId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SchedulingOptions 
            scheduleData={scheduleData} 
            onScheduleChange={setScheduleData} 
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isFormValid()}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}