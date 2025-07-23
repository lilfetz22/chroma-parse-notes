import { useState } from 'react';
import { Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onSearch: (query: string) => void;
  loading: boolean;
}

export function NotesList({ 
  notes, 
  selectedNote, 
  onSelectNote, 
  onCreateNote, 
  onSearch,
  loading 
}: NotesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    // Remove HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  return (
    <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button onClick={onCreateNote} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              <p className="text-sm">Create your first note to get started</p>
            </div>
          ) : (
            notes.map((note) => (
              <Card
                key={note.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent",
                  selectedNote?.id === note.id && "bg-accent border-primary"
                )}
                onClick={() => onSelectNote(note)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium line-clamp-1">
                        {note.title || 'Untitled Note'}
                      </h3>
                      {note.nlh_enabled && (
                        <Badge variant="secondary" className="text-xs">
                          NLH
                        </Badge>
                      )}
                    </div>
                    
                    {note.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {truncateContent(note.content)}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDate(note.updated_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}