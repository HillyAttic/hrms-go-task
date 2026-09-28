import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'pending' | 'in-progress' | 'completed';
}

interface TaskStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, status: 'todo' | 'pending' | 'in-progress' | 'completed') => Promise<void>;
  task: Task | null;
  isLoading?: boolean;
}

/**
 * TaskStatusModal Component
 * Simple modal for employees to update only the task status
 */
export function TaskStatusModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading = false,
}: TaskStatusModalProps) {
  const [status, setStatus] = useState<'todo' | 'pending' | 'in-progress' | 'completed'>('pending');

  // Update status when task changes
  useEffect(() => {
    if (task) {
      setStatus(task.status);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    try {
      await onSubmit(task.id, status);
      onClose();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleClose = () => {
    if (task) {
      setStatus(task.status);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Task Status</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title (Read-only) */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Task</Label>
            <p className="mt-1 text-sm text-foreground font-medium">{task?.title}</p>
          </div>

          {/* Status Selector */}
          <div>
            <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">
              Status
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'todo' | 'pending' | 'in-progress' | 'completed')}
              className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="todo">To Do</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isLoading} 
              disabled={isLoading || status === task?.status}
              className="text-white"
            >
              Update Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
