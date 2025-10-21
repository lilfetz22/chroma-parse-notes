import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchedulingOptions, ScheduleData } from '@/components/SchedulingOptions';
import { ScheduledTask, CreateScheduledTaskData } from '@/types/scheduled-task';
import { Column, Tag } from '@/types/kanban'; // --- MODIFICATION: Import Tag
import { toast } from '@/hooks/use-toast';
import { TagInput } from './TagInput'; // --- MODIFICATION: Import TagInput
import { supabase } from '@/integrations/supabase/client'; // --- MODIFICATION: Import supabase client
import { extractTimeFromTimestamp, createScheduledTimestamp } from '@/lib/utils';

interface EditScheduledTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ScheduledTask;
  columns: Column[];
  onSave: (taskId: string, updates: Partial<CreateScheduledTaskData>) => void;
}

export function EditScheduledTaskModal({ 
  isOpen, 
  onClose, 
  task, 
  columns, 
  onSave 
}: EditScheduledTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [summary, setSummary] = useState(task.summary || '');
  const [priority, setPriority] = useState<number>(task.priority || 0);
  const [targetColumnId, setTargetColumnId] = useState(task.target_column_id);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]); // --- MODIFICATION: Add state for tags
  const [isLoading, setIsLoading] = useState(false);
  
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    isScheduled: true,
    recurrenceType: task.recurrence_type,
    selectedDate: new Date(task.next_occurrence_date),
    daysOfWeek: task.days_of_week || undefined,
    selectedTime: extractTimeFromTimestamp(task.scheduled_timestamp), // Extract time from timestamp
  });

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setSummary(task.summary || '');
      setPriority(task.priority || 0);
      setTargetColumnId(task.target_column_id);
      
      setScheduleData({
        isScheduled: true,
        recurrenceType: task.recurrence_type,
        selectedDate: new Date(task.next_occurrence_date),
        daysOfWeek: task.days_of_week || undefined,
        selectedTime: extractTimeFromTimestamp(task.scheduled_timestamp), // Extract time from timestamp
      });

      // --- MODIFICATION START: Fetch full tag objects from tag_ids
      const fetchTags = async () => {
        if (task.tag_ids && task.tag_ids.length > 0) {
          try {
            const { data, error } = await supabase
              .from('tags')
              .select('*')
              .in('id', task.tag_ids);
            if (error) throw error;
            setSelectedTags(data || []);
          } catch (error) {
            console.error("Failed to fetch tags for scheduled task:", error);
            setSelectedTags([]);
          }
        } else {
          setSelectedTags([]);
        }
      };

      fetchTags();
      // --- MODIFICATION END
    }
  }, [isOpen, task]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a task title.' });
      return;
    }
    if (!scheduleData.selectedDate) {
      toast({ variant: 'destructive', title: 'Invalid Schedule', description: 'Please select a date for the task.' });
      return;
    }
    if ((scheduleData.recurrenceType === 'weekly' || scheduleData.recurrenceType === 'custom_weekly') && 
        (!scheduleData.daysOfWeek || scheduleData.daysOfWeek.length === 0)) {
      toast({ variant: 'destructive', title: 'Invalid Schedule', description: 'Please select at least one day for weekly tasks.' });
      return;
    }

    setIsLoading(true);
    try {
      const updates: Partial<CreateScheduledTaskData> = {
        title: title.trim(),
        summary: summary.trim() || undefined,
        target_column_id: targetColumnId,
        recurrence_type: scheduleData.recurrenceType,
        days_of_week: scheduleData.daysOfWeek,
        next_occurrence_date: scheduleData.selectedDate.toISOString().split('T')[0],
        scheduled_timestamp: createScheduledTimestamp(scheduleData.selectedDate, scheduleData.selectedTime || '00:00'), // Create full timestamp
        priority: priority,
        tag_ids: selectedTags.map(tag => tag.id), // --- MODIFICATION: Add tag IDs to update payload
      };

      await onSave(task.id, updates);
      onClose();
    } catch (error) {
      console.error('Error saving scheduled task:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Failed to save scheduled task changes.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scheduled Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task title..."/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-summary">Summary</Label>
            <Textarea id="edit-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Enter task summary..." rows={3}/>
          </div>

          {/* --- MODIFICATION START: Add TagInput for editing --- */}
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <TagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              placeholder="Add tags..."
            />
          </div>
          {/* --- MODIFICATION END --- */}

          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Default</SelectItem>
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-target-column">Target Column</Label>
            <Select value={targetColumnId} onValueChange={setTargetColumnId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target column" />
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
            <Label>Schedule</Label>
            <SchedulingOptions
              scheduleData={scheduleData}
              onScheduleChange={(data) => setScheduleData({ ...data, isScheduled: true })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}