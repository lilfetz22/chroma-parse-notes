import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { NotesList } from '@/components/NotesList';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Note } from '@/types/note';
import { LogOut, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { notes, loading, createNote, updateNote, searchNotes } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Note[]>([]);

  // Auto-save timer
  useEffect(() => {
    if (selectedNote && (noteTitle !== selectedNote.title || noteContent !== selectedNote.content)) {
      const timer = setTimeout(() => {
        updateNote(selectedNote.id, {
          title: noteTitle || 'Untitled Note',
          content: noteContent,
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [noteTitle, noteContent, selectedNote, updateNote]);

  // Update local state when note changes
  useEffect(() => {
    if (selectedNote) {
      setNoteTitle(selectedNote.title);
      setNoteContent(selectedNote.content);
    }
  }, [selectedNote]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCreateNote = async () => {
    const newNote = await createNote();
    if (newNote) {
      setSelectedNote(newNote);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      setIsSearching(true);
      const results = await searchNotes(query);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleNLHToggle = () => {
    if (selectedNote) {
      const newNLHEnabled = !selectedNote.nlh_enabled;
      updateNote(selectedNote.id, { nlh_enabled: newNLHEnabled });
      setSelectedNote({ ...selectedNote, nlh_enabled: newNLHEnabled });
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: error.message,
      });
    }
  };

  const displayNotes = isSearching ? searchResults : notes;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Chroma Notes</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <SettingsDialog />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">
            {user.email}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Notes List */}
        <div className="w-80 flex-shrink-0">
          <NotesList
            notes={displayNotes}
            selectedNote={selectedNote}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Right Pane - Editor */}
        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              {/* Note Header */}
              <div className="p-4 border-b bg-card">
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="text-lg font-semibold border-none px-0 focus-visible:ring-0"
                />
              </div>

              {/* Editor */}
              <div className="flex-1">
                <RichTextEditor
                  content={noteContent}
                  onChange={setNoteContent}
                  nlhEnabled={selectedNote.nlh_enabled}
                  onNLHToggle={handleNLHToggle}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No note selected</h3>
                <p className="text-sm">
                  Select a note from the list or create a new one to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;