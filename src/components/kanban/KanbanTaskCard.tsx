'use client';

import React from 'react';
import { KanbanTask, KanbanStatus } from '@/types/kanban.types';
import { Card } from '@/components/ui/card';
import { 
  CalendarIcon, 
  ChatBubbleLeftIcon, 
  PaperClipIcon,
  FlagIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface KanbanTaskCardProps {
  task: KanbanTask;
  onDragStart: (e: React.DragEvent, task: KanbanTask) => void;
  onClick: (task: KanbanTask) => void;
  onStatusChange?: (taskId: string, newStatus: KanbanStatus) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: KanbanTask) => void;
}

export function KanbanTaskCard({ task, onDragStart, onClick, onStatusChange, onDelete, onEdit }: KanbanTaskCardProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getPriorityBgColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30';
      default:
        return 'bg-muted';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  const handleStatusChange = (e: React.MouseEvent, newStatus: KanbanStatus) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
      className="p-2.5 mb-2 cursor-move hover:shadow-hard hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task);
        }
      }}
    >
      {/* Header with Priority and Actions */}
      <div className="flex items-center justify-between mb-1.5">
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${getPriorityBgColor(task.priority)}`}>
          <FlagIcon className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
          <span className={`text-xs font-medium capitalize ${getPriorityColor(task.priority)}`}>
            {task.priority || 'medium'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleEdit}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Edit task"
          >
            <PencilIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-500" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
            title="Delete task"
          >
            <TrashIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Footer with Date and Action Buttons */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        {/* Due Date */}
        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
          <CalendarIcon className="w-3 h-3" />
          <span className="text-xs">
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Action Buttons */}
        {task.status === 'todo' && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={(e) => handleStatusChange(e, 'in-progress')}
          >
            WIP
          </Button>
        )}
        
        {task.status === 'in-progress' && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={(e) => handleStatusChange(e, 'completed')}
          >
            Done
          </Button>
        )}
        
        {task.status === 'completed' && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Completed</span>
          </div>
        )}
      </div>
    </Card>
  );
}
