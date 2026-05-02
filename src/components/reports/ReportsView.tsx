'use client';

import React, { useState, useEffect } from 'react';
import { RecurringTask, recurringTaskService, TeamMemberMapping } from '@/services/recurring-task.service';
import { clientService, Client } from '@/services/client.service';
import { taskCompletionService, ClientTaskCompletion } from '@/services/task-completion.service';
import { UserGroupIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useModal } from '@/contexts/modal-context';
import { exportToPDF, exportToExcel, exportSummaryToPDF, exportSummaryToExcel } from '@/utils/report-export.utils';
import { auth } from '@/lib/firebase';
import { generateMonths, buildCompletionData, getCompletionStatus, calculateCompletionRate } from '@/utils/report-utils';
import { TaskReportModal } from '@/components/reports/TaskReportModal';


export function ReportsView() {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [completions, setCompletions] = useState<Map<string, ClientTaskCompletion[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { openModal: openGlobalModal, closeModal: closeGlobalModal } = useModal();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Reports: Loading data...');

      // Fetch tasks from API instead of direct Firebase access
      const user = auth.currentUser;
      if (!user) {
        console.error('Reports: User not authenticated');
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const [tasksResponse, clientsData] = await Promise.all([
        fetch('/api/recurring-tasks', { headers }),
        clientService.getAll(),
      ]);

      if (!tasksResponse.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksResponse.statusText}`);
      }

      const tasksData = await tasksResponse.json();
      setTasks(tasksData);
      setClients(clientsData);

      console.log('Reports: Loaded tasks and clients', {
        tasksCount: tasksData.length,
        clientsCount: clientsData.length
      });

      // Load completions for all tasks
      const completionsMap = new Map<string, ClientTaskCompletion[]>();
      await Promise.all(
        tasksData.map(async (task: RecurringTask) => {
          if (task.id) {
            // Fetch completions from API instead of direct Firebase access
            const completionsResponse = await fetch(`/api/task-completions?recurringTaskId=${task.id}`, { headers });
            
            if (completionsResponse.ok) {
              const taskCompletions = await completionsResponse.json();
              completionsMap.set(task.id, taskCompletions);
              console.log(`Reports: Loaded completions for task ${task.title}`, {
                taskId: task.id,
                completionsCount: taskCompletions.length
              });
            } else {
              console.error(`Reports: Failed to load completions for task ${task.id}`);
              completionsMap.set(task.id, []);
            }
          }
        })
      );
      setCompletions(completionsMap);

      console.log('Reports: All data loaded successfully');
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: RecurringTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
    openGlobalModal(); // Notify global context to hide header
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    closeGlobalModal(); // Notify global context to show header
    // Reload data to reflect any changes made in the modal
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track task completion status across all clients</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Export Summary"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Export Summary</span>
              <span className="sm:hidden">Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => exportSummaryToPDF(tasks, clients, completions)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-t-lg transition-colors"
              >
                Export as PDF
              </button>
              <button
                onClick={() => exportSummaryToExcel(tasks, clients, completions)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-b-lg transition-colors"
              >
                Export as Excel
              </button>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Recurring Tasks Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create recurring tasks to track completion reports across your clients.
            </p>
            <button
              onClick={() => window.location.href = '/recurring-tasks'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Recurring Tasks
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recurrence
                  </th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Clients
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completion
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200">
                {tasks.map((task) => {
                const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;

                // Get clients based on task type
                let taskClients: Client[];
                if (hasTeamMemberMapping) {
                  // For team member mapped tasks, get all clients from mappings
                  const allMappedClientIds = new Set<string>();
                  task.teamMemberMappings!.forEach(mapping => {
                    mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
                  });
                  taskClients = clients.filter(c => c.id && allMappedClientIds.has(c.id));
                } else {
                  // For regular tasks, use contactIds
                  taskClients = clients.filter(c => c.id && task.contactIds?.includes(c.id));
                }

                const taskCompletions = completions.get(task.id || '') || [];
                const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);

                return (
                  <tr key={task.id} className="hover:bg-gray-50 dark:bg-gray-800">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{task.title}</div>
                          {hasTeamMemberMapping && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap" title="Assigned via Team Member Mapping">
                              <UserGroupIcon className="w-3 h-3" />
                              <span className="hidden sm:inline">Team Mapped</span>
                              <span className="sm:hidden">Mapped</span>
                            </span>
                          )}
                        </div>
                        {/* Mobile: Show recurrence and client count */}
                        <div className="flex items-center gap-3 text-xs md:hidden">
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                            {task.recurrencePattern}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {hasTeamMemberMapping ? (
                              <span>{task.teamMemberMappings!.reduce((sum, m) => sum + m.clientIds.length, 0)} clients</span>
                            ) : (
                              <span>{taskClients.length} clients</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-600 text-white">
                        {task.recurrencePattern}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {hasTeamMemberMapping ? (
                        <span title={`${task.teamMemberMappings!.length} team member(s) assigned`}>
                          {task.teamMemberMappings!.reduce((sum, m) => sum + m.clientIds.length, 0)} (mapped)
                        </span>
                      ) : (
                        taskClients.length
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full max-w-full bg-gray-200 rounded-full h-2 mr-2 min-w-[60px] sm:min-w-[80px]">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && selectedTask && (
        <TaskReportModal
          task={selectedTask}
          clients={(() => {
            // For team member mapped tasks, get all clients from mappings
            if (selectedTask.teamMemberMappings && selectedTask.teamMemberMappings.length > 0) {
              const allMappedClientIds = new Set<string>();
              selectedTask.teamMemberMappings.forEach(mapping => {
                mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
              });
              return clients.filter(c => c.id && allMappedClientIds.has(c.id));
            }
            // For regular tasks, use contactIds
            return clients.filter(c => c.id && selectedTask.contactIds?.includes(c.id));
          })()}
          completions={completions.get(selectedTask.id || '') || []}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

