import React, { useState } from 'react';
import { format, addDays, nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CreateScheduledTaskData, RecurrenceType } from '@/types/scheduled-task';
import { Column } from '@/types/kanban';

interface ScheduleTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onTaskScheduled: (taskData: CreateScheduledTaskData) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ScheduleTaskModal({ isOpen, onClose, columns, onTaskScheduled }: ScheduleTaskModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [targetColumnId, setTargetColumnId] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('once');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [dayOfWeek, setDayOfWeek] = useState<number>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetColumnId) return;

    let nextOccurrenceDate: string;

    if (recurrenceType === 'once') {
      if (!selectedDate) return;
      nextOccurrenceDate = format(selectedDate, 'yyyy-MM-dd');
    } else if (recurrenceType === 'daily') {
      // Start tomorrow
      nextOccurrenceDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    } else if (recurrenceType === 'weekly') {
      if (dayOfWeek === undefined) return;
      // Calculate next occurrence of the selected day
      const today = new Date();
      const nextDayFunctions = [
        nextSunday, nextMonday, nextTuesday, nextWednesday, 
        nextThursday, nextFriday, nextSaturday
      ];
      const nextOccurrence = nextDayFunctions[dayOfWeek](today);
      nextOccurrenceDate = format(nextOccurrence, 'yyyy-MM-dd');
    } else {
      return;
    }

    setIsSubmitting(true);

    const taskData: CreateScheduledTaskData = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      target_column_id: targetColumnId,
      recurrence_type: recurrenceType,
      day_of_week: recurrenceType === 'weekly' ? dayOfWeek : undefined,
      next_occurrence_date: nextOccurrenceDate,
    };

    await onTaskScheduled(taskData);
    
    // Reset form
    setTitle('');
    setSummary('');
    setTargetColumnId('');
    setRecurrenceType('once');
    setSelectedDate(undefined);
    setDayOfWeek(undefined);
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

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence</Label>
            <Select value={recurrenceType} onValueChange={(value: RecurrenceType) => setRecurrenceType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType === 'once' && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <Select value={dayOfWeek?.toString()} onValueChange={(value) => setDayOfWeek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}