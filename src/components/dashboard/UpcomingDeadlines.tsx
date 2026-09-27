import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Task } from '@/types/task.types';
import { CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UpcomingDeadlinesProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function UpcomingDeadlines({ tasks, onTaskClick }: UpcomingDeadlinesProps) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingTasks = tasks
    .filter((task) => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 8);

  const getDaysUntilDue = (dueDate: Date) => {
    const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-destructive bg-destructive/10';
    if (days <= 3) return 'text-warning bg-warning/10';
    if (days <= 7) return 'text-warning bg-warning/10';
    return 'text-info bg-info/10';
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days`;
    if (days <= 14) return `${Math.ceil(days / 7)} week${Math.ceil(days / 7) > 1 ? 's' : ''}`;
    return `${Math.ceil(days / 7)} weeks`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines in the next 30 days</p>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                Showing {upcomingTasks.length} task{upcomingTasks.length !== 1 ? 's' : ''} due in the next 30 days
              </div>
              {upcomingTasks.map((task) => {
                const daysUntil = getDaysUntilDue(task.dueDate!);
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task.id)}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-ring cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{task.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {new Date(task.dueDate!).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: new Date(task.dueDate!).getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                        })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getUrgencyColor(daysUntil)}`}>
                      {daysUntil <= 1 && <ExclamationTriangleIcon className="w-3 h-3" />}
                      <span className="text-xs font-medium whitespace-nowrap">
                        {formatDaysUntil(daysUntil)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
