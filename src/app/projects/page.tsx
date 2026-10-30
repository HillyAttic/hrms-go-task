'use client';

import React, { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Project } from '@/services/project.service';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ClockIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

/** Compact Indian currency formatting for headline numbers */
const formatValue = (amount: number) => {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      // Transform flat form data to nested API structure
      const projectData: any = {
        projectName: data.projectName,
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

  // Portfolio metrics for the bento stats strip
  const stats = useMemo(() => {
    const totalValue = projects.reduce((sum, p) => sum + (p.projectValue || 0), 0);
    return {
      total: projects.length,
      wip: projects.filter((p) => p.status === 'wip').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      pending: projects.filter((p) => p.status === 'pending_approval').length,
      totalValue,
    };
  }, [projects]);

  const VIEW_OPTIONS = [
    { id: 'grid', label: 'Grid', icon: Squares2X2Icon },
    { id: 'list', label: 'List', icon: ListBulletIcon },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] mb-1">
            Workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1.5">
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
            className="flex items-center gap-2 text-white bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] hover:opacity-90 shadow-[0_14px_30px_-12px_rgba(4,71,253,0.55)]"
            size="lg"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Project
          </Button>
        </div>
      </div>

      {/* Bento Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Gradient hero tile: portfolio value */}
        <div className="col-span-2 relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] shadow-[0_20px_50px_-20px_rgba(4,71,253,0.55)]">
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
              Portfolio Value
            </p>
            <BanknotesIcon className="w-5 h-5 text-white/75" />
          </div>
          <p className="relative mt-2 text-3xl font-bold text-white tabular-nums tracking-tight">
            {formatValue(stats.totalValue)}
          </p>
          <p className="relative mt-1 text-xs text-white/70">
            across {stats.total} project{stats.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Metric tiles */}
        {[
          { label: 'Total Projects', value: stats.total, icon: CubeIcon, tint: 'text-[#0447FD] bg-[#0447FD]/10' },
          { label: 'Active (WIP)', value: stats.wip, icon: ClipboardDocumentListIcon, tint: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
          { label: 'Completed', value: stats.completed, icon: CheckBadgeIcon, tint: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
          { label: 'Pending Approval', value: stats.pending, icon: ClockIcon, tint: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' },
        ].map((tile) => (
          <div
            key={tile.label}
            className="glass-surface rounded-2xl border border-white/60 dark:border-white/10 p-4 flex flex-col justify-between hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.3)] transition-shadow"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${tile.tint}`}>
              <tile.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">
              {tile.value}
            </p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-1">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading projects</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* View Toggle: segmented glass pill */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl glass-surface border border-white/60 dark:border-white/10 shadow-[0_10px_30px_-16px_rgba(15,23,42,0.25)]">
          {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              aria-label={`${label} view`}
              aria-pressed={viewMode === id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === id
                  ? 'bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-[0_8px_20px_-8px_rgba(4,71,253,0.6)]'
                  : 'text-slate-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
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
