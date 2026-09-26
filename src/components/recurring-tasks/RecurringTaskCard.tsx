import { RecurringTask } from '@/services/recurring-task.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  PencilSquareIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  CheckCircleIcon as CheckCircleOutlineIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface RecurringTaskCardProps {
  task: RecurringTask;
  onEdit: (task: RecurringTask) => void;
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  // Action button handlers (for team-member-mapped tasks)
  currentUserId?: string;
  canViewAllTasks?: boolean;
  isManager?: boolean;
  onClientsClick?: (task: RecurringTask) => void;
  onTeamClick?: (task: RecurringTask) => void;
  onPlanClick?: (task: RecurringTask) => void;
  onDelegateClick?: (task: RecurringTask) => void;
  onScheduleClick?: (task: RecurringTask) => void;
  onViewReport?: (task: RecurringTask) => void;
  onGoToReportsClick?: (task: RecurringTask) => void;
}

/**
 * RecurringTaskCard Component
 * Displays recurring task information with recurrence pattern, next occurrence, 
 * completion history, pause/resume controls, and progress indicator
 * Validates Requirements: 3.3, 3.6, 3.7, 3.9
 */
export function RecurringTaskCard({
  task,
  onEdit,
  onDelete,
  onPause,
  onResume,
  selected = false,
  onSelect,
  currentUserId,
  canViewAllTasks = false,
  isManager = false,
  onClientsClick,
  onTeamClick,
  onPlanClick,
  onDelegateClick,
  onScheduleClick,
  onViewReport,
  onGoToReportsClick,
}: RecurringTaskCardProps) {
  // Check if task is overdue
  const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
  
  // Get priority badge variant and color
  const getPriorityVariant = (priority: string): 'success' | 'warning' | 'danger' => {
    switch (priority) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'warning';
      case 'urgent':
        return 'danger';
      default:
        return 'warning';
    }
  };

  // Get custom color classes for high priority (orange)
  const getPriorityClasses = (priority: string): string => {
    if (priority === 'high') {
      return 'border-transparent bg-orange-100 text-orange-800 hover:bg-orange-200';
    }
    return '';
  };

  // Get recurrence pattern icon and label - Requirement 3.7
  const getRecurrenceInfo = (pattern: string) => {
    const icons = {
      daily: '📅',
      weekly: '📆',
      monthly: '🗓️',
      quarterly: '📊'
    };
    return {
      icon: icons[pattern as keyof typeof icons] || '🔄',
      label: pattern.charAt(0).toUpperCase() + pattern.slice(1)
    };
  };

  // Generate initials for assignee avatars
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate completion rate - Requirement 3.9
  const calculateCompletionRate = (): number => {
    if (!task.startDate || !task.dueDate) return 0;
    
    const totalCycles = calculateTotalCycles(
      task.startDate,
      task.dueDate,
      task.recurrencePattern
    );
    
    if (totalCycles === 0) return 0;
    return Math.round((task.completionHistory.length / totalCycles) * 100);
  };

  // Calculate total cycles between start and current date
  const calculateTotalCycles = (
    startDate: Date,
    currentDate: Date,
    pattern: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  ): number => {
    const diffTime = Math.abs(new Date(currentDate).getTime() - new Date(startDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (pattern) {
      case 'monthly':
        return Math.floor(diffDays / 30);
      case 'quarterly':
        return Math.floor(diffDays / 90);
      case 'half-yearly':
        return Math.floor(diffDays / 180);
      case 'yearly':
        return Math.floor(diffDays / 365);
      default:
        return 0;
    }
  };

  const isCompleted = task.status === 'completed';
  const recurrenceInfo = getRecurrenceInfo(task.recurrencePattern);
  const completionRate = calculateCompletionRate();

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${isOverdue ? 'border-red-300 bg-red-50/30' : ''} ${task.isPaused ? 'opacity-75' : ''} ${selected ? 'ring-2 ring-ring' : ''}`}>
      <CardContent className="p-6">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="absolute top-4 left-4 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => task.id && onSelect(task.id, e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-ring cursor-pointer"
              aria-label={`Select ${task.title}`}
            />
          </div>
        )}
        
        {/* Header with Title, Priority Badge, and Recurrence Pattern Badge */}
        <div className={`flex items-start justify-between mb-3 ${onSelect ? 'ml-8' : ''}`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className={`text-lg font-semibold truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              {/* Priority Badge */}
              <Badge
                variant={getPriorityVariant(task.priority)}
                className={getPriorityClasses(task.priority)}
              >
                {task.priority.toUpperCase()}
              </Badge>
              {/* Recurrence Pattern Badge - Requirement 3.7 */}
              <Badge variant="info" className="flex items-center gap-1">
                <span>{recurrenceInfo.icon}</span>
                <span>{recurrenceInfo.label}</span>
              </Badge>
              {/* Paused Badge */}
              {task.isPaused && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <PauseIcon className="w-3 h-3" />
                  <span>Paused</span>
                </Badge>
              )}
            </div>
            
            {/* Overdue Indicator */}
            {isOverdue && !task.isPaused && (
              <div className="flex items-center gap-1 text-red-600 text-sm font-medium mb-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>Overdue</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(task)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label={`Edit ${task.title}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(task.id!)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${task.title}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className={`text-sm mb-4 line-clamp-2 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
            {task.description}
          </p>
        )}

        {/* Task Details */}
        <div className="space-y-3 mb-4">
          {/* Next Occurrence Date - Requirement 3.3 */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span className={isOverdue && !task.isPaused ? 'text-red-600 font-medium' : ''}>
              Next: {formatDate(task.dueDate)}
            </span>
          </div>

          {/* Recurrence Period */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <ArrowPathIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {formatDate(task.startDate)}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
            <Badge variant={isCompleted ? 'success' : 'info'}>
              {task.status.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </Badge>
          </div>

          {/* Assigned Contacts */}
          {task.contactIds && task.contactIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Assigned to:</span>
              <div className="flex -space-x-2">
                {task.contactIds.slice(0, 3).map((contactId) => (
                  <Avatar
                    key={contactId}
                    fallback={getInitials(contactId)}
                    size="sm"
                    className="border-2 border-white"
                  />
                ))}
                {task.contactIds.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                    +{task.contactIds.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator - Requirement 3.9 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground font-medium">Completion Rate</span>
            <span className="text-foreground font-semibold">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            {/* Ink, not lime: a progress bar is a non-text indicator and needs 3:1
                against its track — lime on white is only 1.2:1. */}
            <div
              className="bg-foreground h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {task.completionHistory.length} of {calculateTotalCycles(task.startDate, task.dueDate, task.recurrencePattern)} cycles completed
          </div>
        </div>

        {/* Completion History Section - Requirement 3.6 */}
        {task.completionHistory.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleSolidIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Completions</span>
            </div>
            <div className="space-y-1">
              {task.completionHistory.slice(-3).reverse().map((record, index) => (
                <div key={index} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{formatDate(record.date)}</span>
                  <span className="text-gray-500 dark:text-gray-400">by {record.completedBy}</span>
                </div>
              ))}
              {task.completionHistory.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                  +{task.completionHistory.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pause/Resume Buttons - Requirement 3.5 */}
        <div className="pt-4 border-t space-y-2">
          {task.isPaused ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onResume(task.id!)}
              className="w-full"
              aria-label="Resume recurring task"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Resume Task
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPause(task.id!)}
              className="w-full"
              aria-label="Pause recurring task"
            >
              <PauseIcon className="w-4 h-4 mr-2" />
              Pause Task
            </Button>
          )}
        </div>

        {/* Action buttons for team-member-mapped tasks */}
        {(() => {
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
          if (!hasClientsButton && !hasTeamButton && !hasPlanButton && !hasDelegateButton && !hasScheduleButton && !hasViewReportButton && !hasGoToReportsButton) return null;
          return (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
              {hasClientsButton && onClientsClick && (
                <button onClick={() => onClientsClick(task)} className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <UserGroupIcon className="w-4 h-4" />Clients ({clientCount})
                </button>
              )}
              {hasTeamButton && onTeamClick && (
                <button onClick={() => onTeamClick(task)} className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <UserGroupIcon className="w-4 h-4" />Team ({task.teamMemberMappings?.length || 0})
                </button>
              )}
              {hasPlanButton && onPlanClick && (
                <button onClick={() => onPlanClick(task)} className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <CalendarIcon className="w-4 h-4" />Plan
                </button>
              )}
              {hasDelegateButton && onDelegateClick && (
                <button onClick={() => onDelegateClick(task)} className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <ArrowRightIcon className="w-4 h-4" />Delegate
                </button>
              )}
              {hasScheduleButton && onScheduleClick && (
                <button onClick={() => onScheduleClick(task)} className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <CalendarDaysIcon className="w-4 h-4" />Schedule
                </button>
              )}
              {hasViewReportButton && onViewReport && (
                <button onClick={() => onViewReport(task)} className="px-3 py-1.5 text-xs font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <ChartBarIcon className="w-4 h-4" />View Report
                </button>
              )}
              {hasGoToReportsButton && onGoToReportsClick && (
                <button onClick={() => onGoToReportsClick(task)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors flex items-center gap-1 min-h-[35px]">
                  <ArrowRightIcon className="w-4 h-4" />Go to Reports
                </button>
              )}
            </div>
          );
        })()}

        {/* Footer with creation date */}
        {task.createdAt && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Created {new Date(task.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
