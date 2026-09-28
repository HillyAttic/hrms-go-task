'use client';

import React, { useState } from 'react';
import { useTeams } from '@/hooks/use-teams';
import { Team } from '@/services/team.service';
import { TeamFormData } from '@/lib/validation';
import { TeamCard } from '@/components/teams/TeamCard';
import { TeamModal } from '@/components/teams/TeamModal';
import { TeamDetailPanel } from '@/components/teams/TeamDetailPanel';
import { TeamFilter, TeamFilterState } from '@/components/teams/TeamFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { ViewToggle } from '@/components/ui/view-toggle';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  CheckCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

/** Shared status → badge variant map, so the list rows and cards agree. */
const STATUS_VARIANT = {
  active: 'success',
  inactive: 'warning',
  archived: 'default',
} as const;

/**
 * Detail panel. Uses the shared Dialog so the `useModal()` counter fires and the
 * header/bottom nav hide behind it — the previous hand-rolled overlay left them
 * visible on top of the panel.
 */
function DetailPanelWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="p-0">
        {/* Scroll lives on this inner div so the dialog's close button stays pinned
            and the scrollbar sits flush with the dialog edge. `pt-14` keeps the
            first card clear of that button. */}
        <div className="slim-scrollbar max-h-[70vh] overflow-y-auto p-6 pt-14">
          {children}
        </div>
      </DialogContent>
    </Dialog>
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
          <div className="p-4 rounded-full border-2 border-border bg-warning/15">
            <ShieldExclamationIcon className="w-16 h-16 text-warning" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground text-center max-w-md">
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
        <PageHeader
          eyebrow="Organisation"
          title="Teams"
          description="Manage your organization's teams and members."
          actions={
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={loading}
            >
              <PlusIcon className="w-4 h-4" />
              Add New Team
            </Button>
          }
        />

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-destructive font-medium">Error</p>
                  <p className="text-destructive/90 text-sm">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshTeams}
                  className="text-destructive hover:text-destructive"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatsCard
            label="Total Teams"
            value={teams.length}
            icon={<UserGroupIcon className="w-4 h-4" />}
          />
          <StatsCard
            label="Active Teams"
            value={teams.filter(team => team.status === 'active').length}
            icon={<CheckCircleIcon className="w-4 h-4" />}
          />
          <StatsCard
            label="Total Members"
            value={teams.reduce((total, team) => total + team.members.length + 1, 0)}
            icon={<UsersIcon className="w-4 h-4" />}
          />
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

        {/* View Toggle */}
        <div className="flex justify-end">
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            aria-label="Change view mode"
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
          />
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
              <div className="bg-card rounded-lg border-2 border-border overflow-hidden shadow-hard">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-muted border-b-2 border-border">
                  <div className="col-span-4 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Team Name</div>
                  <div className="col-span-3 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Leader</div>
                  <div className="col-span-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Members</div>
                  <div className="col-span-1 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Status</div>
                  <div className="col-span-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground text-right">Actions</div>
                </div>
                <div className="divide-y-2 divide-border">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 text-sm bg-card hover:bg-muted/60 transition-colors"
                    >
                      {/* Mobile card view */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{team.name}</span>
                              {team.linkedProjectId && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  <FolderIcon className="w-2.5 h-2.5" />
                                  {team.linkedProjectName || 'Project Team'}
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {team.description}
                              </div>
                            )}
                          </div>
                          <Badge variant={STATUS_VARIANT[team.status]} className="flex-shrink-0">
                            {team.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                            <span>Leader: <span className="font-medium text-foreground">{team.leaderName || 'Unassigned'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                            <span>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t-2 border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(team.id!)}
                            aria-label="View details"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(team)}
                            aria-label="Edit team"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="text-destructive"
                            aria-label="Delete team"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />Delete
                          </Button>
                        </div>
                      </div>

                      {/* Desktop grid view */}
                      <div className="hidden md:contents">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-md border-2 border-border bg-accent flex items-center justify-center text-accent-foreground text-sm font-bold">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground truncate">{team.name}</span>
                              {team.linkedProjectId && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground flex-shrink-0">
                                  <FolderIcon className="w-2.5 h-2.5" />
                                  {team.linkedProjectName || 'Project Team'}
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <div className="text-muted-foreground text-xs mt-0.5 truncate">
                                {team.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-3 flex items-center">
                          <span className="text-muted-foreground">{team.leaderName || 'Unassigned'}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <UserGroupIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{team.members.length}</span>
                        </div>
                        <div className="col-span-1 flex items-center">
                          <Badge variant={STATUS_VARIANT[team.status]}>
                            {team.status}
                          </Badge>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(team.id!)}
                            className="h-9 w-9"
                            aria-label="View details"
                            title="View details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(team)}
                            className="h-9 w-9"
                            aria-label="Edit team"
                            title="Edit team"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTeam(team.id!)}
                            className="h-9 w-9 text-destructive"
                            aria-label="Delete team"
                            title="Delete team"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
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
            />
          </DetailPanelWrapper>
        )}
      </div>
    </ErrorBoundary>
  </ManagerGuard>
  );
}