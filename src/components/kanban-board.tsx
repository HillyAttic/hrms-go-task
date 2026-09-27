'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task, TaskStatus } from '@/types/task.types';
import { 
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskEdit?: (task: Task) => void;
}

export function KanbanBoard({ tasks, onTaskUpdate, onTaskDelete, onTaskEdit }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const columns = [
    { id: TaskStatus.TODO, title: 'To Do', color: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'bg-orange-100 dark:bg-orange-900/30' },
    { id: TaskStatus.COMPLETED, title: 'Completed', color: 'bg-green-100 dark:bg-green-900/30' }
  ];

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      const updatedTask = { ...draggedTask, status };
      onTaskUpdate?.(updatedTask);
    }
    setDraggedTask(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'in-progress':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      case 'todo':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => {
        const columnTasks = tasks.filter(task => task.status === column.id);
        
        return (
          <div 
            key={column.id}
            className={`${column.color} rounded-lg p-4 min-h-[500px]`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id as TaskStatus)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{column.title}</h3>
              <span className="bg-card bg-opacity-50 rounded-full px-3 py-1 text-sm">
                {columnTasks.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <Card 
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  className="cursor-move hover:shadow-hard transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-foreground">{task.title}</h4>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => onTaskEdit?.(task)}
                          className="text-muted-foreground hover:text-muted-foreground"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onTaskDelete?.(task.id)}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                          {task.status.replace('-', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          {(task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {task.assignedTo.length > 0 && (
                      <div className="mt-2 flex -space-x-2">
                        {task.assignedTo.slice(0, 3).map((user, idx) => (
                          <div 
                            key={idx}
                            className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-white"
                            title={user}
                          >
                            {user.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {task.assignedTo.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-white">
                            +{task.assignedTo.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowPathIcon className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="mt-2">No tasks here</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}