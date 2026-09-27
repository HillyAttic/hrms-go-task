import React from 'react';
import { Team } from '@/services/team.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

interface TeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

/**
 * TeamCard Component
 * Displays team information in a card format.
 *
 * The `Team Members` label, the `.flex.-space-x-2` avatar row, the per-avatar
 * `title` and the `+N` indicator are asserted by
 * src/__tests__/team-card.test.tsx — keep them.
 */
export function TeamCard({ team, onEdit, onDelete, onViewDetails, selected = false, onSelect }: TeamCardProps) {
  // Generate initials from name for avatar fallback
  const getInitials = (name: string): string => {
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

  // Get member count
  const memberCount = team.members.length;

  // Get first 5 members for avatar display
  const displayMembers = team.members.slice(0, 5);
  const remainingCount = memberCount > 5 ? memberCount - 5 : 0;

  return (
    <Card
      className={`group hover:-translate-y-0.5 transition-transform cursor-pointer overflow-hidden ${selected ? 'ring-2 ring-ring' : ''}`}
      onClick={() => {
        onViewDetails(team.id!);
      }}
    >
      {/* Status accent bar — the one place the status hue appears at full strength */}
      <div
        className={`h-1.5 ${
          team.status === 'active'
            ? 'bg-success'
            : team.status === 'inactive'
              ? 'bg-warning'
              : 'bg-muted-foreground'
        }`}
      />

      <CardContent className="p-5">
        {/* Header with Team Name and Status Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-display text-base font-bold text-foreground truncate leading-tight">
                {team.name}
              </h3>
              <Badge variant={getStatusVariant(team.status)}>
                {team.status}
              </Badge>
            </div>
            {/* Show linked project if this team is auto-synced from a project */}
            {team.linkedProjectId && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <FolderIcon className="w-3 h-3" />
                  {team.linkedProjectName || 'Project Team'}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(team)}
              className="h-8 w-8"
              aria-label={`Edit ${team.name}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(team.id!)}
              className="h-8 w-8 text-destructive"
              aria-label={`Delete ${team.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {team.description}
          </p>
        )}

        {/* Team Details - Stats Row */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b-2 border-border">
          {/* Team Leader */}
          <div className="flex items-center gap-1.5 text-sm">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Leader:</span>
            <span className="font-medium text-foreground text-xs truncate max-w-[120px]">{team.leaderName || 'Unassigned'}</span>
          </div>

          {/* Member Count */}
          <div className="flex items-center gap-1.5 text-sm">
            <UserGroupIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Members:</span>
            <span className="font-semibold text-foreground text-xs">{memberCount}</span>
          </div>
        </div>

        {/* Member Avatar Previews */}
        {memberCount > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Team Members</span>
              <span className="text-xs text-muted-foreground">{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
            <div className="flex -space-x-2 mt-2">
              {/* Display first 5 member avatars */}
              {displayMembers.map((member) => (
                <Avatar
                  key={member.id}
                  src={member.avatar}
                  alt={member.name}
                  fallback={getInitials(member.name)}
                  size="sm"
                  className="border-2 border-card"
                  title={member.name}
                />
              ))}
              {/* Show count indicator for additional members */}
              {remainingCount > 0 && (
                <div
                  className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-semibold text-muted-foreground"
                  title={`${remainingCount} more ${remainingCount === 1 ? 'member' : 'members'}`}
                >
                  +{remainingCount}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer with creation date */}
        {team.createdAt && (
          <div className="mt-4 pt-3 border-t-2 border-border text-[11px] text-muted-foreground">
            Created {new Date(team.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
