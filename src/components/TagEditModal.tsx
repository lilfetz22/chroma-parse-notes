import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/types/kanban';

// Consistent color palette from TagInput
const DEFAULT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500',
];

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tagData: { id?: string; name: string; color: string }) => void;
  tag?: Tag | null; // Pass a tag to edit, or null to create
}

export function TagEditModal({ isOpen, onClose, onSave, tag }: TagEditModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (tag) {
        // Editing existing tag
        setName(tag.name);
        setColor(tag.color);
      } else {
        // Creating new tag
        setName('');
        setColor(DEFAULT_COLORS[0]);
      }
    }
  }, [isOpen, tag]);

  const handleSave = () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    onSave({ id: tag?.id, name, color });
    // The parent component is responsible for closing the modal on success
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
          <DialogDescription>
            {tag ? 'Update the tag details below.' : 'Create a new tag to organize your cards.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Tag Name</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Urgent, Work, Personal"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((bgColor) => (
                <button
                  key={bgColor}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${bgColor} ${
                    color === bgColor ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  onClick={() => setColor(bgColor)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preview</Label>
            <Badge className={`${color} text-white`}>{name || 'Tag Name'}</Badge>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}