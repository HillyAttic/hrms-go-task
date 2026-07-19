import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/services/project.service';
import { authenticatedFetch } from '@/lib/api-client';

interface UseProjectsOptions {
  initialFetch?: boolean;
}

interface ProjectFilters {
  status?: string;
  teamMember?: string;
  clientId?: string;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  createProject: (data: any) => Promise<void>;
  updateProject: (id: string, data: any) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  bulkDeleteProjects: (ids: string[]) => Promise<void>;
  refreshProjects: () => Promise<void>;
  searchProjects: (query: string) => void;
  filterProjects: (filters: ProjectFilters) => void;
}

/**
 * Custom hook for managing projects with CRUD operations and optimistic updates
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { initialFetch = true } = options;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<ProjectFilters>({});

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Fetch projects from API
   */
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      if (filters.status) params.append('status', filters.status);
      if (filters.teamMember) params.append('teamMember', filters.teamMember);
      if (filters.clientId) params.append('clientId', filters.clientId);

      const response = await authenticatedFetch(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const result = await response.json();
      setProjects(result.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, filters]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (initialFetch) {
      fetchProjects();
    }
  }, [initialFetch, fetchProjects]);

  /**
   * Create a new project with optimistic update
   */
  const createProject = useCallback(
    async (data: any) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticProject: Project = {
        ...data,
        id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Project;

      // Optimistic update
      setProjects((prev) => [optimisticProject, ...prev]);

      try {
        const response = await authenticatedFetch('/api/projects', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create project');
        }

        const newProject = await response.json();

        // Replace optimistic project with real project
        setProjects((prev) =>
          prev.map((project) => (project.id === tempId ? newProject : project))
        );
      } catch (err) {
        // Rollback
        setProjects((prev) => prev.filter((project) => project.id !== tempId));

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Update an existing project with optimistic update
   */
  const updateProject = useCallback(
    async (id: string, data: any) => {
      const originalProject = projects.find((p) => p.id === id);
      if (!originalProject) {
        throw new Error('Project not found');
      }

      // Optimistic update
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id
            ? { ...project, ...data, updatedAt: new Date() }
            : project
        )
      );

      try {
        const response = await authenticatedFetch(`/api/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update project');
        }

        const updatedProject = await response.json();

        // Replace optimistic update with server response
        setProjects((prev) =>
          prev.map((project) => (project.id === id ? updatedProject : project))
        );
      } catch (err) {
        // Rollback
        setProjects((prev) =>
          prev.map((project) => (project.id === id ? originalProject : project))
        );

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [projects]
  );

  /**
   * Delete a project with optimistic update
   */
  const deleteProject = useCallback(
    async (id: string) => {
      const originalProject = projects.find((p) => p.id === id);
      if (!originalProject) {
        throw new Error('Project not found');
      }

      // Optimistic update
      setProjects((prev) => prev.filter((project) => project.id !== id));

      try {
        const response = await authenticatedFetch(`/api/projects/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete project');
        }
      } catch (err) {
        // Rollback
        setProjects((prev) => [...prev, originalProject!]);

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [projects]
  );

  /**
   * Delete multiple projects with optimistic update
   */
  const bulkDeleteProjects = useCallback(
    async (ids: string[]) => {
      const originalProjects = projects.filter((p) => p.id && ids.includes(p.id));

      // Optimistic update
      setProjects((prev) => prev.filter((project) => !project.id || !ids.includes(project.id)));

      try {
        const response = await authenticatedFetch('/api/projects/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete projects');
        }
      } catch (err) {
        // Rollback
        setProjects((prev) => [...prev, ...originalProjects]);

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [projects]
  );

  /**
   * Refresh projects from server
   */
  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  /**
   * Search projects
   */
  const searchProjects = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Filter projects
   */
  const filterProjects = useCallback((newFilters: ProjectFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    bulkDeleteProjects,
    refreshProjects,
    searchProjects,
    filterProjects,
  };
}
