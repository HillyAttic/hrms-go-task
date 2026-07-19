'use client';

import React, { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Project } from '@/services/project.service';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

/**
 * Projects Page
 * Main page for managing projects with CRUD operations
 */
export default function ProjectsPage() {
  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    bulkDeleteProjects,
  } = useProjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /**
   * Handle opening the create modal
   */
  const handleAddNew = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  /**
   * Handle opening the edit modal
   */
  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  /**
   * Handle delete with confirmation
   */
  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);

      const confirmed = window.confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      );

      if (!confirmed) {
        setDeleteConfirmId(null);
        return;
      }
    }

    try {
      await deleteProject(id);
      setDeleteConfirmId(null);
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    }
  };

  /**
   * Handle bulk delete with confirmation
   */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} project(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await bulkDeleteProjects(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success('Projects deleted successfully');
    } catch (err) {
      console.error('Error deleting projects:', err);
      toast.error('Failed to delete projects');
    }
  };

  /**
   * Handle selection toggle
   */
  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  /**
   * Handle select all toggle
   */
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id!)));
    }
  };

  /**
   * Handle form submission (create or update)
   * Transforms flat form data → nested API format
   */
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      // Find selected client name
      let clientName = data.clientName;
      if (!clientName) {
        try {
          const { authenticatedFetch } = await import('@/lib/api-client');
          const res = await authenticatedFetch(`/api/clients/${data.clientId}`);
          if (res.ok) {
            const client = await res.json();
            clientName = client.clientName;
          }
        } catch {
          // Fall back to using the clientId as name
          clientName = data.clientId;
        }
      }

      // Transform flat form data to nested API structure
      const projectData: any = {
        projectName: data.projectName,
        client: {
          id: data.clientId,
          name: clientName || data.clientId,
        },
        teamMembers: data.teamMembers || [],
        clientSpoc: {
          name: data.clientSpocName,
          email: data.clientSpocEmail || undefined,
          phone: data.clientSpocPhone || undefined,
        },
        startDate: data.startDate,
        endDate: data.endDate || null,
        status: data.status,
        projectValue: data.projectValue || 0,
        invoice: {
          raised: data.invoiceRaised || false,
          amount: data.invoiceRaised ? (data.invoiceAmount || 0) : undefined,
          invoiceNumber: data.invoiceRaised ? (data.invoiceNumber || undefined) : undefined,
          raisedAt: data.invoiceRaised ? (data.invoiceRaisedAt || undefined) : undefined,
        },
        progress: {
          percentage: data.progressPercentage || 0,
          milestones: (data.milestones || []).map((m: any) => ({
            ...m,
            completedAt: m.completed && !m.completedAt ? new Date().toISOString() : m.completedAt,
          })),
        },
      };

      if (selectedProject) {
        await updateProject(selectedProject.id!, projectData);
        toast.success('Project updated successfully');
      } else {
        await createProject(projectData);
        toast.success('Project created successfully');
      }

      setIsModalOpen(false);
      setSelectedProject(null);
    } catch (err) {
      console.error('Error submitting project:', err);
      toast.error('Failed to save project');
      throw err; // Let the modal handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  // Filter projects for select-all purposes
  const filteredProjects = useMemo(() => projects, [projects]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your projects, track progress, and invoices
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="flex items-center gap-2"
              size="lg"
            >
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            onClick={handleAddNew}
            className="flex items-center gap-2 text-white"
            size="lg"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Project
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading projects</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* View Toggle Buttons */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="List view"
          >
            List
          </button>
        </div>
      </div>

      {/* Project List */}
      <ProjectList
        projects={filteredProjects}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {/* Project Modal (Create/Edit) */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        project={selectedProject}
        isLoading={isSubmitting}
      />
    </div>
  );
}
