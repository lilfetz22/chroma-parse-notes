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
import { Card, Tag } from '@/types/kanban';
import { TagInput } from '@/components/TagInput';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  onSave: (cardId: string, updates: { 
    title: string; 
    summary?: string; 
    content?: any; 
    priority?: number;
    tag_ids?: string[];
  }) => void;
}

export function EditCardModal({ isOpen, onClose, card, onSave }: EditCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary || '');
  const [content, setContent] = useState(
    card.card_type === 'simple' 
      ? (typeof card.content === 'string' ? card.content : JSON.stringify(card.content || ''))
      : ''
  );
  const [priority, setPriority] = useState<number>(card.priority || 0);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(card.tags || []);
  const [isLoading, setIsLoading] = useState(false);

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
    }
  }, [isOpen, card]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const updates: any = { 
        title: title.trim(),
        priority: priority,
        tag_ids: selectedTags.map(tag => tag.id)
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