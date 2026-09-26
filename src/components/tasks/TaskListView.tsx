import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, TrashIcon, CheckCircleIcon, PaperClipIcon, EyeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Task } from '@/types/task.types';

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onView?: (task: Task) => void;
}

/**
 * TaskListView Component
 * Displays tasks in a table/list format
 */
export function TaskListView({
  tasks,
  onEdit,
  onDelete,
  onToggleComplete,
  onView,
}: TaskListViewProps) {
  const { isAdmin, isManager } = useEnhancedAuth();
  const isAdminOrManager = isAdmin || isManager;
  
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch user names for all assigned users and creators
  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        setLoadingUsers(true);
        
        // Get authentication token
        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;
        
        if (!user) {
          console.error('User not authenticated');
          setUserNames({});
          setLoadingUsers(false);
          return;
        }

        const token = await user.getIdToken();
        
        // Fetch user names from API endpoint
        const response = await fetch('/api/users/names', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user names');
        }

        const nameMap = await response.json();
        setUserNames(nameMap);
      } catch (error) {
        console.error('Error fetching user names:', error);
        // Set empty map on error to prevent infinite loading
        setUserNames({});
      } finally {
        setLoadingUsers(false);
      }
    };

    if (tasks.length > 0) {
      fetchUserNames();
    } else {
      // If no tasks, clear the loading state
      setLoadingUsers(false);
      setUserNames({});
    }
  }, [tasks]);

  // Fetch category names
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        
        // Import category service dynamically
        const { categoryService } = await import('@/services/category.service');
        const categories = await categoryService.getAll();
        
        // Create a map of category ID to name
        const catMap: Record<string, string> = {};
        categories.forEach(cat => {
          if (cat.id) {
            catMap[cat.id] = cat.name;
          }
        });
        
        setCategoryNames(catMap);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (tasks.length > 0) {
      fetchCategories();
    }
  }, [tasks]);

  // Fetch client names
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        
        // Import client service dynamically
        const { clientService } = await import('@/services/client.service');
        const clients = await clientService.getAll();
        
        // Create a map of client ID to name
        const clientMap: Record<string, string> = {};
        clients.forEach(client => {
          if (client.id) {
            clientMap[client.id] = client.clientName;
          }
        });
        
        setClientNames(clientMap);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    if (tasks.length > 0) {
      fetchClients();
    }
  }, [tasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-foreground text-background dark:bg-foreground dark:text-background';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAssignedNames = (assignedTo?: string[]) => {
    if (!assignedTo || assignedTo.length === 0) {
      return 'Unassigned';
    }

    if (loadingUsers) {
      return 'Loading...';
    }

    const names = assignedTo
      .map(id => userNames[id] || id)
      .join(', ');
    
    return names || 'Unknown';
  };

  const getCreatorName = (createdBy?: string, assignedTo?: string[]) => {
    if (!createdBy) {
      return 'System';
    }

    if (loadingUsers) {
      return 'Loading...';
    }

    const name = userNames[createdBy];
    
    return name || 'Unknown';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) {
      return '-';
    }

    if (loadingCategories) {
      return 'Loading...';
    }

    return categoryNames[categoryId] || categoryId;
  };

  const getClientName = (contactId?: string) => {
    if (!contactId) {
      return '-';
    }

    if (loadingClients) {
      return 'Loading...';
    }

    return clientNames[contactId] || contactId;
  };

  return (
    <>
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-2">Title</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-1">Category</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-2">
            {isAdminOrManager ? 'Assigned To' : 'Assigned By'}
          </div>
          <div className="col-span-1">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 text-[11px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 ${
                (task.commentCount != null && task.commentCount > 0) || (task.attachments && task.attachments.length > 0)
                  ? 'border-l-blue-400 bg-blue-50/30 dark:bg-blue-900/10'
                  : 'border-l-transparent bg-white dark:bg-gray-dark'
              }`}
            >
              {/* Title */}
              <div className="col-span-2">
                <div className="font-medium text-gray-900 dark:text-white truncate" title={task.title}>
                  {task.title}
                </div>
                {task.description && (
                  <div className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5 truncate" title={task.description}>
                    {task.description}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {task.attachments && task.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-1 py-0.5">
                      <PaperClipIcon className="w-3 h-3" />
                      {task.attachments.length}
                    </span>
                  )}
                  {task.commentCount != null && task.commentCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-1 py-0.5">
                      <ChatBubbleLeftRightIcon className="w-3 h-3" />
                      {task.commentCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Client */}
              <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
                <span className="truncate" title={getClientName(task.contactId)}>
                  {getClientName(task.contactId)}
                </span>
              </div>

              {/* Category */}
              <div className="col-span-1 text-gray-700 dark:text-gray-300 flex items-center">
                <span className="truncate" title={getCategoryName(task.category)}>
                  {getCategoryName(task.category)}
                </span>
              </div>

              {/* Status */}
              <div className="col-span-1 flex items-center">
                <Badge className={`${getStatusColor(task.status)} text-[10px] px-1.5 py-0.5`}>
                  {task.status === 'in-progress' ? 'progress' : task.status}
                </Badge>
              </div>

              {/* Priority */}
              <div className="col-span-1 flex items-center">
                <Badge className={`${getPriorityColor(task.priority)} text-[10px] px-1.5 py-0.5`}>
                  {task.priority}
                </Badge>
              </div>

              {/* Due Date */}
              <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
                <span className="truncate" title={formatDate(task.dueDate)}>
                  {formatDate(task.dueDate)}
                </span>
              </div>

              {/* Assigned To / Assigned By */}
              <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
                {isAdminOrManager ? (
                  <span className="truncate" title={getAssignedNames(task.assignedTo)}>
                    {getAssignedNames(task.assignedTo)}
                  </span>
                ) : (
                  <span className="truncate" title={getCreatorName(task.createdBy)}>
                    {getCreatorName(task.createdBy)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center gap-1 justify-end">
                {onView && (
                  <button
                    onClick={() => onView(task)}
                    className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1"
                    aria-label="View details"
                    title="View details, comments & attachments"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onToggleComplete(task.id)}
                  className={`p-1 ${
                    task.status === 'completed'
                      ? 'text-green-600 hover:text-green-900 dark:text-green-400'
                      : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'
                  }`}
                  aria-label="Toggle complete"
                  title="Toggle complete"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(task)}
                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                  aria-label="Edit task"
                  title="Edit task"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                {isAdminOrManager && (
                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    aria-label="Delete task"
                    title="Delete task"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-lg border p-3 space-y-2.5 ${
              (task.commentCount != null && task.commentCount > 0) || (task.attachments && task.attachments.length > 0)
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-dark'
            }`}
          >
            {/* Title and Description */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            {/* Status and Priority Badges */}
            <div className="flex gap-1.5 flex-wrap">
              <Badge className={`${getStatusColor(task.status)} text-[10px] px-1.5 py-0.5`}>
                {task.status === 'in-progress' ? 'In Progress' : task.status}
              </Badge>
              <Badge className={`${getPriorityColor(task.priority)} text-[10px] px-1.5 py-0.5`}>
                {task.priority}
              </Badge>
            </div>

            {/* Task Details */}
            <div className="space-y-1.5 text-xs">
              {task.contactId && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Client:</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right break-words">
                    {getClientName(task.contactId)}
                  </span>
                </div>
              )}
              {(task.category) && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Category:</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right break-words">
                    {getCategoryName(task.category)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Due Date:</span>
                <span className="text-gray-900 dark:text-white font-medium text-right">
                  {formatDate(task.dueDate)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {isAdminOrManager ? 'Assigned To:' : 'Assigned By:'}
                </span>
                <span className="text-gray-900 dark:text-white font-medium text-right break-words max-w-[60%]">
                  {isAdminOrManager
                    ? getAssignedNames(task.assignedTo)
                    : getCreatorName(task.createdBy)
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {task.attachments && task.attachments.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-[11px]">
                    <PaperClipIcon className="w-3.5 h-3.5" />
                    {task.attachments.length} attachment{task.attachments.length !== 1 ? 's' : ''}
                  </span>
                )}
                {task.commentCount != null && task.commentCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-1.5 py-0.5 text-[11px]">
                    <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                    {task.commentCount} comment{task.commentCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {onView && (
                <button
                  onClick={() => onView(task)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors min-h-[40px]"
                  aria-label="View details"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span className="text-xs">View</span>
                </button>
              )}
              <button
                onClick={() => onToggleComplete(task.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors min-h-[40px] ${
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label="Toggle complete"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-xs">{task.status === 'completed' ? 'Done' : 'Complete'}</span>
              </button>
              <button
                onClick={() => onEdit(task)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium bg-foreground text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 transition-colors min-h-[40px]"
                aria-label="Edit task"
              >
                <PencilIcon className="w-4 h-4" />
                <span className="text-xs">Edit</span>
              </button>
              {isAdminOrManager && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="px-3 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors min-h-[40px]"
                  aria-label="Delete task"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
