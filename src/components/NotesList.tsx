import { useState } from 'react';
import { useProject } from '@/hooks/useProject';
import { useNotes } from '@/hooks/useNotes';
import { Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => Promise<Note | null>;
  onSearch: (query: string) => void;
  onDeleteNote: (id: string) => void;
  loading: boolean;
}

export function NotesList({ 
  notes, 
  selectedNote, 
  onSelectNote, 
  onCreateNote, 
  onSearch,
  onDeleteNote,
  loading 
}: NotesListProps) {
  const { activeProject } = useProject();
  const { updateNote } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateNote = async () => {
    const newNote = await onCreateNote();
    if (newNote && activeProject) {
      // Automatically assign the note to the active project
      await updateNote(newNote.id, { project_id: activeProject.id });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  // Filter notes by active project
  const filteredNotes = activeProject 
    ? notes.filter(note => note.project_id === activeProject.id)
    : notes.filter(note => !note.project_id); // Show unassigned notes when no project is selected

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
          <h2 className="text-lg font-semibold">
            {activeProject ? `Notes - ${activeProject.title}` : 'Notes (Unassigned)'}
          </h2>
          <Button onClick={handleCreateNote} size="sm">
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
          ) : filteredNotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>
                {activeProject 
                  ? `No notes in "${activeProject.title}" project yet.` 
                  : 'No unassigned notes yet.'
                }
              </p>
              <p className="text-sm">Create your first note to get started</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
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
                      <h3 className="font-medium line-clamp-1" onClick={() => onSelectNote(note)}>
                        {note.title || 'Untitled Note'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {note.nlh_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            NLH
                          </Badge>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                note and remove your data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteNote(note.id)}>
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    {note.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2" onClick={() => onSelectNote(note)}>
                        {truncateContent(note.content)}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground" onClick={() => onSelectNote(note)}>
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