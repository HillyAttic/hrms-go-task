'use client';

import { useState, useEffect, useMemo } from 'react';
import { KanbanTask, Business } from '@/types/kanban.types';
import { EnhancedKanbanBoard } from '@/components/kanban/EnhancedKanbanBoard';
import { BusinessManager } from '@/components/kanban/BusinessManager';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { kanbanService } from '@/services/kanban.service';
import { useRouter } from 'next/navigation';

const GLASS =
  'rounded-2xl border border-white/60 bg-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]';

const STAT_ACCENTS = {
  todo: 'from-amber-400 to-orange-500',
  'in-progress': 'from-sky-400 to-indigo-500',
  completed: 'from-emerald-400 to-teal-500',
} as const;

export default function KanbanPage() {
  const { user, loading: authLoading } = useEnhancedAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<KanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load user's businesses and tasks from Firestore
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load businesses
        const userBusinesses = await kanbanService.getUserBusinesses(user.uid);

        // Automatic migration: Rename "My First Business" to "Personal"
        const businessToRename = userBusinesses.find(b => b.name === 'My First Business');
        if (businessToRename) {
          console.log('Migrating "My First Business" to "Personal"...');
          await kanbanService.updateBusiness(businessToRename.id, {
            name: 'Personal',
            description: 'Personal workspace'
          });
          // Update the local copy
          businessToRename.name = 'Personal';
          businessToRename.description = 'Personal workspace';
        }

        // If no businesses exist, create a default one
        if (userBusinesses.length === 0) {
          const defaultBusiness = await kanbanService.createBusiness(user.uid, {
            name: 'Personal',
            description: 'Personal workspace',
            color: '#3B82F6',
          });
          setBusinesses([defaultBusiness]);
          setSelectedBusinessId(defaultBusiness.id);
        } else {
          setBusinesses(userBusinesses);
          setSelectedBusinessId(userBusinesses[0].id);
        }

        // Load all tasks
        const userTasks = await kanbanService.getAllUserTasks(user.uid);
        setAllTasks(userTasks);
      } catch (err) {
        console.error('Error loading Kanban data:', err);
        setError('Failed to load your data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Filter tasks for selected business
  const currentTasks = useMemo(() => {
    if (!selectedBusinessId) return [];
    return allTasks.filter(task => task.businessId === selectedBusinessId);
  }, [allTasks, selectedBusinessId]);

  const handleTaskUpdate = async (updatedTask: KanbanTask) => {
    try {
      await kanbanService.updateTask(updatedTask.id, updatedTask);
      setAllTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleTaskAdd = async (taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'businessId'>) => {
    if (!selectedBusinessId) return;

    try {
      const newTask = await kanbanService.createTask({
        ...taskData,
        businessId: selectedBusinessId,
      });

      setAllTasks(prevTasks => [newTask, ...prevTasks]);
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await kanbanService.deleteTask(taskId);
      setAllTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleAddBusiness = async (businessData: Omit<Business, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const newBusiness = await kanbanService.createBusiness(user.uid, businessData);
      setBusinesses(prev => [...prev, newBusiness]);
      setSelectedBusinessId(newBusiness.id);
    } catch (err) {
      console.error('Error creating business:', err);
      alert('Failed to create business. Please try again.');
    }
  };

  const handleUpdateBusiness = async (updatedBusiness: Business) => {
    try {
      await kanbanService.updateBusiness(updatedBusiness.id, updatedBusiness);
      setBusinesses(prev =>
        prev.map(business =>
          business.id === updatedBusiness.id ? updatedBusiness : business
        )
      );
    } catch (err) {
      console.error('Error updating business:', err);
      alert('Failed to update business. Please try again.');
    }
  };

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      await kanbanService.deleteBusiness(businessId);

      // Remove business and its tasks from state
      const updatedBusinesses = businesses.filter(b => b.id !== businessId);
      setBusinesses(updatedBusinesses);
      setAllTasks(prev => prev.filter(task => task.businessId !== businessId));

      // Select another business
      if (selectedBusinessId === businessId && updatedBusinesses.length > 0) {
        setSelectedBusinessId(updatedBusinesses[0].id);
      }
    } catch (err) {
      console.error('Error deleting business:', err);
      alert('Failed to delete business. Please try again.');
    }
  };

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-white/10 dark:border-t-indigo-400"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading your Kanban board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`${GLASS} p-8 text-center`}>
          <p className="mb-4 text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] p-4 sm:p-6 dark:from-[#060B18] dark:via-[#080F22] dark:to-[#0B1430]">
      {/* Ambient gradient wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#0447FD]/20 blur-3xl dark:bg-[#0447FD]/25" />
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#7F1BFF]/20 blur-3xl dark:bg-[#7F1BFF]/25" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#22D3EE]/15 blur-3xl" />
      </div>

      {/* Mobile View - Desktop Only Message */}
      <div className="md:hidden flex items-center justify-center min-h-[60vh] px-4">
        <div className={`${GLASS} max-w-md p-8 text-center`}>
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-slate-400 dark:text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Desktop only
          </h2>
          <p className="mb-2 text-slate-600 dark:text-slate-300">
            The Kanban board is optimized for desktop viewing and is not available on mobile devices.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please access this feature from a desktop or laptop computer for the best experience.
          </p>
        </div>
      </div>

      {/* Desktop View - Full Kanban Board */}
      <div className="hidden md:block space-y-4 md:space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Kanban Board
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              Manage tasks across multiple businesses
            </p>
          </div>
          <span className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-none">
            {currentTasks.length} task{currentTasks.length !== 1 ? 's' : ''} in this board
          </span>
        </div>

        {/* Business Manager */}
        <div className={`${GLASS} p-3 sm:p-4`}>
          <BusinessManager
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onSelectBusiness={setSelectedBusinessId}
            onAddBusiness={handleAddBusiness}
            onUpdateBusiness={handleUpdateBusiness}
            onDeleteBusiness={handleDeleteBusiness}
          />
        </div>

        {/* Business Info + Bento Stats */}
        {selectedBusiness && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className={`${GLASS} relative overflow-hidden p-5 lg:col-span-3`}>
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: selectedBusiness.color }}
              />
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {selectedBusiness.name}
              </h2>
              {selectedBusiness.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {selectedBusiness.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedBusiness.color }}
                />
                <span>Active workspace</span>
                <span aria-hidden>·</span>
                <span>{currentTasks.length} task{currentTasks.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:col-span-2">
              {(
                [
                  { id: 'todo', label: 'To do' },
                  { id: 'in-progress', label: 'In progress' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((stat) => (
                <div key={stat.id} className={`${GLASS} p-4`}>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                    {currentTasks.filter((task) => task.status === stat.id).length}
                  </p>
                  <div
                    className={`mt-3 h-1 w-8 rounded-full bg-gradient-to-r ${STAT_ACCENTS[stat.id]}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div className={`${GLASS} p-3 sm:p-4 md:p-5`}>
          <EnhancedKanbanBoard
            tasks={currentTasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskAdd={handleTaskAdd}
            onTaskDelete={handleTaskDelete}
            variant="glass"
          />
        </div>
      </div>
    </div>
  );
}
