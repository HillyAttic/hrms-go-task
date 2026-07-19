import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task, TaskAttachment } from '@/types/task.types';
import { Employee, employeeService } from '@/services/employee.service';
import { Category, categoryService } from '@/services/category.service';
import { Project } from '@/services/project.service';
import { authenticatedFetch } from '@/lib/api-client';
import { validateFiles, ALLOWED_EXTENSIONS, MAX_FILES_PER_TASK } from '@/lib/task-attachment.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { XMarkIcon, PaperClipIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { isKeyboardAccessible } from '@/lib/accessibility';

// Form-specific schema matching the design requirements
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { message: 'Invalid priority value' }),
  status: z.enum(['pending', 'in-progress', 'completed']),
  assignedTo: z.string().min(1, 'At least one assignee is required'),
  categoryId: z.string().optional(),
  contactId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData & { pendingFiles?: File[]; existingAttachments?: TaskAttachment[]; removedAttachments?: TaskAttachment[] }) => Promise<void>;
  task?: Task | null;
  isLoading?: boolean;
}

/**
 * TaskModal Component
 * Form modal for creating and editing tasks with validation
 * Validates Requirements: 2.2, 2.3
 */
export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading = false,
}: TaskModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // File attachment state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<TaskAttachment[]>([]);
  const [removedAttachments, setRemovedAttachments] = useState<TaskAttachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      status: 'pending',
      assignedTo: '',
      categoryId: '',
      contactId: '',
    },
  });

  // Load employees for assignment (filtered by manager hierarchy)
  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        // Use the new API that respects manager hierarchy with authentication
        const response = await authenticatedFetch('/api/manager-hierarchy/my-employees');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch employees:', response.status, errorData);
          throw new Error(`Failed to fetch employees: ${response.status}`);
        }
        const employeesData = await response.json();
        
        // Convert API response to Employee format
        const formattedEmployees: Employee[] = employeesData.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
        }));
        
        setEmployees(formattedEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  // Load categories for category selection
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const activeCategories = await categoryService.getFiltered({ isActive: true });
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (isOpen) { 
      loadCategories();
    }
  }, [isOpen]);

  // Load projects for contact selection
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await authenticatedFetch('/api/projects?limit=1000');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const result = await response.json();
        setProjects(result.data || []);
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || selectedEmployees.some(e => e.id === employeeId)) return;

    const newSelectedEmployees = [...selectedEmployees, employee];
    setSelectedEmployees(newSelectedEmployees);
    setValue('assignedTo', newSelectedEmployees.map(e => e.id!).join(', '));
  };

  // Handle employee removal
  const handleEmployeeRemove = (employeeId: string) => {
    const newSelectedEmployees = selectedEmployees.filter(e => e.id !== employeeId);
    setSelectedEmployees(newSelectedEmployees);
    setValue('assignedTo', newSelectedEmployees.map(e => e.id!).join(', '));
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || selectedProjects.some(p => p.id === projectId)) return;

    const newSelectedProjects = [...selectedProjects, project];
    setSelectedProjects(newSelectedProjects);
    setValue('contactId', newSelectedProjects.map(p => p.id!).join(', '));
  };

  // Handle project removal
  const handleProjectRemove = (projectId: string) => {
    const newSelectedProjects = selectedProjects.filter(p => p.id !== projectId);
    setSelectedProjects(newSelectedProjects);
    setValue('contactId', newSelectedProjects.map(p => p.id!).join(', '));
  };

  // Update form when task prop changes (edit mode)
  useEffect(() => {
    if (task) {
      // Format date for input field
      const formattedDate = task.dueDate 
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '';
      
      reset({
        title: task.title,
        description: task.description || '',
        dueDate: formattedDate,
        priority: task.priority,
        status: task.status === 'todo' ? 'pending' : task.status,
        assignedTo: task.assignedTo?.join(', ') || '',
        categoryId: task.category || '',
        contactId: '',
      });

      // Set selected employees for display
      if (task.assignedTo && task.assignedTo.length > 0) {
        const taskEmployees = employees.filter(emp =>
          task.assignedTo.includes(emp.id!)
        );
        setSelectedEmployees(taskEmployees);
      }

      // Load existing attachments for edit mode
      setExistingAttachments(task.attachments || []);
      setPendingFiles([]);
      setRemovedAttachments([]);
      setFileError(null);
    } else {
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedTomorrow = tomorrow.toISOString().split('T')[0];
      
      reset({
        title: '',
        description: '',
        dueDate: formattedTomorrow,
        priority: 'medium',
        status: 'pending',
        assignedTo: '',
        categoryId: '',
        contactId: '',
      });
      setSelectedEmployees([]);
      setSelectedProjects([]);
    }
  }, [task, reset, employees]);

  const handleFormSubmit = async (data: TaskFormData) => {
    try {
      await onSubmit({
        ...data,
        pendingFiles,
        existingAttachments,
        removedAttachments,
      });
      reset();
      setPendingFiles([]);
      setExistingAttachments([]);
      setRemovedAttachments([]);
      setFileError(null);
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedEmployees([]);
    setSelectedProjects([]);
    setEmployeeSearch('');
    setProjectSearch('');
    setPendingFiles([]);
    setExistingAttachments([]);
    setRemovedAttachments([]);
    setFileError(null);
    onClose();
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalFiles = pendingFiles.length + existingAttachments.length + files.length;
    if (totalFiles > MAX_FILES_PER_TASK) {
      setFileError(`Maximum ${MAX_FILES_PER_TASK} files allowed (${existingAttachments.length + pendingFiles.length} already selected)`);
      return;
    }

    const error = validateFiles([...pendingFiles, ...files]);
    if (error) {
      setFileError(error);
      return;
    }

    setFileError(null);
    setPendingFiles(prev => [...prev, ...files]);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const handleRemoveExistingAttachment = (attachment: TaskAttachment) => {
    setExistingAttachments(prev => prev.filter(a => a.storagePath !== attachment.storagePath));
    setRemovedAttachments(prev => [...prev, attachment]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Task Title */}
          <div>
            <Input
              id="title"
              label="Task Title"
              {...register('title')}
              placeholder="Enter task title"
              error={errors.title?.message}
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter task description"
              rows={4}
              className="mt-1"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Attachments */}
          <div>
            <Label>Attachments</Label>
            <div className="mt-1 space-y-2">
              {/* File input trigger */}
              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <PaperClipIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Click to attach files (PNG, JPG, PDF, Excel, Word) - Max 10MB each
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />

              {/* File error */}
              {fileError && (
                <p className="text-sm text-red-600">{fileError}</p>
              )}

              {/* Existing attachments (edit mode) */}
              {existingAttachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Existing attachments</p>
                  {existingAttachments.map((attachment) => (
                    <div
                      key={attachment.storagePath}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{attachment.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(attachment.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingAttachment(attachment)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                        disabled={isLoading}
                        aria-label={`Remove ${attachment.name}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending files (new uploads) */}
              {pendingFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">New files to upload</p>
                  {pendingFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DocumentIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingFile(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                        disabled={isLoading}
                        aria-label={`Remove ${file.name}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File count */}
              {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
                <p className="text-xs text-gray-400">
                  {existingAttachments.length + pendingFiles.length}/{MAX_FILES_PER_TASK} files
                </p>
              )}
            </div>
          </div>

          {/* Due Date - Requirement 2.2 */}
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <input
              id="dueDate"
              type="date"
              {...register('dueDate')}
              min={getMinDate()}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              required
            />
            {errors.dueDate && (
              <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
            )}
          </div>

          {/* Priority Selector - Requirement 2.2 */}
          <div>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              {...register('priority')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {errors.priority && (
              <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

          {/* Assign Users - Requirement 2.2 */}
          <div>
            <Label htmlFor="assignedTo">Assign Users</Label>
            
            {/* Multi-Select Employee List */}
            <div className="mb-3 mt-2">
              <Label className="text-xs mb-2 block">Select Employees (Click to add multiple)</Label>
              <input
                type="text"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full px-3 py-2 mb-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                disabled={isLoading || loadingEmployees}
              />
              <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
                {loadingEmployees ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading employees...</div>
                ) : employees.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id) && (
                    !employeeSearch ||
                    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                    emp.email.toLowerCase().includes(employeeSearch.toLowerCase())
                  )).length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {employeeSearch
                      ? 'No employees match your search'
                      : selectedEmployees.length > 0
                      ? 'All employees have been selected'
                      : 'No employees available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {employees.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id) && (
                        !employeeSearch ||
                        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                        emp.email.toLowerCase().includes(employeeSearch.toLowerCase())
                      )).map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => handleEmployeeSelect(employee.id!)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors focus:bg-blue-100 focus:outline-none"
                        disabled={isLoading}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {employee.email} • {employee.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Employees Display */}
            {selectedEmployees.length > 0 && (
              <div className="mt-2 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Selected Employees ({selectedEmployees.length})</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployees([]);
                      setValue('assignedTo', '');
                    }}
                    disabled={isLoading}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-2 bg-white dark:bg-gray-dark border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{employee.role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEmployeeRemove(employee.id!)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 ml-1 transition-colors"
                        disabled={isLoading}
                        aria-label={`Remove ${employee.name}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {errors.assignedTo && (
              <p className="text-sm text-red-600 mt-1">{errors.assignedTo.message}</p>
            )}

            {/* Hidden input to store employee IDs */}
            <input type="hidden" {...register('assignedTo')} />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <Select
              id="categoryId"
              {...register('categoryId')}
              disabled={isLoading || loadingCategories}
              className="mt-1"
            >
              <option value="">Select a category (optional)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.description ? `- ${category.description}` : ''}
                </option>
              ))}
            </Select>
            {errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">{errors.categoryId.message}</p>
            )}
            {loadingCategories && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading categories...</p>
            )}
            {!loadingCategories && categories.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No categories available</p>
            )}
          </div>

          {/* Contact / Project */}
          <div className="mb-3 mt-2">
            <Label className="text-xs mb-2 block">Project (Click to select)</Label>

            {/* Search input */}
            <input
              type="text"
              placeholder="Search projects..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              disabled={isLoading || loadingProjects}
              className="w-full px-3 py-2 mb-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
            />

            {/* Project list */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
              {loadingProjects ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading projects...</div>
              ) : projects.filter(
                  p =>
                    !selectedProjects.some(sel => sel.id === p.id) &&
                    (!projectSearch.trim() ||
                      p.projectName.toLowerCase().includes(projectSearch.toLowerCase()) ||
                      p.projectNumber?.toLowerCase().includes(projectSearch.toLowerCase()))
                ).length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {projectSearch
                    ? 'No projects match your search'
                    : selectedProjects.length > 0
                    ? 'All projects have been selected'
                    : 'No projects available'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {projects.filter(
                    p =>
                      !selectedProjects.some(sel => sel.id === p.id) &&
                      (!projectSearch.trim() ||
                        p.projectName.toLowerCase().includes(projectSearch.toLowerCase()) ||
                        p.projectNumber?.toLowerCase().includes(projectSearch.toLowerCase()))
                  ).map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectSelect(project.id!)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors focus:bg-blue-100 focus:outline-none"
                      disabled={isLoading}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {project.projectName}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {project.projectNumber}
                          {project.status ? ` • ${project.status.replace('_', ' ')}` : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Projects Display */}
            {selectedProjects.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Selected Projects ({selectedProjects.length})</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProjects([]);
                      setValue('contactId', '');
                    }}
                    disabled={isLoading}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-2 bg-white dark:bg-gray-dark border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{project.projectName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{project.projectNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProjectRemove(project.id!)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 ml-1 transition-colors"
                        disabled={isLoading}
                        aria-label={`Remove ${project.projectName}`}
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errors.contactId && (
              <p className="text-sm text-red-600 mt-1">{errors.contactId.message}</p>
            )}
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
            <Button type="submit" loading={isLoading} disabled={isLoading} className="text-white">
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
