import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Task } from '@/types/task.types';
import { ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface TaskOverviewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function TaskOverview({ tasks, onTaskClick }: TaskOverviewProps) {
  const recentTasks = tasks.slice(0, 5);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'in-progress':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') {
      return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks available</p>
          ) : (
            recentTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(task.priority)}
                    <h4 className="font-medium text-foreground truncate">{task.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <ClockIcon className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : 'No due date'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ml-2 ${getStatusColor(task.status)}`}>
                  {task.status.replace('-', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
