'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KanbanTask, KanbanStatus } from '@/types/kanban.types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => void;
  editTask?: KanbanTask | null;
}

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const FIELD =
  'w-full rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500';

const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200';

export function AddTaskModal({ isOpen, onClose, onSave, editTask }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as KanbanStatus,
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Update form when editTask changes
  React.useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title,
        description: editTask.description || '',
        status: editTask.status,
        dueDate: new Date(editTask.dueDate).toISOString().split('T')[0],
        priority: editTask.priority || 'medium',
      });
    }
  }, [editTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please enter a task description');
      return;
    }

    const taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'> = {
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status,
      dueDate: new Date(formData.dueDate),
      priority: formData.priority,
      commentsCount: editTask?.commentsCount || 0,
      attachmentsCount: editTask?.attachmentsCount || 0,
      assignee: editTask?.assignee || {
        name: 'Unassigned',
        role: 'Team Member',
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      },
      tags: editTask?.tags || [],
    };

    onSave(taskData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {editTask ? 'Edit Task' : 'Add New Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className={LABEL}>
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={FIELD}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={LABEL}>
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={FIELD}
              placeholder="Enter task description"
              rows={3}
              required
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as KanbanStatus })}
                className={FIELD}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className={LABEL}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className={FIELD}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className={LABEL}>
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className={FIELD}
            />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full rounded-xl border-slate-200/80 bg-white/60 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 sm:w-auto"
            >
              {editTask ? 'Update Task' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
