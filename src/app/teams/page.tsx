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

        {/* Team Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teams.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Teams</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {teams.filter(team => team.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {teams.reduce((total, team) => total + team.members.length + 1, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* View Toggle Buttons */}
        <div className="flex justify-end">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              aria-label="Grid view"
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              aria-label="List view"
            >
              List
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
              /* List View */
              <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <div className="col-span-4">Team Name</div>
                  <div className="col-span-3">Leader</div>
                  <div className="col-span-2">Members</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Actions</div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 text-sm bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {/* Mobile card view */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {team.description || 'No description'}
                            </div>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ml-2 ${team.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {team.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                          <div>Leader: <span className="text-gray-800 dark:text-gray-200">{team.leaderName || 'Unassigned'}</span></div>
                          <div>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</div>
                        </div>
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => handleViewDetails(team.id!)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                            aria-label="View details"
                          >View</button>
                          <button
                            onClick={() => handleEditClick(team)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                            aria-label="Edit team"
                          >Edit</button>
                          <button
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                            aria-label="Delete team"
                          >Delete</button>
                        </div>
                      </div>

                      {/* Desktop grid view */}
                      <div className="hidden md:contents">
                        <div className="col-span-4">
                          <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">
                            {team.description || 'No description'}
                          </div>
                        </div>
                        <div className="col-span-3 text-gray-700 dark:text-gray-300 flex items-center">
                          {team.leaderName || 'Unassigned'}
                        </div>
                        <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
                          {team.members.length}
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${team.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {team.status}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(team.id!)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            aria-label="View details"
                          >View</button>
                          <button
                            onClick={() => handleEditClick(team)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                            aria-label="Edit team"
                          >Edit</button>
                          <button
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            aria-label="Delete team"
                          >Delete</button>
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