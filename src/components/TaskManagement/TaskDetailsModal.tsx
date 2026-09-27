import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, Comment, TaskStatus, TaskPriority } from '@/types/task.types';
import { UserAvatar } from './UserAvatar';
import { taskApi } from '@/services/task.api';
import { useNotification } from '@/contexts/notification.context';
import { useModal } from '@/contexts/modal-context';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task>({ ...task });
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const { addNotification } = useNotification();
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    openModal();
    return () => closeModal();
  }, [openModal, closeModal]);

  // Load comments when modal opens
  useEffect(() => {
    const loadComments = async () => {
      try {
        // In a real app, we would fetch comments from the API
        // const loadedComments = await taskApi.getComments(task.id);
        // For demo purposes, using mock data
        const loadedComments: Comment[] = [
          {
            id: '1',
            taskId: task.id,
            author: 'John Doe',
            content: 'Starting work on this task',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          {
            id: '2',
            taskId: task.id,
            author: 'Jane Smith',
            content: 'I have some questions about the requirements',
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          },
        ];
        setComments(loadedComments);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    };

    loadComments();
  }, [task.id]);

  const handleSave = () => {
    onUpdate(editedTask);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    addNotification({ type: 'success', message: 'Task deleted successfully!' });
    onClose();
  };

  const handleAddComment = async () => {
    if (newComment.trim()) {
      try {
        // In a real app, we would call the API to add the comment
        // const commentToAdd = await taskApi.addComment(task.id, {
        //   author: 'Current User', // This would come from auth context
        //   content: newComment,
        // });
        
        // For demo purposes, creating a mock comment
        const commentToAdd: Comment = {
          id: (comments.length + 1).toString(),
          taskId: task.id,
          author: 'Current User', // This would come from auth context
          content: newComment,
          createdAt: new Date(),
        };
        
        setComments([...comments, commentToAdd]);
        setNewComment('');
        
        // Update comment count on task
        setEditedTask({
          ...editedTask,
          commentCount: (editedTask.commentCount || 0) + 1,
        });
        
        addNotification({ type: 'success', message: 'Comment added successfully!' });
      } catch (error) {
        console.error('Error adding comment:', error);
        addNotification({ type: 'error', message: 'Failed to add comment' });
      }
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-foreground text-background';
      case TaskStatus.IN_PROGRESS:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case TaskStatus.COMPLETED:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case TaskPriority.MEDIUM:
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case TaskPriority.LOW:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="m-4 bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTask.title}
                  onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                  className="w-full bg-transparent border-b border-border dark:border-border text-black focus:outline-none"
                />
              ) : (
                task.title
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
              {task.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            {task.category && (
              <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 px-3 py-1 rounded-full text-sm font-medium">
                {task.category}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Description</h3>
            {isEditing ? (
              <textarea
                value={editedTask.description}
                onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                className="w-full h-32 p-3 bg-muted border border-stroke dark:border-border rounded-lg text-black"
              />
            ) : (
              <p className="text-muted-foreground">
                {task.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Due Date</h3>
              {isEditing ? (
                <input
                  type="date"
                  value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditedTask({
                    ...editedTask, 
                    dueDate: e.target.value ? new Date(e.target.value) : new Date()
                  })}
                  className="w-full p-2 bg-muted border border-stroke dark:border-border rounded-lg text-black"
                />
              ) : (
                <p className="text-muted-foreground">
                  {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                </p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Assigned To</h3>
              <div className="flex items-center space-x-2">
                <UserAvatar users={task.assignedTo} size="md" />
                <span className="text-muted-foreground">
                  {task.assignedTo.join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Comments ({comments.length})</h3>
            
            {isLoadingComments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-muted p-4 rounded-lg">
                    <div className="flex items-start">
                      <UserAvatar users={[comment.author]} size="sm" />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium text-black dark:text-white">{comment.author}</h4>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No comments yet</p>
                )}
              </div>
            )}
            
            <div className="mt-4 flex">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 p-3 bg-muted border border-stroke dark:border-border rounded-l-lg text-black focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                className="bg-foreground text-background px-4 py-3 rounded-r-md border-2 border-border font-semibold hover:bg-foreground/90 transition"
              >
                Send
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-stroke dark:border-border">
            <div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mr-4 font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                Delete
              </button>
            </div>
            
            {isEditing ? (
              <div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="mr-2 px-4 py-2 bg-muted text-black rounded-lg hover:bg-muted dark:hover:bg-card"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-foreground text-background rounded-md border-2 border-border font-semibold hover:bg-foreground/90"
                >
                  Save Changes
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
