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
import { Card } from '@/types/kanban';

interface EditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  onSave: (cardId: string, updates: { title: string; summary?: string; content?: any }) => void;
}

export function EditCardModal({ isOpen, onClose, card, onSave }: EditCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary || '');
  const [content, setContent] = useState(
    card.card_type === 'simple' 
      ? (typeof card.content === 'string' ? card.content : JSON.stringify(card.content || ''))
      : ''
  );
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
    }
  }, [isOpen, card]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const updates: any = { title: title.trim() };
      
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