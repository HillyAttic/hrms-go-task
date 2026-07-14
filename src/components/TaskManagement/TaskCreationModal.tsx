import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { useNotification } from '@/contexts/notification.context';
import { useModal } from '@/contexts/modal-context';

interface TaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'commentCount'>) => void;
}

export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreate 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState('');
  const [assignedUsers, setAssignedUsers] = useState(['']);
  const { addNotification } = useNotification();
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (isOpen) openModal();
    else closeModal();
  }, [isOpen, openModal, closeModal]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      addNotification({ type: 'error', message: 'Title is required' });
      return;
    }
    
    // Prepare task data
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      assignedTo: assignedUsers.filter(user => user.trim() !== ''),
      category: category.trim(),
    };
    
    onCreate(taskData);
    addNotification({ type: 'success', message: 'Task created successfully!' });
    
    // Reset form
    setTitle('');
    setDescription('');
    setStatus(TaskStatus.TODO);
    setPriority(TaskPriority.MEDIUM);
    setDueDate('');
    setCategory('');
    setAssignedUsers(['']);
  };

  const addAssigneeField = () => {
    setAssignedUsers([...assignedUsers, '']);
  };

  const updateAssignee = (index: number, value: string) => {
    const newAssignees = [...assignedUsers];
    newAssignees[index] = value;
    setAssignedUsers(newAssignees);
  };

  const removeAssignee = (index: number) => {
    if (assignedUsers.length <= 1) return;
    const newAssignees = assignedUsers.filter((_, i) => i !== index);
    setAssignedUsers(newAssignees);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-boxdark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-black dark:text-white">Create New Task</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter task title"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter task description"
              />
            </div>

            {/* Due Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter category (optional)"
              />
            </div>

            {/* Assignees */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Assign To
              </label>
              {assignedUsers.map((assignee, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => updateAssignee(index, e.target.value)}
                    className="flex-1 p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter assignee name"
                  />
                  {assignedUsers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAssignee(index)}
                      className="ml-2 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAssigneeField}
                className="mt-2 px-4 py-2 bg-gray-200 dark:bg-boxdark-2 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-boxdark"
              >
                + Add Assignee
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={TaskStatus.TODO}>To Do</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full p-3 bg-gray-50 dark:bg-boxdark-2 border border-stroke dark:border-strokedark rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-stroke dark:border-strokedark">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 dark:bg-boxdark-2 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-boxdark"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};