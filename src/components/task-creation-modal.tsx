'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { authenticatedFetch } from '@/lib/api-client';

interface TaskCreationModalProps {
  open: boolean;
  onClose: () => void;
  onTaskCreated?: (task: Task) => void;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function TaskCreationModal({ open, onClose, onTaskCreated }: TaskCreationModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: '',
    assignedTo: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees when modal opens
  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await authenticatedFetch('/api/manager-hierarchy/my-employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : new Date(),
        assignedTo: formData.assignedTo,
        category: undefined,
        commentCount: 0
      };
      
      const newTask = await taskApi.createTask(taskData);
      onTaskCreated?.(newTask);
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ submit: 'Failed to create task. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: '',
      assignedTo: []
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && !formData.assignedTo.includes(selectedId)) {
      setFormData(prev => ({
        ...prev,
        assignedTo: [...prev.assignedTo, selectedId]
      }));
    }
  };

  const removeEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(id => id !== employeeId)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Create New Task</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-muted-foreground">
              Task Title *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter task title"
              className={errors.title ? 'border-red-300 dark:border-red-700' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description (optional)"
              rows={3}
              className={errors.description ? 'border-red-300 dark:border-red-700' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="">Select status</option>
                <option value={TaskStatus.TODO}>To Do</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium text-muted-foreground">
                Priority
              </label>
              <Select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
              >
                <option value="">Select priority</option>
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium text-muted-foreground">
              Due Date
            </label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="assignee" className="text-sm font-medium text-muted-foreground">
              Assign To
            </label>
            <Select
              id="assignee"
              value=""
              onChange={handleEmployeeSelect}
              disabled={loadingEmployees}
            >
              <option value="">
                {loadingEmployees ? 'Loading employees...' : 'Select employee to assign'}
              </option>
              {employees
                .filter(emp => !formData.assignedTo.includes(emp.id))
                .map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
            </Select>
            
            {formData.assignedTo.length > 0 && (
              <div className="mt-2 space-y-1">
                {formData.assignedTo.map(empId => {
                  const emp = employees.find(e => e.id === empId);
                  return emp ? (
                    <div
                      key={empId}
                      className="flex items-center justify-between bg-muted rounded px-3 py-2"
                    >
                      <span className="text-sm">{emp.name}</span>
                      <button
                        type="button"
                        onClick={() => removeEmployee(empId)}
                        className="text-red-600 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="text-white">
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}