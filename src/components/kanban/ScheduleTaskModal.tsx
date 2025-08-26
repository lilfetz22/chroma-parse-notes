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
    dayOfWeek: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetColumnId) return;

    let nextOccurrenceDate: string;

    if (scheduleData.recurrenceType === 'once') {
      if (!scheduleData.selectedDate) return;
      nextOccurrenceDate = format(scheduleData.selectedDate, 'yyyy-MM-dd');
    } else if (scheduleData.recurrenceType === 'daily') {
      nextOccurrenceDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    } else if (scheduleData.recurrenceType === 'weekly') {
      if (scheduleData.dayOfWeek === undefined) return;
      const today = new Date();
      const nextDayFunctions = [
        nextSunday, nextMonday, nextTuesday, nextWednesday, 
        nextThursday, nextFriday, nextSaturday
      ];
      const nextOccurrence = nextDayFunctions[scheduleData.dayOfWeek](today);
      nextOccurrenceDate = format(nextOccurrence, 'yyyy-MM-dd');
    } else {
      return;
    }

    setIsSubmitting(true);

    const taskData: CreateScheduledTaskData = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      target_column_id: targetColumnId,
      recurrence_type: scheduleData.recurrenceType,
      day_of_week: scheduleData.recurrenceType === 'weekly' ? scheduleData.dayOfWeek : undefined,
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
      dayOfWeek: undefined,
    });
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
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
              disabled={
                isSubmitting || 
                (scheduleData.recurrenceType === 'once' && !scheduleData.selectedDate) ||
                (scheduleData.recurrenceType === 'weekly' && scheduleData.dayOfWeek === undefined)
              }
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}