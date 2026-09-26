import React from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { TaskCard } from './TaskCard';

interface StatusSectionProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const getStatusTitle = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TODO:
      return 'To Do';
    case TaskStatus.IN_PROGRESS:
      return 'In Progress';
    case TaskStatus.COMPLETED:
      return 'Completed';
    default:
      return status;
  }
};

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TODO:
      return 'border-blue-500';
    case TaskStatus.IN_PROGRESS:
      return 'border-yellow-500';
    case TaskStatus.COMPLETED:
      return 'border-green-500';
    default:
      return 'border-gray-500';
  }
};

export const StatusSection: React.FC<StatusSectionProps> = ({ 
  status, 
  tasks, 
  onTaskClick 
}) => {
  return (
    <div className="flex flex-col">
      <div className={`flex items-center mb-4 pb-2 border-b-2 ${getStatusColor(status)}`}>
        <h2 className="text-xl font-bold text-black dark:text-white">
          {getStatusTitle(status)} 
          <span className="ml-2 bg-gray-200 dark:bg-muted text-gray-700 dark:text-gray-300 text-sm font-medium px-2.5 py-0.5 rounded">
            {tasks.length}
          </span>
        </h2>
      </div>
      
      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onClick={() => onTaskClick(task)} 
          />
        ))}
      </div>
    </div>
  );
};