'use client';

import React, { useState, useMemo } from 'react';
import { KanbanTask, KanbanStatus, KanbanColumn as KanbanColumnType, KanbanFilters, KanbanSort } from '@/types/kanban.types';
import { KanbanColumn } from './KanbanColumn';
import { AddTaskModal } from './AddTaskModal';
import { FilterSortModal } from './FilterSortModal';
import { Button } from '@/components/ui/button';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface EnhancedKanbanBoardProps {
  tasks: KanbanTask[];
  onTaskUpdate: (task: KanbanTask) => void;
  onTaskAdd: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => void;
  onTaskDelete: (taskId: string) => void;
  mobileScrollable?: boolean;
  compact?: boolean;
}

const COLUMNS: KanbanColumnType[] = [
  { id: 'todo', title: 'To Do', color: 'bg-yellow-50 dark:bg-yellow-900/30' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/30' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50 dark:bg-green-900/30' },
];

export function EnhancedKanbanBoard({ tasks, onTaskUpdate, onTaskAdd, onTaskDelete, mobileScrollable, compact }: EnhancedKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  
  const [filters, setFilters] = useState<KanbanFilters>({
    dueDate: 'all',
  });
  
  const [sort, setSort] = useState<KanbanSort>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply due date filter
    if (filters.dueDate && filters.dueDate !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(task => {
        const dueDate = new Date(task.dueDate);
        
        switch (filters.dueDate) {
          case 'today':
            const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            return taskDate.getTime() === today.getTime();
          
          case 'this-week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return dueDate >= today && dueDate <= weekFromNow;
          
          case 'overdue':
            return dueDate < today;
          
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority || 'medium'] || 0) - (priorityOrder[b.priority || 'medium'] || 0);
          break;
        
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, filters, sort]);

  const handleDragStart = (e: React.DragEvent, task: KanbanTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: KanbanStatus) => {
    e.preventDefault();
    
    if (draggedTask && draggedTask.status !== newStatus) {
      const updatedTask = { ...draggedTask, status: newStatus };
      onTaskUpdate(updatedTask);
    }
    
    setDraggedTask(null);
  };

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task);
    // You can open a detail modal here if needed
    console.log('Task clicked:', task);
  };

  const handleStatusChange = (taskId: string, newStatus: KanbanStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, status: newStatus };
      onTaskUpdate(updatedTask);
    }
  };

  const handleAddTask = (taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => {
    if (editingTask) {
      // Update existing task
      const updatedTask = { ...editingTask, ...taskData };
      onTaskUpdate(updatedTask);
      setEditingTask(null);
    } else {
      // Add new task
      onTaskAdd(taskData);
    }
  };

  const handleEditTask = (task: KanbanTask) => {
    setEditingTask(task);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTask(null);
  };

  const handleApplyFilters = (newFilters: KanbanFilters, newSort: KanbanSort) => {
    setFilters(newFilters);
    setSort(newSort);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Task Board</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setShowFilterModal(true)}
            variant="outline"
            className="flex items-center gap-1.5 sm:gap-2 focus:ring-2 focus:ring-ring text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2"
          >
            <FunnelIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Filter & Sort</span>
            <span className="sm:hidden">Filter</span>
          </Button>
          
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-foreground hover:bg-foreground/90 text-background focus:ring-2 focus:ring-ring text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2"
          >
            <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add New Task</span>
            <span className="sm:hidden">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      {mobileScrollable ? (
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-2">
          <div className="flex gap-4 sm:gap-6 lg:grid lg:grid-cols-3">
            {COLUMNS.map((column) => {
              const columnTasks = filteredAndSortedTasks.filter(
                (task) => task.status === column.id
              );
              return (
                <div key={column.id} className="w-[280px] sm:w-72 flex-shrink-0 lg:w-auto">
                  <KanbanColumn
                    id={column.id}
                    title={column.title}
                    color={column.color}
                    tasks={columnTasks}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    onDelete={onTaskDelete}
                    onEdit={handleEditTask}
                    compact={compact}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {COLUMNS.map((column) => {
            const columnTasks = filteredAndSortedTasks.filter(
              (task) => task.status === column.id
            );

            // Hide "In Progress" and "Completed" columns on mobile
            const isHiddenOnMobile = column.id === 'in-progress' || column.id === 'completed';

            return (
              <div
                key={column.id}
                className={isHiddenOnMobile ? 'hidden md:block' : ''}
              >
                <KanbanColumn
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tasks={columnTasks}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onTaskClick={handleTaskClick}
                  onStatusChange={handleStatusChange}
                  onDelete={onTaskDelete}
                  onEdit={handleEditTask}
                  compact={compact}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSave={handleAddTask}
        editTask={editingTask}
      />

      <FilterSortModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        currentSort={sort}
      />
    </div>
  );
}
