'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import {
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserCircleIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Task, TaskStatus, TaskPriority, TaskAttachment } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { uploadCommentAttachments, validateFiles, ALLOWED_EXTENSIONS } from '@/lib/task-attachment.service';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate?: (updatedTask: Task) => void;
}

interface CommentAttachmentLocal {
  name: string;
  url: string;
  type: string;
  size: number;
  storagePath?: string;
}

interface Comment {
  id: string;
  author: string;
  authorId?: string;
  content: string;
  createdAt: Date;
  attachments?: CommentAttachmentLocal[];
}

export function TaskDetailModal({ open, onClose, task, onUpdate }: TaskDetailModalProps) {
  const { user, isAdmin } = useEnhancedAuth();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [displayValue, setDisplayValue] = useState('');
  const [clientName, setClientName] = useState<string | null>(null);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentFileError, setCommentFileError] = useState<string | null>(null);
  const [uploadingComment, setUploadingComment] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user is the task creator
  const isTaskCreator = task?.createdBy === user?.uid;
  // Check if current user is assigned to the task (admins can update any task)
  const isTaskAssigned = isAdmin || task?.assignedTo?.includes(user?.uid || '') || false;
  // Admins and creators can edit all fields; assigned users can edit status only
  const canEditAll = isAdmin || isTaskCreator;

  // Fetch user names
  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        setLoadingUsers(true);

        const { auth } = await import('@/lib/firebase');
        const user = auth.currentUser;

        if (!user) {
          console.error('User not authenticated');
          setUserNames({});
          setLoadingUsers(false);
          return;
        }

        const token = await user.getIdToken();

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
        setUserNames({});
      } finally {
        setLoadingUsers(false);
      }
    };

    if (open) {
      fetchUserNames();
    }
  }, [open]);

  // Fetch client name when task changes
  useEffect(() => {
    const fetchClientName = async () => {
      if (task?.contactId) {
        try {
          const { clientService } = await import('@/services/client.service');
          const client = await clientService.getById(task.contactId);
          setClientName(client?.clientName || null);
        } catch {
          setClientName(null);
        }
      } else {
        setClientName(null);
      }
    };

    if (open) {
      fetchClientName();
    } else {
      setClientName(null);
    }
  }, [open, task?.contactId]);

  // Reset comment attachment state when modal closes
  useEffect(() => {
    if (!open) {
      setCommentFiles([]);
      setCommentFileError(null);
    }
  }, [open]);

  useEffect(() => {
    if (task) {
      setEditingTask({ ...task });
      loadComments(task.id);

      // Fetch fresh task data to ensure attachments are included
      const loadFreshTask = async () => {
        try {
          const freshTask = await taskApi.getTaskById(task.id);
          if (freshTask) {
            console.log('[TaskDetailModal] Fresh task data:', { id: freshTask.id, attachments: freshTask.attachments });
            setEditingTask(prev => prev ? { ...prev, attachments: freshTask.attachments } : prev);
          }
        } catch (err) {
          console.error('[TaskDetailModal] Error fetching fresh task data:', err);
        }
      };
      loadFreshTask();

      // Set display value with user names
      if (!loadingUsers && task.assignedTo) {
        const names = task.assignedTo.map(id => userNames[id] || id).join(', ');
        setDisplayValue(names);
      }
    }
  }, [task, userNames, loadingUsers]);

  const loadComments = async (taskId: string) => {
    try {
      const commentsData = await taskApi.getComments(taskId);
      setComments(commentsData.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt)
      })));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSave = async () => {
    if (!editingTask) return;

    setLoading(true);
    try {
      // Check if user is assigned to the task
      if (!isTaskAssigned) {
        console.error('User is not assigned to this task');
        setLoading(false);
        return;
      }

      // Serialize dueDate properly - handle Date objects, Firestore Timestamps, and strings
      let dueDateString: string | undefined;
      if (editingTask.dueDate) {
        if (editingTask.dueDate instanceof Date) {
          dueDateString = editingTask.dueDate.toISOString();
        } else if (typeof editingTask.dueDate === 'object' && 'seconds' in (editingTask.dueDate as Record<string, unknown>)) {
          dueDateString = new Date((editingTask.dueDate as unknown as { seconds: number }).seconds * 1000).toISOString();
        } else if (typeof editingTask.dueDate === 'string') {
          dueDateString = editingTask.dueDate;
        } else {
          dueDateString = new Date(editingTask.dueDate as unknown as string).toISOString();
        }
      }

      const updatedTask = await taskApi.updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: dueDateString as unknown as Date,
        assignedTo: editingTask.assignedTo
      });

      onUpdate?.(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      // Show error message to user
      if (error instanceof Error && error.message.includes('You must be assigned to this task')) {
        // Handle assignment error appropriately
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const error = validateFiles(files);
    if (error) {
      setCommentFileError(error);
      return;
    }
    setCommentFileError(null);
    setCommentFiles(prev => {
      const combined = [...prev, ...files];
      const overLimit = validateFiles(combined);
      if (overLimit) {
        setCommentFileError(overLimit);
        return prev;
      }
      return combined;
    });
    // Reset file input so same file can be re-added if removed
    if (commentFileInputRef.current) commentFileInputRef.current.value = '';
  };

  const removeCommentFile = (index: number) => {
    setCommentFiles(prev => prev.filter((_, i) => i !== index));
    setCommentFileError(null);
  };

  const handleAddComment = async () => {
    if (!editingTask || !newComment.trim()) return;

    setUploadingComment(true);
    try {
      let attachments: TaskAttachment[] = [];

      if (commentFiles.length > 0) {
        attachments = await uploadCommentAttachments(editingTask.id, commentFiles);
      }

      const comment = await taskApi.addComment(editingTask.id, {
        author: 'Current User', // resolved server-side from auth token
        content: newComment.trim(),
        attachments,
      });

      setComments(prev => [...prev, {
        ...comment,
        createdAt: new Date(comment.createdAt)
      }]);
      setNewComment('');
      setCommentFiles([]);
      setCommentFileError(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setUploadingComment(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Resolve comment author: try authorId, then author string (could be email or userId)
  const resolveCommentAuthor = (comment: Comment): string => {
    if (comment.authorId && userNames[comment.authorId]) {
      return userNames[comment.authorId];
    }
    // userNames map includes uid->name, email->name, and employeeId->name
    if (userNames[comment.author]) {
      return userNames[comment.author];
    }
    return comment.author;
  };

  if (!editingTask) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            View and edit task information, status, and comments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="space-y-4">
            {/* Title - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              {canEditAll ? (
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {editingTask.title}
                </div>
              )}
            </div>

            {/* Description - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              {canEditAll ? (
                <Textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                  className="w-full"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white min-h-[80px]">
                  {editingTask.description || 'No description'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status - Editable for everyone */}
              <div className={!canEditAll ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg p-2 -m-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status {!canEditAll && <span className="text-blue-600 text-xs">(You can edit this)</span>}
                </label>
                <Select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                  className="w-full"
                >
                  <option value={TaskStatus.TODO}>To Do</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </Select>
              </div>

              {/* Priority - Read-only for non-creators */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                {canEditAll ? (
                  <Select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                    className="w-full"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </Select>
                ) : (
                  <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white h-10 flex items-center">
                    {editingTask.priority === TaskPriority.LOW && 'Low'}
                    {editingTask.priority === TaskPriority.MEDIUM && 'Medium'}
                    {editingTask.priority === TaskPriority.HIGH && 'High'}
                  </div>
                )}
              </div>
            </div>

            {/* Due Date - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              {canEditAll ? (
                <Input
                  type="date"
                  value={editingTask.dueDate ? (editingTask.dueDate instanceof Date ? editingTask.dueDate.toISOString().split('T')[0] : new Date(editingTask.dueDate).toISOString().split('T')[0]) : ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask,
                    dueDate: e.target.value ? new Date(e.target.value) : new Date()
                  })}
                  className="w-full"
                />
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {editingTask.dueDate
                    ? new Date(editingTask.dueDate).toLocaleDateString()
                    : 'No due date'}
                </div>
              )}
            </div>

            {/* Assigned Users - Read-only for non-creators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assigned Users
              </label>
              {canEditAll ? (
                <>
                  <Input
                    value={displayValue}
                    onChange={(e) => {
                      setDisplayValue(e.target.value);
                      // Keep the original IDs in editingTask
                      const inputNames = e.target.value.split(',').map(n => n.trim()).filter(n => n);
                      // Try to map names back to IDs, or keep as is if not found
                      const userIdMap = Object.entries(userNames).reduce((acc, [id, name]) => {
                        acc[name.toLowerCase()] = id;
                        return acc;
                      }, {} as Record<string, string>);

                      const ids = inputNames.map(name => {
                        const lowerName = name.toLowerCase();
                        return userIdMap[lowerName] || name;
                      });

                      setEditingTask({
                        ...editingTask,
                        assignedTo: ids
                      });
                    }}
                    placeholder={loadingUsers ? "Loading users..." : "Enter usernames separated by commas"}
                    className="w-full"
                    disabled={loadingUsers}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {loadingUsers ? 'Loading user names...' : 'Separate multiple users with commas'}
                  </p>
                </>
              ) : (
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {displayValue || 'No users assigned'}
                </div>
              )}
            </div>

            {/* Client - Read-only, shown when task has a contactId */}
            {clientName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                  {clientName}
                </div>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          {editingTask.attachments && editingTask.attachments.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <PaperClipIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                <h3 className="text-lg font-medium">Attachments ({editingTask.attachments.length})</h3>
              </div>
              <div className="space-y-2">
                {editingTask.attachments.map((attachment: TaskAttachment, index: number) => (
                  <a
                    key={attachment.storagePath || index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {attachment.size < 1024 * 1024
                          ? `${(attachment.size / 1024).toFixed(1)} KB`
                          : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                    <ArrowDownTrayIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-medium">Comments ({comments.length})</h3>
            </div>

            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{resolveCommentAuthor(comment)}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-gray-700 dark:text-gray-300">{comment.content}</p>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {comment.attachments.map((att, idx) => (
                              <a
                                key={att.storagePath || idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors group text-sm"
                              >
                                <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{att.name}</span>
                                <span className="text-xs text-gray-400">
                                  {att.size < 1024 * 1024
                                    ? `${(att.size / 1024).toFixed(1)} KB`
                                    : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                                </span>
                                <ArrowDownTrayIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pending files for comment */}
            {commentFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {commentFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
                    <DocumentIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                    <button onClick={() => removeCommentFile(idx)} className="text-gray-400 hover:text-red-500">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {commentFileError && (
              <p className="text-sm text-red-500 mb-2">{commentFileError}</p>
            )}

            <div className="space-y-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddComment();
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <input
                  ref={commentFileInputRef}
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  multiple
                  className="hidden"
                  onChange={handleCommentFileChange}
                />
                <button
                  type="button"
                  onClick={() => commentFileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Attach file (PNG, JPG, PDF, Excel, Word)"
                >
                  <PaperClipIcon className="w-4 h-4" />
                  Attach
                </button>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || loading || uploadingComment}
                  className="ml-auto"
                >
                  {uploadingComment ? 'Uploading...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : (canEditAll ? 'Save Changes' : 'Update Status')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}