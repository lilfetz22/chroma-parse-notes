import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { NotesList } from '@/components/NotesList';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SettingsDialog } from '@/components/SettingsDialog';
import { AppHeader } from '@/components/AppHeader';
import { Note } from '@/types/note';
import { LogOut, FileText, Kanban } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { notes, loading, createNote, updateNote, deleteNote, searchNotes } = useNotes();
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

  // Keep selectedNote in sync with notes array updates
  useEffect(() => {
    if (selectedNote) {
      const updatedNote = notes.find(note => note.id === selectedNote.id);
      if (updatedNote && updatedNote.nlh_enabled !== selectedNote.nlh_enabled) {
        console.log('🔄 Dashboard: Syncing selectedNote with notes array:', {
          noteId: selectedNote.id,
          oldNLHEnabled: selectedNote.nlh_enabled,
          newNLHEnabled: updatedNote.nlh_enabled
        });
        setSelectedNote(updatedNote);
      }
    }
  }, [notes, selectedNote]);

  // Handle navigation from Kanban board to specific note
  useEffect(() => {
    const state = location.state as { selectedNoteId?: string };
    if (state?.selectedNoteId && notes.length > 0) {
      const note = notes.find(n => n.id === state.selectedNoteId);
      if (note) {
        setSelectedNote(note);
        // Clear the state to prevent reselection on refresh
        navigate('/', { replace: true });
      }
    }
  }, [notes, location.state, navigate]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCreateNote = async (): Promise<Note | null> => {
    const newNote = await createNote();
    if (newNote) {
      setSelectedNote(newNote);
    }
    return newNote;
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleDeleteNote = async (id: string) => {
    if (selectedNote && selectedNote.id === id) {
      setSelectedNote(null);
    }
    await deleteNote(id);
  };

  const handleNLHToggle = async () => {
    console.log('🔄 Dashboard: NLH toggle clicked');
    if (selectedNote) {
      const newNLHEnabled = !selectedNote.nlh_enabled;
      console.log('🎯 Dashboard: Toggling NLH for note:', {
        noteId: selectedNote.id,
        noteTitle: selectedNote.title,
        currentNLHEnabled: selectedNote.nlh_enabled,
        newNLHEnabled
      });
      
      // Update local state immediately for instant feedback
      setSelectedNote({ ...selectedNote, nlh_enabled: newNLHEnabled });
      console.log('✅ Dashboard: Local selectedNote state updated');
      
      // Update in database
      await updateNote(selectedNote.id, { nlh_enabled: newNLHEnabled });
      console.log('✅ Dashboard: Database update completed');
    } else {
      console.log('❌ Dashboard: No note selected for NLH toggle');
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
      <AppHeader />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Pane - Notes List */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          <NotesList
            notes={displayNotes}
            selectedNote={selectedNote}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onSearch={searchNotes}
            loading={loading}
          />
        </div>

        {/* Right Pane - Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedNote ? (
            <>
              {/* Note Header */}
              <div className="p-4 border-b bg-card flex-shrink-0">
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="text-lg font-semibold border-none px-0 focus-visible:ring-0"
                />
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0">
                <RichTextEditor
                  content={noteContent}
                  onChange={setNoteContent}
                  nlhEnabled={(() => {
                    console.log('🎯 Dashboard: Passing to RichTextEditor:', {
                      selectedNoteId: selectedNote.id,
                      selectedNoteTitle: selectedNote.title,
                      nlhEnabledValue: selectedNote.nlh_enabled,
                      typeof: typeof selectedNote.nlh_enabled
                    });
                    return selectedNote.nlh_enabled;
                  })()}
                  onNLHToggle={handleNLHToggle}
                  notes={notes}
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