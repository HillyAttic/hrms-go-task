import React from 'react';
import { Task } from '@/types/task.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  PencilSquareIcon,
  TrashIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onView?: (task: Task) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

/**
 * TaskCard Component
 * Displays task information with priority badges, overdue indicators, and action buttons
 * Validates Requirements: 2.4, 2.5, 2.6, 2.9
 */
export function TaskCard({ task, onEdit, onDelete, onToggleComplete, onView, selected = false, onSelect }: TaskCardProps) {
  // Check if task is overdue (Requirement 2.5)
  const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
  
  // Get priority badge variant and color (Requirement 2.9)
  const getPriorityVariant = (priority: string): 'success' | 'warning' | 'danger' => {
    switch (priority) {
      case 'low':
        return 'success'; // green
      case 'medium':
        return 'warning'; // yellow
      case 'high':
        return 'warning'; // orange (we'll customize this)
      case 'urgent':
        return 'danger'; // red
      default:
        return 'warning';
    }
  };

  // Get custom color classes for high priority (orange)
  const getPriorityClasses = (priority: string): string => {
    if (priority === 'high') {
      return 'border-transparent bg-warning/15 text-warning';
    }
    return '';
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

  const isCompleted = task.status === 'completed';

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${isOverdue ? 'border-destructive bg-destructive/5' : ((task.commentCount != null && task.commentCount > 0) || (task.attachments && task.attachments.length > 0)) ? 'border-info bg-info/5' : ''} ${selected ? 'ring-2 ring-ring' : ''}`}>
      <CardContent className="p-6">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="absolute top-4 left-4 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(task.id, e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-ring cursor-pointer"
              aria-label={`Select ${task.title}`}
            />
          </div>
        )}
        
        {/* Header with Title and Priority Badge */}
        <div className={`flex items-start justify-between mb-3 ${onSelect ? 'ml-8' : ''}`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-lg font-semibold truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              {/* Priority Badge - Requirement 2.9 */}
              <Badge
                variant={getPriorityVariant(task.priority)}
                className={getPriorityClasses(task.priority)}
              >
                {task.priority.toUpperCase()}
              </Badge>
            </div>
            
            {/* Overdue Indicator - Requirement 2.5 */}
            {isOverdue && (
              <div className="flex items-center gap-1 text-red-600 text-sm font-medium mb-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>Overdue</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onView && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onView(task)}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                aria-label={`View details for ${task.title}`}
                title="View details, comments & attachments"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
            )}
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
              onClick={() => onDelete(task.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${task.title}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description - Requirement 2.4 */}
        {task.description && (
          <p className={`text-sm mb-4 line-clamp-2 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
            {task.description}
          </p>
        )}

        {/* Task Details */}
        <div className="space-y-3 mb-4">
          {/* Due Date - Requirement 2.4 */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              Due: {formatDate(task.dueDate)}
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

          {/* Assigned Users - Requirement 2.4 */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Assigned to:</span>
              <div className="flex -space-x-2">
                {task.assignedTo.slice(0, 3).map((userId, index) => (
                  <Avatar
                    key={userId}
                    fallback={getInitials(userId)}
                    size="sm"
                    className="border-2 border-white"
                  />
                ))}
                {task.assignedTo.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                    +{task.assignedTo.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachments & comments indicators */}
          {((task.attachments && task.attachments.length > 0) || (task.commentCount != null && task.commentCount > 0)) && (
            <div className="flex items-center gap-2 flex-wrap">
              {task.attachments && task.attachments.length > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                  <PaperClipIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {task.attachments.length} attachment{task.attachments.length !== 1 ? 's' : ''}
                </span>
              )}
              {task.commentCount != null && task.commentCount > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full px-2 py-0.5">
                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {task.commentCount} comment{task.commentCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer - Requirement 2.6 */}
        <div className="pt-4 border-t flex gap-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(task)}
              className="flex-shrink-0 text-purple-600 border-purple-200 hover:bg-purple-50"
              aria-label={`View details for ${task.title}`}
              title="View details, comments & attachments"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              Details
            </Button>
          )}
          <Button
            variant={isCompleted ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => onToggleComplete(task.id)}
            className="flex-1"
            aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isCompleted ? (
              <>
                <CheckCircleSolidIcon className="w-4 h-4 mr-2" />
                Completed
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>
        </div>

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
