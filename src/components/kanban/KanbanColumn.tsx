'use client';

import React from 'react';
import { KanbanTask, KanbanStatus } from '@/types/kanban.types';
import { KanbanTaskCard } from './KanbanTaskCard';

interface KanbanColumnProps {
  id: KanbanStatus;
  title: string;
  color: string;
  tasks: KanbanTask[];
  onDragStart: (e: React.DragEvent, task: KanbanTask) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: KanbanStatus) => void;
  onTaskClick: (task: KanbanTask) => void;
  onStatusChange?: (taskId: string, newStatus: KanbanStatus) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: KanbanTask) => void;
  compact?: boolean;
  variant?: 'default' | 'glass';
}

const GLASS_ACCENTS: Record<KanbanStatus, string> = {
  todo: 'from-amber-400 to-orange-500',
  'in-progress': 'from-sky-400 to-indigo-500',
  completed: 'from-emerald-400 to-teal-500',
};

export function KanbanColumn({
  id,
  title,
  color,
  tasks,
  onDragStart,
  onDragOver,
  onDrop,
  onTaskClick,
  onStatusChange,
  onDelete,
  onEdit,
  compact = false,
  variant = 'default',
}: KanbanColumnProps) {
  const glass = variant === 'glass';

  return (
    <div
      className={glass
        ? `relative flex min-h-[560px] w-full flex-col rounded-3xl border border-white/60 bg-white/45 p-4 shadow-[0_10px_30px_-16px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-white/[0.04] ${compact ? 'max-h-[400px] overflow-y-auto' : ''}`
        : `${color} rounded-lg p-4 ${compact ? 'min-h-[250px] max-h-[400px] overflow-y-auto' : 'min-h-[600px]'} w-full transition-all`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between mb-4 pb-3 ${glass ? 'border-b border-white/50 dark:border-white/10' : 'border-b border-gray-300 dark:border-gray-600'}`}>
        <div className="flex items-center gap-2.5">
          {glass && (
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${GLASS_ACCENTS[id]}`}
            />
          )}
          <h3 className={`${glass ? 'text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200' : 'font-bold text-lg text-gray-800'}`}>
            {title}
          </h3>
        </div>
        <span
          className={glass
            ? 'rounded-full border border-white/60 bg-white/60 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
            : 'bg-white dark:bg-gray-dark bg-opacity-70 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 dark:text-gray-300'}
        >
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div
            className={glass
              ? 'rounded-2xl border border-dashed border-slate-200/90 bg-white/30 py-12 text-center text-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500'
              : 'text-center py-12 text-gray-400'}
          >
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm">No tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onClick={onTaskClick}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onEdit={onEdit}
              variant={variant}
            />
          ))
        )}
      </div>
    </div>
  );
}
