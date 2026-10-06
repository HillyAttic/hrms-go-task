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
      return 'bg-blue-600 text-white';
    case TaskStatus.IN_PROGRESS:
      return 'bg-yellow-100 text-yellow-800';
    case TaskStatus.COMPLETED:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.HIGH:
      return 'bg-red-100 text-red-800';
    case TaskPriority.MEDIUM:
      return 'bg-orange-100 text-orange-800';
    case TaskPriority.LOW:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return dateFormatter.format(new Date(date));
  };

  return (
    <button
      type="button"
      className="w-full text-left bg-white dark:bg-gray-800 rounded-lg border border-stroke dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition duration-200 cursor-pointer transform hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2 gap-2 min-w-0">
        <span className="block font-semibold text-black dark:text-white truncate min-w-0">{task.title}</span>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${getPriorityColor(task.priority)}`}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex flex-wrap gap-2 mb-3">
        {task.category && (
          <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(task.dueDate)}
          </span>
        </div>
        
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <span className="mr-1" aria-hidden="true">💬</span>
          <span className="text-xs tabular-nums">
            {task.commentCount}
            <span className="sr-only"> comments</span>
          </span>
        </div>
      </div>
    </button>
  );
};