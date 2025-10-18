import React, { useState, useEffect } from 'react';
import { FileText, Kanban, LogOut, Search, FolderOpen, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import { useGlobalSearch, GlobalSearchResult } from '@/hooks/useGlobalSearch';
import { Project } from '@/types/project';
import { toast } from '@/hooks/use-toast';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { setActiveProject } = useProject();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { results, isLoading } = useGlobalSearch(searchQuery);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Sign out failed', description: error.message });
    }
  };

  // Global keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSearchSelect = async (result: GlobalSearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');

    try {
      // Switch to the appropriate project if needed (skip if no project)
      if (result.project_id) {
        // Find the project in the current projects list or create a minimal project object
        const targetProject: Project = {
          id: result.project_id,
          title: result.project_title,
          user_id: user?.id || '',
          created_at: new Date().toISOString(),
          description: null,
        };
        
        setActiveProject(targetProject);
      }

      // Navigate based on result type
      switch (result.type) {
        case 'note':
          navigate('/', { 
            state: { 
              selectedNoteId: result.id,
              projectId: result.project_id 
            } 
          });
          break;
        case 'card':
          if (result.project_id) {
            navigate('/board', { 
              state: { 
                projectId: result.project_id 
              } 
            });
          }
          break;
        case 'project':
          navigate('/board', { 
            state: { 
              projectId: result.id 
            } 
          });
          break;
      }
    } catch (error) {
      console.error('Error navigating to search result:', error);
      toast({
        variant: 'destructive',
        title: 'Navigation failed',
        description: 'Failed to navigate to the selected item',
      });
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, GlobalSearchResult[]>);

  return (
    <>
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Chroma Notes</h1>
        </div>
        <div className="flex items-center gap-2">
          <ProjectSwitcher />
          
          {/* Global Search Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSearchOpen(true)}
            className="relative"
          >
            <Search className="h-4 w-4 mr-2" />
            Search...
            <CommandShortcut>⌘K</CommandShortcut>
          </Button>
          
          {/* Show Notes button when on the Kanban board, otherwise show Kanban button */}
          {location.pathname.startsWith('/board') ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <FileText className="h-4 w-4 mr-1" />
              Notes
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/board')}>
              <Kanban className="h-4 w-4 mr-1" />
              Kanban Board
            </Button>
          )}
          <SettingsDialog />
          <ThemeToggle />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search projects, notes, and cards..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? 'Searching...' : 'No results found.'}
          </CommandEmpty>
          
          {/* Projects */}
          {groupedResults.project && groupedResults.project.length > 0 && (
            <CommandGroup heading="Projects">
              {groupedResults.project.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSearchSelect(result)}
                  className="flex items-center gap-2"
                >
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div 
                      className="text-sm text-muted-foreground truncate"
                      dangerouslySetInnerHTML={{ __html: result.preview }}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Notes */}
          {groupedResults.note && groupedResults.note.length > 0 && (
            <CommandGroup heading="Notes">
              {groupedResults.note.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSearchSelect(result)}
                  className="flex items-center gap-2"
                >
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div 
                      className="text-sm text-muted-foreground truncate"
                      dangerouslySetInnerHTML={{ __html: result.preview }}
                    />
                    <div className="text-xs text-muted-foreground">
                      in {result.project_title}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Cards */}
          {groupedResults.card && groupedResults.card.length > 0 && (
            <CommandGroup heading="Cards">
              {groupedResults.card.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSearchSelect(result)}
                  className="flex items-center gap-2"
                >
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div 
                      className="text-sm text-muted-foreground truncate"
                      dangerouslySetInnerHTML={{ __html: result.preview }}
                    />
                    <div className="text-xs text-muted-foreground">
                      in {result.project_title}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
