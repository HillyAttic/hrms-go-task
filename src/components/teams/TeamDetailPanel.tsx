import React, { useState, useEffect } from 'react';
import { Team, TeamMember, teamService } from '@/services/team.service';
import { Employee, employeeService } from '@/services/employee.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import {
  UserGroupIcon,
  UserIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface TeamDetailPanelProps {
  team: Team;
  onTeamUpdate?: (updatedTeam: Team) => void;
}

/**
 * TeamDetailPanel Component
 * Displays full team information including complete member list with roles.
 * Validates Requirements: 4.4, 4.5, 4.6
 *
 * The `Team Members (n)` heading, the member name/role text and the
 * `No team members yet` / `Add members to build your team` empty state are
 * asserted by src/__tests__/team-member-management.test.tsx — keep them.
 */
export function TeamDetailPanel({ team, onTeamUpdate }: TeamDetailPanelProps) {
  const [currentTeam, setCurrentTeam] = useState<Team>(team);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'success' | 'default' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  // Load employees for member addition
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const activeEmployees = await employeeService.getAll({ status: 'active' });
        setEmployees(activeEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
        setError('Failed to load employees');
      }
    };

    loadEmployees();
  }, []);





  // Get leader information
  const getLeaderInfo = () => {
    const leader = employees.find(emp => emp.id === currentTeam.leaderId);
    return leader || { name: currentTeam.leaderName };
  };

  const leaderInfo = getLeaderInfo();

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-md border-2 border-border bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2 text-destructive hover:text-destructive"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Team Overview - Requirement 4.4 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CardTitle className="truncate">{currentTeam.name}</CardTitle>
          <Badge variant={getStatusVariant(currentTeam.status)}>
            {currentTeam.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {currentTeam.description && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{currentTeam.description}</p>
            </div>
          )}

          {/* Team Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Member Count */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Team Size</h4>
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {currentTeam.members.length + 1} {currentTeam.members.length === 0 ? 'member' : 'members'}
                  <span className="text-xs text-muted-foreground ml-1">(including leader)</span>
                </span>
              </div>
            </div>

            {/* Created Date */}
            {currentTeam.createdAt && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Created</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(currentTeam.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Leader */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Team Leader
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Avatar
              alt={leaderInfo.name}
              fallback={getInitials(leaderInfo.name || 'Unknown')}
              size="sm"
            />
            <div>
              <p className="font-medium text-foreground text-sm">{leaderInfo.name}</p>
              <p className="text-xs text-muted-foreground">Team Leader</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members - Requirement 4.4 (complete member list with roles) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4" />
            Team Members ({currentTeam.members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentTeam.members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>No team members yet</p>
              <p className="text-sm">Add members to build your team</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTeam.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded-md border-2 border-border bg-muted"
                >
                  <Avatar
                    src={member.avatar}
                    alt={member.name}
                    fallback={getInitials(member.name)}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-foreground text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}