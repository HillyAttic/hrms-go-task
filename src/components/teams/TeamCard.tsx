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
 * TeamCard Component - Neumorphism (soft-UI) plate
 * Displays team information in a card format with improved hierarchy.
 * Shadows use the cool-grey depth layer only, so the plates read as extruded
 * rather than haloed on the dimmed backdrop.
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
      className={`group overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-[10px_10px_28px_rgba(163,177,198,0.45)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[14px_14px_34px_rgba(163,177,198,0.55)] dark:border-white/10 dark:bg-[#0B1430]/90 dark:shadow-[10px_10px_28px_rgba(0,0,0,0.6)] dark:hover:shadow-[14px_14px_34px_rgba(0,0,0,0.7)] ${selected ? 'ring-2 ring-[#0447FD]/70' : ''} cursor-pointer`}
      onClick={() => {
        onViewDetails(team.id!);
      }}
    >
      <CardContent className="p-5">
        {/* Header with Team Name and Status Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate leading-tight">
                {team.name}
              </h3>
              <Badge variant={getStatusVariant(team.status)} className="border border-slate-200/70 shadow-[2px_2px_5px_rgba(163,177,198,0.4)] dark:border-white/10 dark:shadow-[2px_2px_5px_rgba(0,0,0,0.45)]">
                {team.status}
              </Badge>
            </div>
            {/* Show linked project if this team is auto-synced from a project */}
            {team.linkedProjectId && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-gray-100/70 px-2.5 py-1 text-[10px] font-medium text-indigo-700 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.4)] dark:border-white/10 dark:bg-black/20 dark:text-indigo-300 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45)]">
                  <FolderIcon className="w-3 h-3" />
                  {team.linkedProjectName || 'Project Team'}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(team)}
              className="h-8 w-8 rounded-lg bg-white/70 text-blue-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-blue-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:text-blue-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:hover:text-blue-300 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
              aria-label={`Edit ${team.name}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(team.id!)}
              className="h-8 w-8 rounded-lg bg-white/70 text-red-600 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 hover:text-red-700 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:text-red-400 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:hover:text-red-300 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
              aria-label={`Delete ${team.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
            {team.description}
          </p>
        )}

        {/* Team Details - Stats row recessed into the plate */}
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-slate-200/70 bg-gray-100/70 px-3 py-2.5 shadow-[inset_3px_3px_7px_rgba(163,177,198,0.35)] dark:border-white/10 dark:bg-black/20 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.45)]">
          {/* Team Leader */}
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-[2px_2px_4px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-xs">Leader:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate max-w-[120px]">{team.leaderName || 'Unassigned'}</span>
          </div>

          {/* Member Count */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-[2px_2px_4px_rgba(163,177,198,0.45)] dark:bg-white/5 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
              <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-xs">Members:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{memberCount}</span>
          </div>
        </div>

        {/* Member Avatar Previews */}
        {memberCount > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Team Members</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
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
                  className="border-2 border-white shadow-[2px_2px_5px_rgba(163,177,198,0.5)] dark:border-[#0B1430] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                  title={member.name}
                />
              ))}
              {/* Show count indicator for additional members */}
              {remainingCount > 0 && (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-semibold text-gray-600 shadow-[2px_2px_5px_rgba(163,177,198,0.5)] dark:border-[#0B1430] dark:bg-white/5 dark:text-gray-400 dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
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
          <div className="mt-4 border-t border-slate-200/70 pt-3 text-[11px] text-gray-400 dark:border-white/10 dark:text-gray-500">
            Created {new Date(team.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
