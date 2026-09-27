import React from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { UserAvatar } from './UserAvatar';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TODO:
      return 'bg-foreground text-background';
    case TaskStatus.IN_PROGRESS:
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case TaskStatus.COMPLETED:
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    default:
      return 'bg-muted text-foreground';
  }
};

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.HIGH:
      return 'bg-destructive/15 text-destructive';
    case TaskPriority.MEDIUM:
      return 'bg-warning/15 text-warning';
    case TaskPriority.LOW:
      return 'bg-success/15 text-success';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div 
      className="bg-card rounded-lg border-2 border-border p-4 shadow-hard transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-black dark:text-white truncate">{task.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
      </div>
      
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex flex-wrap gap-2 mb-3">
        {task.category && (
          <span className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs px-2 py-1 rounded">
            {task.category}
          </span>
        )}
        
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
          {task.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <UserAvatar users={task.assignedTo} size="sm" />
          <span className="text-xs text-muted-foreground">
            {formatDate(task.dueDate)}
          </span>
        </div>
        
        <div className="flex items-center text-muted-foreground">
          <span className="mr-1">💬</span>
          <span className="text-xs">{task.commentCount}</span>
        </div>
      </div>
    </div>
  );
};