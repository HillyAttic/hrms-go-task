'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { teamService, Team } from '@/services/team.service';
import { useModal } from '@/contexts/modal-context';

interface TeamMember {
  userId: string;
  userName: string;
  clientIds: string[];
}

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  teamMembers?: TeamMember[];
  teamId?: string;
}

/**
 * TeamMembersModal Component
 * Displays team members assigned to a task with their client counts
 * Supports both teamMemberMappings and teamId
 */
export function TeamMembersModal({
  isOpen,
  onClose,
  taskTitle,
  teamMembers = [],
  teamId,
}: TeamMembersModalProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const { openModal, closeModal } = useModal();

  // Manage modal context state
  useEffect(() => {
    if (isOpen) {
      openModal();
    } else {
      closeModal();
    }
  }, [isOpen, openModal, closeModal]);

  useEffect(() => {
    const loadTeam = async () => {
      if (!isOpen || !teamId) return;

      setLoading(true);
      try {
        const teamData = await teamService.getById(teamId);
        setTeam(teamData);
      } catch (error) {
        console.error('Error loading team:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [isOpen, teamId]);

  if (!isOpen) return null;

  // Determine which data to display
  const hasTeamMemberMappings = teamMembers && teamMembers.length > 0;
  const hasTeamId = teamId && team;

  const totalClients = hasTeamMemberMappings 
    ? teamMembers.reduce((sum, member) => sum + member.clientIds.length, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4 sm:py-8">
        <div 
          className="fixed inset-0 transition-opacity bg-muted bg-opacity-75" 
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-2xl overflow-hidden text-left align-middle transition-all transform bg-card rounded-lg shadow-xl relative z-10 max-h-[85vh] flex flex-col">
          {/* Header - Fixed */}
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserGroupIcon className="w-6 h-6 text-foreground" />
                  {hasTeamId ? 'Team Information' : 'Team Members'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {taskTitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
              </div>
            ) : hasTeamMemberMappings ? (
              // Show team member mappings with client counts
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="p-4 border-2 border-border rounded-lg hover:border-ring transition-colors bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-foreground font-semibold text-lg">
                              {member.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            {member.userName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {member.clientIds.length} client{member.clientIds.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="px-3 py-1.5 bg-muted text-foreground rounded-full text-sm font-semibold">
                          {member.clientIds.length}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : hasTeamId ? (
              // Show team information
              <div className="space-y-4">
                <div className="p-4 border-2 border-border rounded-lg bg-muted">
                  <h4 className="font-semibold text-foreground mb-2">
                    {team.name}
                  </h4>
                  {team.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {team.description}
                    </p>
                  )}
                  {team.leaderName && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">Team Leader:</span>
                      <span className="text-foreground">{team.leaderName}</span>
                    </div>
                  )}
                </div>

                {team.members && team.members.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-muted-foreground mb-3">
                      Team Members ({team.members.length})
                    </h5>
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="p-3 border border-border rounded-lg hover:border-ring transition-colors bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-foreground font-semibold">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h6 className="font-medium text-foreground truncate">
                                {member.name}
                              </h6>
                              <p className="text-xs text-muted-foreground">
                                {member.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserGroupIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team information available</p>
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="px-6 py-3 border-t border-border bg-muted flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {hasTeamMemberMappings ? (
                  <>
                    <span className="font-semibold text-foreground">{teamMembers.length}</span> team member{teamMembers.length !== 1 ? 's' : ''}
                    <span className="mx-2">•</span>
                    <span className="font-semibold text-foreground">{totalClients}</span> total client{totalClients !== 1 ? 's' : ''}
                  </>
                ) : hasTeamId ? (
                  <>
                    <span className="font-semibold text-foreground">{team?.members?.length || 0}</span> team member{(team?.members?.length || 0) !== 1 ? 's' : ''}
                  </>
                ) : (
                  <span>No team data</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
