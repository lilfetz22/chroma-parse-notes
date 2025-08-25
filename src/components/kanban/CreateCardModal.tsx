import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Search, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Note } from '@/types/note';
import { CardType } from '@/types/kanban';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnId: string;
  onCardCreated: (columnId: string, cardData: {
    card_type: CardType;
    title: string;
    content?: any;
  note_id?: string;
  summary?: string | null;
  }) => void;
}

export function CreateCardModal({ isOpen, onClose, columnId, onCardCreated }: CreateCardModalProps) {
  const [cardType, setCardType] = useState<CardType>('simple');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load user's notes for linking
  useEffect(() => {
    if (isOpen && cardType === 'linked') {
      loadNotes();
    }
  }, [isOpen, cardType]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    
    try {
      const cardData = {
        card_type: cardType,
        title: title.trim(),
        ...(cardType === 'simple' ? { content: content.trim() } : {}),
  ...(cardType === 'linked' && selectedNote ? { note_id: selectedNote.id, summary: summary.trim() || null } : {}),
  ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
  ...(recurrenceRule ? { recurrence: recurrenceRule } : {})
      };

      await onCardCreated(columnId, cardData);
      handleClose();
    } catch (error) {
      console.error('Error creating card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
  setSummary('');
    setSelectedNote(null);
    setSearchQuery('');
    setCardType('simple');
    setScheduledAt(null);
    setRecurrenceRule(null);
    onClose();
  };

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
  setTitle(note.title);
  setSummary('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Type Selection */}
          <div>
            <Label>Card Type</Label>
            <RadioGroup
              value={cardType}
              onValueChange={(value) => setCardType(value as CardType)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simple" id="simple" />
                <Label htmlFor="simple">Simple Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="linked" id="linked" />
                <Label htmlFor="linked">Linked Note</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Simple Card Form */}
          {cardType === 'simple' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Card Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter card title..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content (Optional)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter card content..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Linked Card Form */}
          {cardType === 'linked' && (
            <div className="space-y-4">
              <div>
                <Label>Search Notes</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your notes..."
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredNotes.length > 0 && (
                <div>
                  <Label>Select Note to Link</Label>
                  <ScrollArea className="h-64 mt-2 border rounded-md">
                    <div className="p-2 space-y-2">
                      {filteredNotes.map((note) => (
                        <Card 
                          key={note.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedNote?.id === note.id ? 'bg-muted border-primary' : ''
                          }`}
                          onClick={() => handleNoteSelect(note)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm line-clamp-1">
                                  {note.title}
                                </h4>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {note.content.slice(0, 100)}...
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {selectedNote && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">Selected:</span>
                      <span>{selectedNote.title}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {selectedNote && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="linked-title">Card Title</Label>
                    <Input
                      id="linked-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for this linked card..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="linked-summary">Summary (optional)</Label>
                    <Textarea
                      id="linked-summary"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Add a short summary for this card..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              {/* Scheduling */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="scheduled-at">Schedule (optional)</Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt || ''}
                    onChange={(e) => setScheduledAt(e.target.value || null)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="recurrence">Recurrence</Label>
                  <select
                    id="recurrence"
                    value={recurrenceRule || 'none'}
                    onChange={(e) => setRecurrenceRule(e.target.value === 'none' ? null : e.target.value)}
                    className="mt-1 block w-full rounded border bg-background px-3 py-2"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays (Mon–Fri)</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={
                !title.trim() || 
                (cardType === 'linked' && !selectedNote) ||
                isLoading
              }
            >
              {isLoading ? 'Creating...' : 'Create Card'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}