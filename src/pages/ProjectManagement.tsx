import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { AppHeader } from '@/components/AppHeader';
import { useProject } from '@/hooks/useProject';
import { Project } from '@/types/project';
import { formatDate } from '@/lib/utils';

export function ProjectManagement() {
  const { projects, activeProject, setActiveProject, createProject, updateProject, deleteProject } = useProject();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    
    setIsCreating(true);
    const project = await createProject(newProjectTitle, newProjectDescription);
    if (project) {
      setNewProjectTitle('');
      setNewProjectDescription('');
      setShowCreateDialog(false);
    }
    setIsCreating(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProjectTitle(project.title);
    setNewProjectDescription(project.description || '');
    setShowEditDialog(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !newProjectTitle.trim()) return;
    
    setIsUpdating(true);
    await updateProject(editingProject.id, {
      title: newProjectTitle,
      description: newProjectDescription,
    });
    setShowEditDialog(false);
    setEditingProject(null);
    setNewProjectTitle('');
    setNewProjectDescription('');
    setIsUpdating(false);
  };

  const handleDeleteProject = async (project: Project) => {
    await deleteProject(project.id);
  };

  const handleSetActiveProject = (project: Project) => {
    setActiveProject(project);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Project Management</h1>
              <p className="text-muted-foreground">Organize your work into projects</p>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project to organize your notes and Kanban board.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="create-project-title">Project Title</Label>
                    <Input
                      id="create-project-title"
                      placeholder="Enter project title..."
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-project-description">Description (Optional)</Label>
                    <Textarea
                      id="create-project-description"
                      placeholder="Enter project description..."
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectTitle.trim() || isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Project'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first project to start organizing your notes and Kanban boards.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    activeProject?.id === project.id 
                      ? 'ring-2 ring-primary bg-accent/50' 
                      : ''
                  }`}
                  onClick={() => handleSetActiveProject(project)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        {activeProject?.id === project.id && (
                          <div className="text-xs text-primary font-medium mt-1">
                            Active Project
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProject(project)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.title}"? This will also delete all associated boards and cards. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProject(project)}>
                                Delete Project
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      {project.description || 'No description provided'}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-4">
                      Created {formatDate(project.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Project Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update your project details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-project-title">Project Title</Label>
                  <Input
                    id="edit-project-title"
                    placeholder="Enter project title..."
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-project-description">Description (Optional)</Label>
                  <Textarea
                    id="edit-project-description"
                    placeholder="Enter project description..."
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateProject}
                    disabled={!newProjectTitle.trim() || isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Update Project'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}