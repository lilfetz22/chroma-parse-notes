import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Tag as TagIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tag } from '@/types/kanban';
import { formatDate } from '@/lib/utils';
import { useTags } from '@/hooks/useTags'; // --- MODIFICATION: Import useTags
import { TagEditModal } from '@/components/TagEditModal'; // --- MODIFICATION: Import TagEditModal
import { Badge } from '@/components/ui/badge'; // --- MODIFICATION: Import Badge

export function ProjectManagement() {
  const { projects, activeProject, setActiveProject, deleteProject } = useProject();
  // --- MODIFICATION START: Use the new useTags hook ---
  const { tags, isLoading: isLoadingTags, createTag, updateTag, deleteTag } = useTags();
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  // --- MODIFICATION END ---

  const handleDeleteProject = async (project: Project) => {
    await deleteProject(project.id);
  };

  const handleSetActiveProject = (project: Project) => {
    setActiveProject(project);
  };

  // --- MODIFICATION START: Handlers for tag modal ---
  const handleOpenCreateTagModal = () => {
    setEditingTag(null);
    setIsTagModalOpen(true);
  };

  const handleOpenEditTagModal = (tag: Tag) => {
    setEditingTag(tag);
    setIsTagModalOpen(true);
  };

  const handleSaveTag = (tagData: { id?: string; name: string; color: string }) => {
    if (tagData.id) {
      // Editing existing tag
      updateTag(
        { id: tagData.id, name: tagData.name, color: tagData.color },
        { onSuccess: () => setIsTagModalOpen(false) }
      );
    } else {
      // Creating new tag
      createTag(
        { name: tagData.name, color: tagData.color },
        { onSuccess: () => setIsTagModalOpen(false) }
      );
    }
  };
  // --- MODIFICATION END ---


  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-6 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Project Management Section (Existing Code - Modified for brevity) */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Project Management</h1>
                <p className="text-muted-foreground">Select your active project</p>
              </div>
            </div>
            {projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground">Your projects will appear here.</p>
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
                        <div onClick={(e) => e.stopPropagation()}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{project.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProject(project)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="min-h-[40px]">
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
          </div>

          {/* --- MODIFICATION START: Tag Management Section --- */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TagIcon className="h-5 w-5" />
                    Tag Management
                  </CardTitle>
                  <CardDescription>Create, edit, and delete tags for your organization.</CardDescription>
                </div>
                <Button onClick={handleOpenCreateTagModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTags ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tags created yet.</p>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                      <Badge className={`${tag.color} text-white`}>{tag.name}</Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditTagModal(tag)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the tag "{tag.name}"? This will remove it from all associated cards and scheduled tasks. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTag(tag.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {/* --- MODIFICATION END --- */}

        </div>
      </main>

      {/* --- MODIFICATION START: Render Tag Edit Modal --- */}
      <TagEditModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSave={handleSaveTag}
        tag={editingTag}
      />
      {/* --- MODIFICATION END --- */}
    </div>
  );
}