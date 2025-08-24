import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';
import { toast } from '@/hooks/use-toast';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  setActiveProject: (project: Project | null) => void;
  createProject: (title: string, description?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
      setActiveProject(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
      // Set active project to first one if none selected
      if (!activeProject && data && data.length > 0) {
        setActiveProject(data[0]);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching projects',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (title: string, description?: string): Promise<Project | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      const newProject = data as Project;
      setProjects(prev => [newProject, ...prev]);
      
      // Set as active project if it's the first one
      if (projects.length === 0) {
        setActiveProject(newProject);
      }

      toast({
        title: 'Project created',
        description: `"${title}" has been created successfully.`,
      });

      return newProject;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating project',
        description: error.message,
      });
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setProjects(prev => prev.map(project => 
        project.id === id ? { ...project, ...updates } : project
      ));

      // Update active project if it's the one being updated
      if (activeProject?.id === id) {
        setActiveProject(prev => prev ? { ...prev, ...updates } : null);
      }

      toast({
        title: 'Project updated',
        description: 'Project has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating project',
        description: error.message,
      });
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setProjects(prev => prev.filter(project => project.id !== id));
      
      // Clear active project if it's the one being deleted
      if (activeProject?.id === id) {
        const remainingProjects = projects.filter(p => p.id !== id);
        setActiveProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }

      toast({
        title: 'Project deleted',
        description: 'Project has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting project',
        description: error.message,
      });
    }
  };

  const refreshProjects = async () => {
    await fetchProjects();
  };

  const value = {
    projects,
    activeProject,
    loading,
    setActiveProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}