import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Card as CardType } from '@/types/kanban';

interface EditLinkedCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardType | null;
  onSaved: (updatedCard: CardType) => void;
}

export function EditLinkedCardModal({ isOpen, onClose, card, onSaved }: EditLinkedCardModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setSummary((card as any).summary || '');
    } else {
      setTitle('');
      setSummary('');
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('cards')
        .update({ title: title.trim(), summary: summary.trim() || null })
        .eq('id', card.id)
        .select()
        .single();

      if (error) throw error;

      onSaved(data as CardType);
      onClose();
    } catch (err) {
      console.error('Error updating card:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Linked Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="edit-summary">Summary</Label>
            <Textarea id="edit-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="mt-1" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
