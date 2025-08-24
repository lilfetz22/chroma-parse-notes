import React from 'react';
import { FileText, Kanban, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export function AppHeader() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Sign out failed', description: error.message });
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Chroma Notes</h1>
      </div>
      <div className="flex items-center gap-2">
        <ProjectSwitcher />
        <Button variant="outline" size="sm" onClick={() => navigate('/board')}>
          <Kanban className="h-4 w-4 mr-1" />
          Kanban Board
        </Button>
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
  );
}
