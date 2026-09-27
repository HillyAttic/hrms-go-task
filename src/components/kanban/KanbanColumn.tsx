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
}

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
}: KanbanColumnProps) {
  return (
    <div
      className={`${color} rounded-lg border-2 border-border p-4 ${compact ? 'min-h-[250px] max-h-[400px] overflow-y-auto' : 'min-h-[600px]'} w-full transition-all`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-border">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold text-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
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
            />
          ))
        )}
      </div>
    </div>
  );
}
