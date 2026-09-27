import React from 'react';
import { RecurringTask } from '@/services/recurring-task.service';
import { Badge } from '@/components/ui/badge';
import {
  PencilIcon, TrashIcon, PauseIcon, PlayIcon, EyeIcon,
  UserGroupIcon, CalendarIcon, CalendarDaysIcon, ArrowRightIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

interface RecurringTaskListViewProps {
  tasks: RecurringTask[];
  onEdit: (task: RecurringTask) => void;
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onViewReport?: (task: RecurringTask) => void;
  selected?: string[];
  onSelect?: (id: string) => void;
  canManageTasks?: boolean; // Whether user can edit/delete/pause tasks
  teamNames?: Record<string, string>; // Map of teamId to team name
  // Action button handlers (for team-member-mapped tasks)
  currentUserId?: string;
  canViewAllTasks?: boolean;
  isManager?: boolean;
  onClientsClick?: (task: RecurringTask) => void;
  onTeamClick?: (task: RecurringTask) => void;
  onPlanClick?: (task: RecurringTask) => void;
  onDelegateClick?: (task: RecurringTask) => void;
  onScheduleClick?: (task: RecurringTask) => void;
  onGoToReportsClick?: (task: RecurringTask) => void;
}

/**
 * RecurringTaskListView Component
 * Displays recurring tasks in a table/list format
 */
export function RecurringTaskListView({
  tasks,
  onEdit,
  onDelete,
  onPause,
  onResume,
  onViewReport,
  selected = [],
  onSelect,
  canManageTasks = true,
  teamNames = {},
  currentUserId,
  canViewAllTasks = false,
  isManager = false,
  onClientsClick,
  onTeamClick,
  onPlanClick,
  onDelegateClick,
  onScheduleClick,
  onGoToReportsClick,
}: RecurringTaskListViewProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-muted text-foreground dark:text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-foreground text-background dark:bg-foreground dark:text-background';
      case 'pending':
        return 'bg-muted text-foreground dark:text-muted-foreground';
      default:
        return 'bg-muted text-foreground dark:text-muted-foreground';
    }
  };

  const formatDate = (date?: Date | any) => {
    if (!date) return 'N/A';
    try {
      // Handle Firestore Timestamp objects
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      // Check if date is valid
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Render the action buttons row for team-member-mapped tasks
  const renderActionButtons = (task: RecurringTask, containerClassName?: string) => {
    const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;
    if (!hasTeamMemberMapping) return null;

    const userMapping = currentUserId ? task.teamMemberMappings?.find(m => m.userId === currentUserId) : null;
    const clientCount = userMapping
      ? userMapping.clientIds.length
      : canViewAllTasks
        ? task.teamMemberMappings!.reduce((s, m) => s + m.clientIds.length, 0)
        : 0;

    const hasClientsButton = clientCount > 0;
    const hasTeamButton = canViewAllTasks;
    const hasPlanButton = !!userMapping && clientCount > 0;
    const hasDelegateButton = (!!userMapping || canViewAllTasks) && clientCount > 0;
    const hasScheduleButton = isManager;
    const hasViewReportButton = canViewAllTasks;
    const hasGoToReportsButton = isManager;

    if (!hasClientsButton && !hasTeamButton && !hasPlanButton && !hasDelegateButton && !hasScheduleButton && !hasViewReportButton && !hasGoToReportsButton) {
      return null;
    }

    return (
      <div className={containerClassName ?? "px-6 pb-3 pt-2 flex flex-wrap gap-2 border-t border-border/50 justify-end"}>
        {hasClientsButton && onClientsClick && (
          <button
            onClick={() => onClientsClick(task)}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <UserGroupIcon className="w-4 h-4" />
            Clients ({clientCount})
          </button>
        )}
        {hasTeamButton && onTeamClick && (
          <button
            onClick={() => onTeamClick(task)}
            className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <UserGroupIcon className="w-4 h-4" />
            Team ({task.teamMemberMappings?.length || 0})
          </button>
        )}
        {hasPlanButton && onPlanClick && (
          <button
            onClick={() => onPlanClick(task)}
            className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <CalendarIcon className="w-4 h-4" />
            Plan
          </button>
        )}
        {hasDelegateButton && onDelegateClick && (
          <button
            onClick={() => onDelegateClick(task)}
            className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <ArrowRightIcon className="w-4 h-4" />
            Delegate
          </button>
        )}
        {hasScheduleButton && onScheduleClick && (
          <button
            onClick={() => onScheduleClick(task)}
            className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <CalendarDaysIcon className="w-4 h-4" />
            Schedule
          </button>
        )}
        {hasViewReportButton && onViewReport && (
          <button
            onClick={() => onViewReport(task)}
            className="px-3 py-1.5 text-xs font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <ChartBarIcon className="w-4 h-4" />
            View Report
          </button>
        )}
        {hasGoToReportsButton && onGoToReportsClick && (
          <button
            onClick={() => onGoToReportsClick(task)}
            className="px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-gray-600 rounded-md transition-colors flex items-center gap-1 min-h-[35px]"
          >
            <ArrowRightIcon className="w-4 h-4" />
            Go to Reports
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted text-sm font-medium text-muted-foreground border-b border-border">
          {onSelect && <div className="col-span-1">Select</div>}
          <div className={onSelect ? "col-span-3" : "col-span-3"}>Title</div>
          <div className="col-span-2">Pattern</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-2">{canManageTasks ? 'Actions' : 'Team'}</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card">
            <div
              className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm transition-colors ${
                selected.includes(task.id!)
                  ? 'bg-foreground/10 dark:bg-foreground/20'
                  : 'hover:bg-muted/50'
              }`}
            >
              {/* Select Checkbox */}
              {onSelect && (
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(task.id!)}
                    onChange={() => onSelect(task.id!)}
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-primary"
                  />
                </div>
              )}

              {/* Title */}
              <div className={onSelect ? "col-span-3" : "col-span-3"}>
                <div className="font-medium text-foreground flex items-center gap-2">
                  {task.title}
                  {task.isPaused && (
                    <Badge variant="secondary" className="text-xs">
                      Paused
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground text-xs mt-1 line-clamp-1">
                  {task.description}
                </div>
              </div>

              {/* Recurrence Pattern */}
              <div className="col-span-2 text-muted-foreground flex items-center">
                {task.recurrencePattern}
              </div>

              {/* Status */}
              <div className="col-span-1 flex items-center">
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('-', ' ')}
                </Badge>
              </div>

              {/* Priority */}
              <div className="col-span-1 flex items-center">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>

              {/* Due Date */}
              <div className="col-span-2">
                <div className="text-muted-foreground flex items-center">
                  {formatDate(task.dueDate)}
                </div>
              </div>

              {/* Actions or Team */}
              <div className="col-span-2 flex items-center gap-2">
                {onViewReport && (
                  <button
                    onClick={() => onViewReport(task)}
                    className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1"
                    aria-label="View report"
                    title="View Report"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                )}
                {canManageTasks ? (
                  <>
                    {task.isPaused ? (
                      <button
                        onClick={() => onResume(task.id!)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                        aria-label="Resume task"
                        title="Resume"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onPause(task.id!)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                        aria-label="Pause task"
                        title="Pause"
                      >
                        <PauseIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(task)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      aria-label="Edit task"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(task.id!)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                      aria-label="Delete task"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    {task.teamId && teamNames[task.teamId] ? (
                      <span className="text-sm font-medium">{teamNames[task.teamId]}</span>
                    ) : task.teamMemberMappings && task.teamMemberMappings.length > 0 ? (
                      <span className="text-sm font-medium">
                        {task.teamMemberMappings.length} member{task.teamMemberMappings.length > 1 ? 's' : ''} assigned
                      </span>
                    ) : task.teamId ? (
                      <span className="text-sm text-muted-foreground">Team ID: {task.teamId}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No team assigned</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {renderActionButtons(task)}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-card rounded-lg border border-border p-4 space-y-3 ${
              selected.includes(task.id!) ? 'ring-2 ring-primary' : ''
            }`}
          >
            {/* Title and Paused Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-base">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              {task.isPaused && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Paused
                </Badge>
              )}
            </div>

            {/* Status and Priority Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('-', ' ')}
              </Badge>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>

            {/* Task Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pattern:</span>
                <span className="text-foreground font-medium">
                  {task.recurrencePattern}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="text-foreground font-medium">
                  {formatDate(task.dueDate)}
                </span>
              </div>
              {!canManageTasks && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team:</span>
                  <span className="text-foreground font-medium">
                    {task.teamId && teamNames[task.teamId] ? (
                      teamNames[task.teamId]
                    ) : task.teamMemberMappings && task.teamMemberMappings.length > 0 ? (
                      `${task.teamMemberMappings.length} member${task.teamMemberMappings.length > 1 ? 's' : ''} assigned`
                    ) : task.teamId ? (
                      <span className="text-muted-foreground">Team ID: {task.teamId}</span>
                    ) : (
                      <span className="text-muted-foreground italic">No team assigned</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(canManageTasks || onViewReport) && (
              <div className="col-span-2 flex items-center justify-end gap-3 pt-2 border-t border-border">
                {onViewReport && (
                  <button
                    onClick={() => onViewReport(task)}
                    className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-2"
                    aria-label="View report"
                    title="View Report"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                )}
                {canManageTasks && (task.isPaused ? (
                  <button
                    onClick={() => onResume(task.id!)}
                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-2"
                    aria-label="Resume task"
                    title="Resume"
                  >
                    <PlayIcon className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onPause(task.id!)}
                    className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-2"
                    aria-label="Pause task"
                    title="Pause"
                  >
                    <PauseIcon className="w-5 h-5" />
                  </button>
                ))}
                {canManageTasks && (
                  <button
                    onClick={() => onEdit(task)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2"
                    aria-label="Edit task"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                )}
                {canManageTasks && (
                  <button
                    onClick={() => onDelete(task.id!)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2"
                    aria-label="Delete task"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            {/* Action buttons for team-member-mapped tasks (mobile) */}
            {renderActionButtons(task, "pt-2 flex flex-wrap gap-2 border-t border-border/50")}
          </div>
        ))}
      </div>
    </>
  );
}
