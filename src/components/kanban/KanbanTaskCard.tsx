'use client';

import React from 'react';
import { KanbanTask, KanbanStatus } from '@/types/kanban.types';
import { Card } from '@/components/ui/card';
import {
  CalendarIcon,
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
  variant?: 'default' | 'glass';
}

export function KanbanTaskCard({ task, onDragStart, onClick, onStatusChange, onDelete, onEdit, variant = 'default' }: KanbanTaskCardProps) {
  const glass = variant === 'glass';

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-400';
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
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getGlassPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-100/80 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300';
      case 'medium':
        return 'bg-amber-100/80 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300';
      case 'low':
        return 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300';
      default:
        return 'bg-slate-100/80 text-slate-500 dark:bg-white/10 dark:text-slate-300';
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
      className={glass
        ? 'group mb-2.5 cursor-move rounded-2xl border border-white/70 bg-white/75 p-3.5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300/70 hover:shadow-[0_18px_35px_-18px_rgba(4,71,253,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-indigo-400/40'
        : 'p-2.5 mb-2 cursor-move hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500'}
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
        {glass ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${getGlassPriorityStyles(task.priority)}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {task.priority || 'medium'}
          </span>
        ) : (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${getPriorityBgColor(task.priority)}`}>
            <FlagIcon className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
            <span className={`text-xs font-medium capitalize ${getPriorityColor(task.priority)}`}>
              {task.priority || 'medium'}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleEdit}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
            title="Edit task"
            aria-label="Edit task"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
            title="Delete task"
            aria-label="Delete task"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className={`mb-1 text-sm font-semibold leading-snug text-slate-900 line-clamp-1 dark:text-white ${glass ? '' : 'font-semibold'}`}>
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="mb-2 text-xs leading-relaxed text-slate-500 line-clamp-1 dark:text-slate-400">
          {task.description}
        </p>
      )}

      {/* Footer with Date and Action Buttons */}
      <div className={`flex items-center justify-between mt-2 pt-2 ${glass ? 'border-t border-white/60 dark:border-white/10' : 'border-t border-gray-100 dark:border-gray-700'}`}>
        {/* Due Date */}
        {glass ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isOverdue ? 'bg-rose-100/70 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-slate-100/70 text-slate-600 dark:bg-white/5 dark:text-slate-300'}`}>
            <CalendarIcon className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            <CalendarIcon className="w-3 h-3" />
            <span className="text-xs">
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {task.status === 'todo' && (
          glass ? (
            <button
              onClick={(e) => handleStatusChange(e, 'in-progress')}
              className="rounded-full bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              Start
            </button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={(e) => handleStatusChange(e, 'in-progress')}
            >
              WIP
            </Button>
          )
        )}

        {task.status === 'in-progress' && (
          glass ? (
            <button
              onClick={(e) => handleStatusChange(e, 'completed')}
              className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              Complete
            </button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={(e) => handleStatusChange(e, 'completed')}
            >
              Done
            </Button>
          )
        )}

        {task.status === 'completed' && (
          <div className={`flex items-center gap-1 ${glass ? 'rounded-full bg-emerald-100/70 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full'}`}>
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span className={`text-xs font-medium ${glass ? '' : 'text-green-600 dark:text-green-400'}`}>Completed</span>
          </div>
        )}
      </div>
    </Card>
  );
}
