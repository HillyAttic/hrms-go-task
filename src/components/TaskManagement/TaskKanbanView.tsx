'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { TaskCard } from './TaskCard';
import { TaskDetailsModal } from './TaskDetailsModal';

interface TaskKanbanViewProps {
  initialTasks?: Task[];
  onTaskUpdate?: (updatedTask: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({ 
  initialTasks = [], 
  onTaskUpdate,
  onTaskDelete,
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // In a real app, you would fetch tasks from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTasks(initialTasks);
      setLoading(false);
    }, 500);
  }, [initialTasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status } : task
    );
    
    setTasks(updatedTasks);
    
    // Find the updated task and call the update handler
    const updatedTask = updatedTasks.find(task => task.id === taskId);
    if (updatedTask && onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    setSelectedTask(updatedTask);
    
    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    setSelectedTask(null);
    
    if (onTaskDelete) {
      onTaskDelete(taskId);
    }
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  // Group tasks by status
  const tasksByStatus = {
    [TaskStatus.TODO]: tasks.filter(task => task.status === TaskStatus.TODO),
    [TaskStatus.IN_PROGRESS]: tasks.filter(task => task.status === TaskStatus.IN_PROGRESS),
    [TaskStatus.COMPLETED]: tasks.filter(task => task.status === TaskStatus.COMPLETED),
  };

  const getStatusTitle = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'border-blue-500';
      case TaskStatus.IN_PROGRESS:
        return 'border-yellow-500';
      case TaskStatus.COMPLETED:
        return 'border-green-500';
      default:
        return 'border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <div 
          key={status}
          className="flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status as TaskStatus)}
        >
          <div className={`flex items-center mb-4 pb-2 border-b-2 ${getStatusColor(status as TaskStatus)}`}>
            <h2 className="text-xl font-bold text-black dark:text-white">
              {getStatusTitle(status as TaskStatus)} 
              <span className="ml-2 bg-gray-200 dark:bg-muted text-gray-700 dark:text-gray-300 text-sm font-medium px-2.5 py-0.5 rounded">
                {statusTasks.length}
              </span>
            </h2>
          </div>
          
          <div className="space-y-4 min-h-[100px]">
            {statusTasks.map((task) => (
              <div 
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <TaskCard 
                  task={task} 
                  onClick={() => handleTaskClick(task)} 
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={handleCloseModal}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
};