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
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-lg w-full max-h-[70vh] overflow-y-auto">
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

        {/* Team Statistics - Redesigned with gradients */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Total Teams */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 shadow-lg shadow-blue-500/25 border-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:20px_20px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-100 font-medium">Total Teams</p>
                <p className="text-3xl font-bold text-white">{teams.length}</p>
              </div>
            </div>
          </div>

          {/* Active Teams */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 shadow-lg shadow-emerald-500/25 border-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:20px_20px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-100 font-medium">Active Teams</p>
                <p className="text-3xl font-bold text-white">
                  {teams.filter(team => team.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          {/* Total Members */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 shadow-lg shadow-amber-500/25 border-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:20px_20px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserGroupIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-100 font-medium">Total Members</p>
                <p className="text-3xl font-bold text-white">
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
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-foreground text-background' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              aria-label="Grid view"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 border-l border-gray-300 dark:border-gray-600 transition-colors ${viewMode === 'list' ? 'bg-foreground text-background' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
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
              /* List View - Redesigned */
              <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-b-2 border-gray-200 dark:border-gray-700">
                  <div className="col-span-4 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Team Name</div>
                  <div className="col-span-3 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Leader</div>
                  <div className="col-span-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Members</div>
                  <div className="col-span-1 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Status</div>
                  <div className="col-span-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 text-right">Actions</div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 text-sm bg-white dark:bg-gray-dark hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* Mobile card view */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white">{team.name}</span>
                              {team.linkedProjectId && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
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
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${team.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : team.status === 'inactive' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                            {team.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                            <span>Leader: <span className="font-medium text-gray-800 dark:text-gray-200">{team.leaderName || 'Unassigned'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                            <span>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => handleViewDetails(team.id!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                            aria-label="View details"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />View
                          </button>
                          <button
                            onClick={() => handleEditClick(team)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 transition-colors"
                            aria-label="Edit team"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                            aria-label="Delete team"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />Delete
                          </button>
                        </div>
                      </div>

                      {/* Desktop grid view */}
                      <div className="hidden md:contents">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white truncate">{team.name}</span>
                              {team.linkedProjectId && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 flex-shrink-0">
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
                        <div className="col-span-3 text-gray-700 dark:text-gray-300 flex items-center">
                          <span className="text-gray-600 dark:text-gray-400">{team.leaderName || 'Unassigned'}</span>
                        </div>
                        <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{team.members.length}</span>
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${team.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : team.status === 'inactive' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                            {team.status}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetails(team.id!)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                            aria-label="View details"
                            title="View details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(team)}
                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
                            aria-label="Edit team"
                            title="Edit team"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
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