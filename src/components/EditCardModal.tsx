import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, Tag, Column } from '@/types/kanban';
import { RecurrenceType } from '@/types/scheduled-task';
import { TagInput } from '@/components/TagInput';
import { SchedulingOptions, ScheduleData } from '@/components/SchedulingOptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  columns: Column[];
  onSave: (cardId: string, updates: { 
    title: string; 
    summary?: string; 
    content?: any; 
    priority?: number;
    tag_ids?: string[];
    column_id?: string;
  }) => void;
  onConvertToScheduledTask?: (cardId: string) => void;
}

export function EditCardModal({ isOpen, onClose, card, columns, onSave, onConvertToScheduledTask }: EditCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary || '');
  const [content, setContent] = useState(
    card.card_type === 'simple' 
      ? (typeof card.content === 'string' ? card.content : JSON.stringify(card.content || ''))
      : ''
  );
  const [priority, setPriority] = useState<number>(card.priority || 0);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(card.tags || []);
  const [selectedColumnId, setSelectedColumnId] = useState<string>(card.column_id);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Scheduling state
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    isScheduled: false,
    recurrenceType: 'once',
    selectedDate: undefined,
    daysOfWeek: undefined,
  });

  useEffect(() => {
    if (isOpen) {
      setTitle(card.title);
      setSummary(card.summary || '');
      setContent(
        card.card_type === 'simple' 
          ? (typeof card.content === 'string' ? card.content : JSON.stringify(card.content || ''))
          : ''
      );
      setPriority(card.priority || 0);
      setSelectedTags(card.tags || []);
      setSelectedColumnId(card.column_id);
      
      // Reset scheduling state when modal opens
      setScheduleData({
        isScheduled: false,
        recurrenceType: 'once',
        selectedDate: undefined,
        daysOfWeek: undefined,
      });
    }
  }, [isOpen, card]);

  const handleConvertToScheduledTask = async () => {
    if (!scheduleData.isScheduled || !title.trim()) return;

    // Validate scheduling data
    if (scheduleData.recurrenceType === 'once' && !scheduleData.selectedDate) {
      toast({
        variant: 'destructive',
        title: 'Invalid Schedule',
        description: 'Please select a date for one-time tasks.',
      });
      return;
    }

    if ((scheduleData.recurrenceType === 'weekly' || scheduleData.recurrenceType === 'custom_weekly') && 
        (!scheduleData.daysOfWeek || scheduleData.daysOfWeek.length === 0)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Schedule',
        description: 'Please select at least one day for weekly tasks.',
      });
      return;
    }

    if (scheduleData.recurrenceType !== 'once' && !scheduleData.selectedDate) {
      toast({
        variant: 'destructive',
        title: 'Invalid Schedule',
        description: 'Please select a start date for recurring tasks.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const nextOccurrenceDate = scheduleData.selectedDate!.toISOString().split('T')[0];
      
      // Create scheduled task
      const { data, error } = await supabase.from('scheduled_tasks').insert({
        title: card.title,
        summary: card.summary || '',
        recurrence_type: 'once' as RecurrenceType,
        days_of_week: null,
        next_occurrence_date: new Date().toISOString().split('T')[0],
        target_column_id: 'temp-column', // This would need proper logic
        project_id: 'temp-project', // This would need proper logic
        user_id: user?.id || 'temp-user',
        priority: card.priority || 0
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Conversion failed');
      }

      toast({
        title: 'Card Converted',
        description: 'Card has been successfully converted to a scheduled task.',
      });

      if (onConvertToScheduledTask) {
        onConvertToScheduledTask(card.id);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error converting card to scheduled task:', error);
      toast({
        variant: 'destructive',
        title: 'Conversion Failed',
        description: error.message || 'Failed to convert card to scheduled task.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    // If scheduling is enabled, convert to scheduled task instead
    if (scheduleData.isScheduled) {
      await handleConvertToScheduledTask();
      return;
    }

    setIsLoading(true);
    try {
      const updates: any = { 
        title: title.trim(),
        priority: priority,
        tag_ids: selectedTags.map(tag => tag.id),
        column_id: selectedColumnId
      };
      
      if (card.card_type === 'linked') {
        updates.summary = summary.trim() || null;
      } else if (card.card_type === 'simple') {
        updates.content = content.trim();
      }

      await onSave(card.id, updates);
      onClose();
    } catch (error) {
      console.error('Error saving card:', error);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogDescription>
            Edit the card details below. You can also convert this card to a scheduled task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter card title..."
            />
          </div>

          {/* Priority Selection */}
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

          {/* Tags Selection */}
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <TagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              placeholder="Add tags..."
            />
          </div>

          {card.card_type === 'linked' && (
            <div className="space-y-2">
              <Label htmlFor="edit-summary">Summary</Label>
              <Textarea
                id="edit-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Enter card summary..."
                rows={3}
              />
            </div>
          )}

          {card.card_type === 'simple' && (
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter card content..."
                rows={4}
              />
            </div>
          )}

          {/* Scheduling Options */}
          <SchedulingOptions
            scheduleData={scheduleData}
            onScheduleChange={setScheduleData}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || isLoading}>
              {isLoading 
                ? (scheduleData.isScheduled ? 'Converting...' : 'Saving...')
                : (scheduleData.isScheduled ? 'Convert to Scheduled Task' : 'Save Changes')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}