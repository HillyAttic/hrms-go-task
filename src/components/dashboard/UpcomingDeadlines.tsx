import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Task } from '@/types/task.types';

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
    .slice(0, 5);

  const getDaysUntilDue = (dueDate: Date) =>
    Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400';
    if (days <= 3) return 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400';
    if (days <= 7) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400';
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days`;
    const weeks = Math.ceil(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  };

  return (
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-slate-200/80 bg-white/70 p-5 shadow-[6px_6px_14px_rgba(148,163,199,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.55)]">
      <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-900 dark:text-white">
          <CalendarDays className="h-4 w-4 text-indigo-500/70" />
          Upcoming Deadlines
        </h3>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {upcomingTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <CalendarDays className="h-9 w-9 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">No upcoming deadlines</p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            You don&apos;t have any deadlines in the next 30 days.
          </p>
        </div>
      ) : (
        <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {upcomingTasks.map((task) => {
            const daysUntil = getDaysUntilDue(task.dueDate!);
            return (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition-all hover:border-slate-200/70 hover:bg-white/80 hover:shadow-[2px_2px_5px_rgba(148,163,199,0.35),-2px_-2px_5px_rgba(255,255,255,0.9)] active:shadow-[inset_2px_2px_4px_rgba(148,163,199,0.35)] dark:hover:border-white/10 dark:hover:bg-white/[0.08] dark:hover:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{task.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Due{' '}
                    {new Date(task.dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getUrgencyColor(daysUntil)}`}
                >
                  {daysUntil <= 1 && <TriangleAlert className="h-3 w-3" />}
                  {formatDaysUntil(daysUntil)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
