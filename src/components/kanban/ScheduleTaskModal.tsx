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
import { Column, Tag } from '@/types/kanban'; // --- MODIFICATION: Import Tag
import { format, addDays, nextSunday, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday } from 'date-fns';
import { TagInput } from '../TagInput'; // --- MODIFICATION: Import TagInput
import { createScheduledTimestamp } from '@/lib/utils';

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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]); // --- MODIFICATION: Add state for selected tags
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [scheduleData, setScheduleData] = useState<ScheduleData>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      isScheduled: true,
      recurrenceType: 'once' as RecurrenceType,
      selectedDate: tomorrow,
      daysOfWeek: undefined,
      selectedTime: '00:00', // Default to midnight
    };
  });

  // (calculateNextOccurrenceDate function remains unchanged)
  const calculateNextOccurrenceDate = (): string | null => {
    const today = new Date();

    switch (scheduleData.recurrenceType) {
      case 'once': {
        return scheduleData.selectedDate ? format(scheduleData.selectedDate, 'yyyy-MM-dd') : null;
      }
        
      case 'daily': {
        return format(addDays(today, 1), 'yyyy-MM-dd');
      }
        
      case 'weekdays': {
        let nextWeekday = addDays(today, 1);
        while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6) {
          nextWeekday = addDays(nextWeekday, 1);
        }
        return format(nextWeekday, 'yyyy-MM-dd');
      }
        
      case 'weekly': {
        if (!scheduleData.daysOfWeek || scheduleData.daysOfWeek.length === 0) return null;
        const nextDayFunctions = [
          nextSunday, nextMonday, nextTuesday, nextWednesday, 
          nextThursday, nextFriday, nextSaturday
        ];
        const nextOccurrence = nextDayFunctions[scheduleData.daysOfWeek[0]](today);
        return format(nextOccurrence, 'yyyy-MM-dd');
      }
        
      case 'bi-weekly': {
        return format(addDays(today, 14), 'yyyy-MM-dd');
      }
        
      case 'monthly': {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return format(nextMonth, 'yyyy-MM-dd');
      }
        
      case 'custom_weekly': {
        if (!scheduleData.daysOfWeek || scheduleData.daysOfWeek.length === 0) return null;
        
        const currentDayOfWeek = today.getDay();
        let nextScheduledDay = null;
        let daysUntilNext = 0;
        
        for (const day of scheduleData.daysOfWeek) {
          if (day > currentDayOfWeek) {
            daysUntilNext = day - currentDayOfWeek;
            nextScheduledDay = day;
            break;
          }
        }
        
        if (nextScheduledDay === null) {
          // Find the minimum day in the array for next week
          const minDay = Math.min(...scheduleData.daysOfWeek);
          daysUntilNext = (7 - currentDayOfWeek) + minDay;
          nextScheduledDay = minDay;
        }
        
        const nextCustomWeekly = addDays(today, daysUntilNext);
        return format(nextCustomWeekly, 'yyyy-MM-dd');
      }
        
      default: {
        return null;
      }
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
      scheduled_timestamp: createScheduledTimestamp(scheduleData.selectedDate, scheduleData.selectedTime || '00:00'), // Create full timestamp
      tag_ids: selectedTags.map(tag => tag.id), // --- MODIFICATION: Add tag IDs
    };

    await onTaskScheduled(taskData);
    
    // Reset form
    setTitle('');
    setSummary('');
    setTargetColumnId('');
    setSelectedTags([]); // --- MODIFICATION: Reset tags
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleData({
      isScheduled: true,
      recurrenceType: 'once',
      selectedDate: tomorrow,
      daysOfWeek: undefined,
      selectedTime: '00:00', // Reset to default midnight
    });
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const isFormValid = (): boolean => {
    console.log('=== VALIDATION CHECK ===');
    console.log('Title:', `"${title}"`, 'trimmed:', `"${title.trim()}"`, 'length:', title.trim().length);
    console.log('Target Column ID:', targetColumnId);
    console.log('Schedule Data:', {
      isScheduled: scheduleData.isScheduled,
      recurrenceType: scheduleData.recurrenceType,
      selectedDate: scheduleData.selectedDate,
      daysOfWeek: scheduleData.daysOfWeek
    });
    
    if (!title.trim() || !targetColumnId) {
      console.log('❌ Failed basic validation - missing title or targetColumnId');
      console.log('Title check:', !title.trim(), 'TargetColumn check:', !targetColumnId);
      return false;
    }
    
    let result = false;
    switch (scheduleData.recurrenceType) {
      case 'once':
        result = scheduleData.selectedDate !== undefined;
        console.log('✓ Once validation:', result, '- selectedDate:', scheduleData.selectedDate);
        return result;
      case 'weekly':
        result = scheduleData.daysOfWeek !== undefined && scheduleData.daysOfWeek.length === 1;
        console.log('✓ Weekly validation:', result, '- daysOfWeek:', scheduleData.daysOfWeek);
        return result;
      case 'custom_weekly':
        result = scheduleData.daysOfWeek !== undefined && scheduleData.daysOfWeek.length > 0 && scheduleData.selectedDate !== undefined;
        console.log('✓ Custom weekly validation:', result, '- daysOfWeek:', scheduleData.daysOfWeek, '- selectedDate:', scheduleData.selectedDate);
        return result;
      case 'daily':
      case 'weekdays':
      case 'bi-weekly':
      case 'monthly':
        // For recurring tasks, we need a start date
        result = scheduleData.selectedDate !== undefined;
        console.log(`✓ ${scheduleData.recurrenceType} validation:`, result, '- selectedDate:', scheduleData.selectedDate);
        return result;
      default:
        console.log('❌ Default case - unknown recurrence type:', scheduleData.recurrenceType);
        return false;
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

          {/* --- MODIFICATION START: Add TagInput component --- */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <TagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              placeholder="Add tags..."
            />
          </div>
          {/* --- MODIFICATION END --- */}

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