import React, { useState, useEffect } from 'react';
import { FileText, Kanban, LogOut, Search, FolderOpen, CreditCard, Grid3x3, Settings, User, Calendar, FolderPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { results, isLoading, error } = useGlobalSearch(searchQuery);

  // Log search state for debugging
  useEffect(() => {
    if (searchQuery) {
      console.log('[AppHeader] Search query:', searchQuery);
      console.log('[AppHeader] Results:', results);
      console.log('[AppHeader] Is loading:', isLoading);
      console.log('[AppHeader] Error:', error);
    }
  }, [searchQuery, results, isLoading, error]);

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
          
          {/* Global Search Button - PRESERVED as top-level button */}
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
          
          {/* Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Grid3x3 className="h-4 w-4" />
                <span className="sr-only">Open actions menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Navigation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Navigation items based on current location */}
              {location.pathname.startsWith('/board') ? (
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Notes</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => navigate('/board')}>
                  <Kanban className="mr-2 h-4 w-4" />
                  <span>Kanban Board</span>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => navigate('/schedule')}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Scheduled Tasks</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/projects')}>
                <FolderPen className="mr-2 h-4 w-4" />
                <span>Project Management</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => {
                  // Use a timeout to ensure the dropdown closes first
                  setTimeout(() => {
                    const settingsButton = document.querySelector('button[data-testid="settings-button"], button:has([data-testid="settings-icon"])') as HTMLButtonElement;
                    if (!settingsButton) {
                      // Fallback: look for any button containing "Settings" text or Settings icon
                      const buttons = Array.from(document.querySelectorAll('button'));
                      const targetButton = buttons.find(btn => 
                        btn.textContent?.includes('Settings') || 
                        btn.querySelector('svg')?.classList.contains('lucide-settings') ||
                        btn.innerHTML.includes('Settings')
                      );
                      if (targetButton) {
                        (targetButton as HTMLButtonElement).click();
                      }
                    } else {
                      settingsButton.click();
                    }
                  }, 100);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>App Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>{user?.email}</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <ThemeToggle />
        </div>
      </header>

      {/* Hidden Settings Dialog trigger */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <SettingsDialog />
      </div>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search projects, notes, and cards..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? 'Searching...' : error ? `Error: ${error.message}` : 'No results found.'}
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
