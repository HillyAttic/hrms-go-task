'use client';

import React, { useState, useEffect } from 'react';
import { useTeams } from '@/hooks/use-teams';
import { Team } from '@/services/team.service';
import { TeamFormData } from '@/lib/validation';
import { TeamCard } from '@/components/teams/TeamCard';
import { TeamModal } from '@/components/teams/TeamModal';
import { TeamDetailPanel } from '@/components/teams/TeamDetailPanel';
import { TeamFilter, TeamFilterState } from '@/components/teams/TeamFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ManagerGuard } from '@/components/Auth/PermissionGuard';
import {
  PlusIcon,
  UserGroupIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  FolderIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '@/contexts/modal-context';

// Wrapper component to manage body class for detail panel
function DetailPanelWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    // This component only renders when the detail panel is visible
    openModal();
    return () => closeModal();
  }, [openModal, closeModal]);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="glass-surface rounded-lg shadow-xl max-w-lg w-full max-h-[70vh] overflow-y-auto">
        <div className="p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Teams Page Component
 * Main page for team management with CRUD operations, filtering, and team details
 * Validates Requirements: 4.1, 4.2
 * Access: Manager and Admin only
 */
export default function TeamsPage() {
  const {
    teams,
    loading,
    error,
    filters,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
    updateMemberRole,
    setFilters,
    clearFilters,
    refreshTeams,
  } = useTeams();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // 'grid' or 'list' view mode

  // Department filter removed since teams no longer have department field

  // Handle create team
  const handleCreateTeam = async (data: TeamFormData) => {
    setIsSubmitting(true);
    try {
      await createTeam(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating team:', error);
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit team
  const handleEditTeam = async (data: TeamFormData) => {
    if (!selectedTeam?.id) return;
    
    setIsSubmitting(true);
    try {
      await updateTeam(selectedTeam.id, data);
      setIsEditModalOpen(false);
      setSelectedTeam(null);
      
      // Update detail panel if it's showing the same team
      if (detailTeam?.id === selectedTeam.id) {
        const updatedTeam = teams.find(t => t.id === selectedTeam.id);
        if (updatedTeam) {
          setDetailTeam(updatedTeam);
        }
      }
    } catch (error) {
      console.error('Error updating team:', error);
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete team
  const handleDeleteTeam = async (id: string) => {
    const team = teams.find(t => t.id === id);
    if (!team) return;

    const confirmMessage = `Are you sure you want to delete "${team.name}"? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    try {
      await deleteTeam(id);
      
      // Close detail panel if showing deleted team
      if (detailTeam?.id === id) {
        setDetailTeam(null);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      // Error is handled by the hook
    }
  };

  // Handle team card edit
  const handleEditClick = (team: Team) => {
    setSelectedTeam(team);
    setIsEditModalOpen(true);
  };

  // Handle team detail view
  const handleViewDetails = (id: string) => {
    const team = teams.find(t => t.id === id);
    if (team) {
      setDetailTeam(team);
    }
  };

  // Handle team update from detail panel
  const handleTeamUpdate = (updatedTeam: Team) => {
    setDetailTeam(updatedTeam);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: TeamFilterState) => {
    setFilters({
      status: newFilters.status === 'all' ? undefined : newFilters.status,
      department: newFilters.department === 'all' ? undefined : newFilters.department,
      search: filters.search, // Preserve search
    });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    clearFilters();
  };

  // Close modals
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTeam(null);
  };

  const handleCloseDetailPanel = () => {
    setDetailTeam(null);
  };

  return (
    <ManagerGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
            <ShieldExclamationIcon className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            You don't have permission to access this page. Only managers and administrators can view team management.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      }
    >
      <ErrorBoundary>
        <div className="space-y-6">
        {/* Page Header - Requirement 4.1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your organization's teams and members
            </p>
          </div>

          {/* Add New Team Button - Requirement 4.2 */}
          <div className="self-start sm:self-auto">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 text-white"
              disabled={loading}
            >
              <PlusIcon className="w-5 h-5" />
              Add New Team
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshTeams}
                  className="text-red-600 hover:text-red-700"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Statistics - glass cards with a colour wash, matching the dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Total Teams */}
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-100/70 via-blue-50/30 to-white dark:from-blue-500/15 dark:via-blue-500/5 dark:to-transparent"
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Teams</p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {teams.length}
                </p>
              </div>
            </div>
          </div>

          {/* Active Teams */}
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/70 via-emerald-50/30 to-white dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent"
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Teams</p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {teams.filter(team => team.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          {/* Total Members */}
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-100/70 via-amber-50/30 to-white dark:from-orange-500/15 dark:via-amber-500/5 dark:to-transparent"
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/25">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Members</p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {teams.reduce((total, team) => total + team.members.length + 1, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <TeamFilter
          filters={{
            status: filters.status || 'all',
            department: filters.department || 'all',
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          availableDepartments={[]}
        />

        {/* View Toggle Buttons - Icon based */}
        <div className="flex justify-end">
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-[4px_4px_10px_rgba(163,177,198,0.4)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'}`}
              aria-label="Grid view"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`border-l border-white/60 p-2.5 transition-all dark:border-white/10 ${viewMode === 'list' ? 'bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'}`}
              aria-label="List view"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="space-y-6">
          {loading ? (
            // Loading skeleton
            <CardGridSkeleton count={6} />
          ) : teams.length === 0 ? (
            // Empty state
            filters.status !== 'all' || filters.department !== 'all' || filters.search ? (
              <NoResultsEmptyState 
                onClearFilters={() => setFilters({ status: 'all', department: 'all', search: '' })}
              />
            ) : (
              <NoDataEmptyState 
                entityName="Teams" 
                onAdd={() => setIsCreateModalOpen(true)}
              />
            )
          ) : (
            // Teams grid/list view
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteTeam}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              /* List View - Neumorphism (soft-UI) plates */
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-[10px_10px_28px_rgba(163,177,198,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90 dark:shadow-[10px_10px_28px_rgba(0,0,0,0.6)]">
                {/* Table Header - recessed trough */}
                <div className="hidden md:grid grid-cols-12 gap-4 mx-4 mt-4 px-6 py-3.5 rounded-xl border border-slate-200/70 bg-gray-100/70 shadow-[inset_3px_3px_7px_rgba(163,177,198,0.35)] dark:border-white/10 dark:bg-black/20 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.45)]">
                  <div className="col-span-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Team Name</div>
                  <div className="col-span-3 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Leader</div>
                  <div className="col-span-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Members</div>
                  <div className="col-span-1 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Status</div>
                  <div className="col-span-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 text-right">Actions</div>
                </div>
                <div className="space-y-3 p-3 md:p-4">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 text-sm rounded-xl border border-slate-200/70 bg-white/70 shadow-[4px_4px_10px_rgba(163,177,198,0.3)] transition-all hover:bg-white/90 hover:shadow-[6px_6px_14px_rgba(163,177,198,0.4)] dark:border-white/10 dark:bg-white/5 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)] dark:hover:bg-white/10"
                    >
                      {/* Mobile card view */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white">{team.name}</span>
                              {team.linkedProjectId && (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-gray-100/70 px-2 py-0.5 text-[10px] font-medium text-indigo-700 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.4)] dark:border-white/10 dark:bg-black/20 dark:text-indigo-300 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45)]">
                                  <FolderIcon className="w-2.5 h-2.5" />
                                  {team.linkedProjectName || 'Project Team'}
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {team.description}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 border shadow-[2px_2px_5px_rgba(163,177,198,0.4)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.45)] ${team.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : team.status === 'inactive' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-slate-200/70 dark:border-white/10'}`}>
                            {team.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-[2px_2px_4px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
                              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                            <span>Leader: <span className="font-medium text-gray-800 dark:text-gray-200">{team.leaderName || 'Unassigned'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-[2px_2px_4px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
                              <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                            <span>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-slate-200/70 dark:border-white/10">
                          <button
                            onClick={() => handleViewDetails(team.id!)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-blue-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-blue-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:border-white/10 dark:bg-white/5 dark:text-blue-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
                            aria-label="View details"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />View
                          </button>
                          <button
                            onClick={() => handleEditClick(team)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-indigo-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:border-white/10 dark:bg-white/5 dark:text-indigo-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
                            aria-label="Edit team"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-red-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-red-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:border-white/10 dark:bg-white/5 dark:text-red-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
                            aria-label="Delete team"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />Delete
                          </button>
                        </div>
                      </div>

                      {/* Desktop grid view */}
                      <div className="hidden md:contents">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] flex items-center justify-center text-white text-sm font-bold shadow-[3px_3px_7px_rgba(163,177,198,0.5)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white truncate">{team.name}</span>
                              {team.linkedProjectId && (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-gray-100/70 px-2 py-0.5 text-[10px] font-medium text-indigo-700 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.4)] dark:border-white/10 dark:bg-black/20 dark:text-indigo-300 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45)] flex-shrink-0">
                                  <FolderIcon className="w-2.5 h-2.5" />
                                  {team.linkedProjectName || 'Project Team'}
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                                {team.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-[2px_2px_4px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 truncate">{team.leaderName || 'Unassigned'}</span>
                        </div>
                        <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-[2px_2px_4px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
                            <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
                          </span>
                          <span className="font-medium">{team.members.length}</span>
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border shadow-[2px_2px_5px_rgba(163,177,198,0.4)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.45)] ${team.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : team.status === 'inactive' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-slate-200/70 dark:border-white/10'}`}>
                            {team.status}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(team.id!)}
                            className="p-2 rounded-lg border border-slate-200/70 bg-white/70 text-blue-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-blue-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:border-white/10 dark:bg-white/5 dark:text-blue-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:hover:text-blue-300 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
                            aria-label="View details"
                            title="View details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(team)}
                            className="p-2 rounded-lg border border-slate-200/70 bg-white/70 text-indigo-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-indigo-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:border-white/10 dark:bg-white/5 dark:text-indigo-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:hover:text-indigo-300 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
                            aria-label="Edit team"
                            title="Edit team"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="p-2 rounded-lg border border-slate-200/70 bg-white/70 text-red-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-red-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:border-white/10 dark:bg-white/5 dark:text-red-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:hover:text-red-300 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
                            aria-label="Delete team"
                            title="Delete team"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Create Team Modal - Requirement 4.2 */}
        <TeamModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          onSubmit={handleCreateTeam}
          isLoading={isSubmitting}
        />

        {/* Edit Team Modal - Requirement 4.2 */}
        <TeamModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSubmit={handleEditTeam}
          team={selectedTeam}
          isLoading={isSubmitting}
        />

        {/* Team Detail Panel */}
        {detailTeam && (
          <DetailPanelWrapper onClose={handleCloseDetailPanel}>
            <TeamDetailPanel
              team={detailTeam}
              onTeamUpdate={handleTeamUpdate}
              onClose={handleCloseDetailPanel}
            />
          </DetailPanelWrapper>
        )}
      </div>
    </ErrorBoundary>
  </ManagerGuard>
  );
}