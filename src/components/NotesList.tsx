// src/components/NotesList.tsx
import { useState, useEffect } from 'react';
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
  onDeleteNote: (id: string) => void;
  loading: boolean;
}

export function NotesList({ 
  notes, 
  selectedNote, 
  onSelectNote, 
  onCreateNote, 
  onDeleteNote,
  loading 
}: NotesListProps) {
  const { activeProject, setActiveProject, projects } = useProject();
  const { updateNote, searchNotes, refetch } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchNotes(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchNotes]);

  const handleCreateNote = async () => {
    const newNote = await onCreateNote();
    if (newNote && activeProject) {
      await updateNote(newNote.id, { project_id: activeProject.id });
    }
  };
  
  const handleSelectSearchResult = async (note: Note) => {
    setSearchQuery('');
    setSearchResults([]);
    
    // If the note belongs to a different project, switch to that project
    if (note.project_id && (!activeProject || note.project_id !== activeProject.id)) {
      const targetProject = projects.find(p => p.id === note.project_id);
      if (targetProject) {
        setActiveProject(targetProject);
      }
    } else if (!note.project_id && activeProject) {
      // If the note is unassigned but we're in a project, switch to unassigned view
      setActiveProject(null);
    }
    
    // Refetch notes to ensure the selected note is in the main list
    await refetch();
    onSelectNote(note);
  };

  const filteredNotes = activeProject 
    ? notes.filter(note => note.project_id === activeProject.id)
    : notes.filter(note => !note.project_id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  const showSearchResults = (isSearching || searchResults.length > 0) && searchQuery.trim() !== '';

  return (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {activeProject ? `Notes - ${activeProject.title}` : 'Notes (Unassigned)'}
          </h2>
          <Button onClick={handleCreateNote} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {showSearchResults && (
            <div className="absolute top-full mt-2 w-full bg-card border rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
              <div className="p-2 space-y-1">
                {isSearching && (
                  <div className="px-2 py-3 text-sm text-muted-foreground flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </div>
                )}
                {!isSearching && searchResults.length === 0 && (
                  <div className="px-2 py-3 text-sm text-center text-muted-foreground">
                    No results found for "{searchQuery}"
                  </div>
                )}
                {!isSearching && searchResults.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => handleSelectSearchResult(note)} 
                    className="p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <p className="font-medium truncate text-sm">{note.title || 'Untitled Note'}</p>
                    <p className="text-xs text-muted-foreground truncate">{truncateContent(note.content, 80)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full notes-list-scroll">
          <div className="p-2 space-y-2">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Loading notes...</p>
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
                        <h3 className="font-medium line-clamp-1 flex-1 mr-2" onClick={() => onSelectNote(note)}>
                          {note.title || 'Untitled Note'}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
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
                                  Delete
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
    </div>
  );
}