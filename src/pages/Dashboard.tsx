// src/pages/Dashboard.tsx
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
import { LogOut, FileText, Kanban, Download, FileDigit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportNoteAsTxt, exportNoteAsPdf, getNoteContentElement } from '@/lib/export-utils';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-save timer with optimized debouncing
  useEffect(() => {
    if (selectedNote && (noteTitle !== selectedNote.title || noteContent !== selectedNote.content)) {
      setIsTyping(true);
      
      // Use a longer delay for auto-save to prevent excessive database calls
      const timer = setTimeout(() => {
        setIsTyping(false);
        updateNote(selectedNote.id, {
          title: noteTitle || 'Untitled Note',
          content: noteContent,
        });
      }, 2000); // Increased from 1000ms to 2000ms

      return () => {
        clearTimeout(timer);
      };
    } else {
      setIsTyping(false);
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
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [notes, location.state, location.pathname, navigate]);

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
  };

  const handleDeleteNote = async (id: string) => {
    if (selectedNote && selectedNote.id === id) {
      setSelectedNote(null);
    }
    await deleteNote(id);
  };

  const handleNLHToggle = async () => {
    if (selectedNote) {
      const newNLHEnabled = !selectedNote.nlh_enabled;
      
      // Update local state immediately for instant feedback
      setSelectedNote({ ...selectedNote, nlh_enabled: newNLHEnabled });
      
      // Update in database
      await updateNote(selectedNote.id, { nlh_enabled: newNLHEnabled });
    }
  };

  const handleContentChange = (newContent: string) => {
    setNoteContent(newContent);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteTitle(e.target.value);
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

  const handleExportAsTxt = () => {
    if (!selectedNote) {
      toast({
        variant: "destructive",
        title: "No note selected",
        description: "Please select a note to export.",
      });
      return;
    }

    try {
      exportNoteAsTxt(noteContent, noteTitle || selectedNote.title);
      toast({
        title: "Export successful",
        description: "Note exported as TXT file.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export note as TXT file.",
      });
    }
  };

  const handleExportAsPdf = async () => {
    if (!selectedNote) {
      toast({
        variant: "destructive",
        title: "No note selected",
        description: "Please select a note to export.",
      });
      return;
    }

    try {
      const contentElement = getNoteContentElement();
      if (!contentElement) {
        toast({
          variant: "destructive",
          title: "Export failed",
          description: "Could not find note content for PDF export.",
        });
        return;
      }

      await exportNoteAsPdf(contentElement, noteTitle || selectedNote.title);
      toast({
        title: "Export successful",
        description: "Note exported as PDF file.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export note as PDF file.",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />

      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        <div className="w-80 flex-shrink-0 flex flex-col">
          <NotesList
            notes={notes}
            selectedNote={selectedNote}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            loading={loading}
          />
        </div>

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {selectedNote ? (
            <>
              <div className="p-4 border-b bg-card flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <Input
                    value={noteTitle}
                    onChange={handleTitleChange}
                    placeholder="Note title..."
                    className="text-lg font-semibold border-none px-0 focus-visible:ring-0 min-w-0 flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportAsTxt}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Export TXT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportAsPdf}
                      className="flex items-center gap-2"
                    >
                      <FileDigit className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <RichTextEditor
                  content={noteContent}
                  onChange={handleContentChange}
                  nlhEnabled={selectedNote.nlh_enabled}
                  onNLHToggle={handleNLHToggle}
                  notes={notes}
                  isUserTyping={isTyping}
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