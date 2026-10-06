'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { TaskList } from '@/components/task-list';
import { TaskCreationModal } from '@/components/task-creation-modal';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TaskFilter } from '@/components/task-filter';

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  assignee?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters, dateFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await taskApi.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(task => {
        if (!task.createdAt) return false;
        const taskDate = new Date(task.createdAt);
        const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return taskDay.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return taskDay.getTime() === yesterday.getTime();
          case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return taskDay >= weekStart && taskDay <= today;
          case 'lastWeek':
            const lastWeekEnd = new Date(today);
            lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
            return taskDay >= lastWeekStart && taskDay <= lastWeekEnd;
          case 'thisMonth':
            return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
          case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return taskDate.getMonth() === lastMonth.getMonth() && taskDate.getFullYear() === lastMonth.getFullYear();
          case 'older':
            const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            return taskDate < twoMonthsAgo;
          default:
            return true;
        }
      });
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    
    if (filters.assignee) {
      const assigneeTerm = filters.assignee.toLowerCase();
      filtered = filtered.filter(task => 
        task.assignedTo.some(user => user.toLowerCase().includes(assigneeTerm))
      );
    }
    
    setFilteredTasks(filtered);
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setSelectedTask(updatedTask);
  };

  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading…">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDateFilter('all')}
          aria-pressed={dateFilter === 'all'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setDateFilter('today')}
          aria-pressed={dateFilter === 'today'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'today'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateFilter('yesterday')}
          aria-pressed={dateFilter === 'yesterday'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'yesterday'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => setDateFilter('thisWeek')}
          aria-pressed={dateFilter === 'thisWeek'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'thisWeek'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setDateFilter('lastWeek')}
          aria-pressed={dateFilter === 'lastWeek'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'lastWeek'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          Last Week
        </button>
        <button
          onClick={() => setDateFilter('thisMonth')}
          aria-pressed={dateFilter === 'thisMonth'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'thisMonth'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setDateFilter('lastMonth')}
          aria-pressed={dateFilter === 'lastMonth'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'lastMonth'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          Last Month
        </button>
        <button
          onClick={() => setDateFilter('older')}
          aria-pressed={dateFilter === 'older'}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200 border ${
            dateFilter === 'older'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-105'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          Older
        </button>
      </div>

      <TaskFilter 
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        taskCount={filteredTasks.length}
      />

      {/* Task List */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64" role="status" aria-label="Loading…">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" aria-hidden="true"></div>
            </div>
          ) : (
            <TaskList 
              tasks={filteredTasks} 
              onTaskClick={handleTaskClick}
              showStatus={true}
            />
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <TaskCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}