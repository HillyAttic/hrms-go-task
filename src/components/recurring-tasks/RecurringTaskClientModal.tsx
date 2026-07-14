'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { RecurringTask } from '@/services/recurring-task.service';
import { taskCompletionService } from '@/services/task-completion.service';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useModal } from '@/contexts/modal-context';
import { auth } from '@/lib/firebase';

interface Client {
  id: string;
  clientName: string;
  contact?: { email?: string };
}

interface ClientCompletion {
  clientId: string;
  completedMonths: string[]; // Array of month keys like "2025-04", "2025-05"
  arnData?: Map<string, { arnNumber: string; arnName: string }>; // ARN data per month
  remarkData?: Map<string, { remark: string; remarkBy: string }>; // Remark data per month
}

interface RecurringTaskClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: RecurringTask | null;
  clients: Client[];
  viewingMonth?: Date; // The month being viewed in the calendar
}

/**
 * RecurringTaskClientModal Component
 * Shows all clients with checkboxes for each month from April to March
 * Displays months based on recurrence pattern (monthly shows all, quarterly shows every 3 months)
 */
export function RecurringTaskClientModal({
  isOpen,
  onClose,
  task,
  clients,
  viewingMonth,
}: RecurringTaskClientModalProps) {
  const [clientCompletions, setClientCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [arnData, setArnData] = useState<Map<string, Map<string, { arnNumber: string; arnName: string }>>>(new Map());
  const [remarkData, setRemarkData] = useState<Map<string, Map<string, { remark: string; remarkBy: string }>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showArnDialog, setShowArnDialog] = useState(false);
  const [currentArnRequest, setCurrentArnRequest] = useState<{ clientId: string; monthKey: string } | null>(null);
  const [arnNumber, setArnNumber] = useState('');
  const [arnName, setArnName] = useState('');
  const [arnError, setArnError] = useState('');
  const [showRemarkDialog, setShowRemarkDialog] = useState(false);
  const [currentRemarkRequest, setCurrentRemarkRequest] = useState<{ clientId: string; monthKey: string } | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [remarkBy, setRemarkBy] = useState('');
  const [remarkDate, setRemarkDate] = useState('');
  const [remarkError, setRemarkError] = useState('');
  const { openModal, closeModal } = useModal();

  // Sync modal visibility with context
  useEffect(() => {
    if (isOpen) { openModal(); return () => closeModal(); }
  }, [isOpen, openModal, closeModal]);

  // Sync ARN dialog visibility with context
  useEffect(() => {
    if (showArnDialog) { openModal(); return () => closeModal(); }
  }, [showArnDialog, openModal, closeModal]);

  // Sync Remark dialog visibility with context
  useEffect(() => {
    if (showRemarkDialog) { openModal(); return () => closeModal(); }
  }, [showRemarkDialog, openModal, closeModal]);

  const { user, userProfile } = useEnhancedAuth();
  // Generate only the viewing month (or current month if not specified)
  const generateMonths = () => {
    const targetDate = viewingMonth || new Date();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    const date = new Date(targetYear, targetMonth, 1);
    return [{
      key: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      monthName: date.toLocaleDateString('en-US', { month: 'short' }),
      year: targetYear.toString(),
      fullDate: date,
    }];
  };

  // Filter months based on recurrence pattern - always show only viewing month
  const getVisibleMonths = () => {
    return generateMonths(); // Always return viewing month only
  };

  const visibleMonths = getVisibleMonths();

  // Initialize client completions from task data
  useEffect(() => {
    if (task && isOpen && task.id) {
      console.log('[ARN Debug] Task loaded in modal:', {
        taskId: task.id,
        taskTitle: task.title,
        requiresArn: task.requiresArn,
        fullTask: task
      });
      loadCompletions();
    }
  }, [task, clients, isOpen, viewingMonth]);

  // Filter clients based on team member mappings
  const getFilteredClients = (): Client[] => {
    if (!task || !user) return clients;
    
    // Check if task has team member mappings
    if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
      // Check if user is admin or manager - they should see all clients
      if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
        console.log('[Team Member Mapping] Admin/Manager viewing all clients:', {
          userId: user.uid,
          role: userProfile.role,
          totalClients: clients.length
        });
        return clients;
      }
      
      // Find the mapping for current user
      const userMapping = task.teamMemberMappings.find(mapping => mapping.userId === user.uid);
      
      if (userMapping) {
        // Filter clients to only show those assigned to this user
        const filteredClients = clients.filter(client => 
          client.id && userMapping.clientIds.includes(client.id)
        );
        
        console.log('[Team Member Mapping] Filtered clients for user:', {
          userId: user.uid,
          totalClients: clients.length,
          assignedClients: filteredClients.length,
          clientIds: userMapping.clientIds
        });
        
        return filteredClients;
      }
    }
    
    // No team member mappings or user not in mappings - show all clients
    return clients;
  };

  const filteredClients = getFilteredClients();

  const loadCompletions = async () => {
    if (!task || !task.id) return;
    
    setLoading(true);
    try {
      const completions = new Map<string, Set<string>>();
      const arnDataMap = new Map<string, Map<string, { arnNumber: string; arnName: string }>>();
      const remarkDataMap = new Map<string, Map<string, { remark: string; remarkBy: string }>>();
      
      // Get filtered clients
      const clientsToLoad = getFilteredClients();
      
      // Initialize all filtered clients with empty sets
      clientsToLoad.forEach(client => {
        completions.set(client.id, new Set());
        arnDataMap.set(client.id, new Map());
        remarkDataMap.set(client.id, new Map());
      });

      // Load completion data from API instead of direct Firebase access
      const user = auth.currentUser;
      if (!user) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/task-completions?recurringTaskId=${task.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch completions: ${response.statusText}`);
      }

      const taskCompletions = await response.json();
      
      taskCompletions.forEach((completion: any) => {
        // Always process remark data (regardless of completion status)
        if (completion.remark && completion.remarkBy) {
          const clientRemarkData = remarkDataMap.get(completion.clientId) || new Map();
          clientRemarkData.set(completion.monthKey, {
            remark: completion.remark,
            remarkBy: completion.remarkBy,
          });
          remarkDataMap.set(completion.clientId, clientRemarkData);
        }

        // Only mark as completed if isCompleted is true
        if (completion.isCompleted) {
          const clientMonths = completions.get(completion.clientId) || new Set<string>();
          clientMonths.add(completion.monthKey);
          completions.set(completion.clientId, clientMonths);

          // Store ARN data if available
          if (completion.arnNumber && completion.arnName) {
            const clientArnData = arnDataMap.get(completion.clientId) || new Map();
            clientArnData.set(completion.monthKey, {
              arnNumber: completion.arnNumber,
              arnName: completion.arnName,
            });
            arnDataMap.set(completion.clientId, clientArnData);
          }
        }
      });

      setClientCompletions(completions);
      setArnData(arnDataMap);
      setRemarkData(remarkDataMap);
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = async (clientId: string, monthKey: string) => {
    const isCurrentlyCompleted = clientCompletions.get(clientId)?.has(monthKey) || false;

    console.log('[ARN Debug] Toggle completion:', {
      clientId,
      monthKey,
      isCurrentlyCompleted,
      taskRequiresArn: task?.requiresArn,
      shouldShowDialog: task?.requiresArn && !isCurrentlyCompleted
    });

    // If task requires ARN and we're checking (not unchecking), show ARN dialog
    if (task?.requiresArn && !isCurrentlyCompleted) {
      console.log('[ARN Debug] Showing ARN dialog');
      setCurrentArnRequest({ clientId, monthKey });
      setArnNumber('');
      // Use displayName from userProfile, fallback to user displayName, then email
      const userName = userProfile?.displayName || user?.displayName || user?.email || '';
      console.log('[ARN Debug] User info:', {
        profileDisplayName: userProfile?.displayName,
        userDisplayName: user?.displayName,
        email: user?.email,
        userName
      });
      setArnName(userName);
      setArnError('');
      setShowArnDialog(true);
      return;
    }

    // If task requires Remark and we're checking (not unchecking), show Remark dialog
    if (task?.requiresRemark && !isCurrentlyCompleted) {
      setCurrentRemarkRequest({ clientId, monthKey });
      setRemarkText('');
      const userName = userProfile?.displayName || user?.displayName || user?.email || '';
      setRemarkBy(userName);
      setRemarkDate(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
      setRemarkError('');
      setShowRemarkDialog(true);
      return;
    }

    console.log('[ARN Debug] Toggling without ARN dialog');

    // Otherwise, toggle normally
    const newCompleted = !isCurrentlyCompleted;
    setClientCompletions(prev => {
      const newMap = new Map(prev);
      const clientMonths = new Set<string>(newMap.get(clientId) || new Set<string>());

      if (newCompleted) {
        clientMonths.add(monthKey);
      } else {
        clientMonths.delete(monthKey);
        // Remove ARN data
        setArnData(prevArn => {
          const newArnMap = new Map(prevArn);
          const clientArnData = new Map(newArnMap.get(clientId));
          clientArnData.delete(monthKey);
          newArnMap.set(clientId, clientArnData);
          return newArnMap;
        });
      }

      newMap.set(clientId, clientMonths);
      return newMap;
    });

    // Auto-save to Firestore immediately
    if (task?.id && user) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch('/api/task-completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              recurringTaskId: task.id,
              clientId,
              monthKey,
              isCompleted: newCompleted,
            }),
          });
        }
      } catch (error) {
        console.error('Error auto-saving toggle:', error);
      }
    }
  };

  const handleArnSubmit = async () => {
    // Validate ARN number (15 digits)
    if (!arnNumber || arnNumber.length !== 15 || !/^\d{15}$/.test(arnNumber)) {
      setArnError('ARN must be exactly 15 digits');
      return;
    }

    if (!arnName || arnName.trim().length === 0) {
      setArnError('Name is required');
      return;
    }

    if (!currentArnRequest) return;

    const { clientId, monthKey } = currentArnRequest;

    // Add completion
    setClientCompletions(prev => {
      const newMap = new Map(prev);
      const clientMonths = new Set<string>(newMap.get(clientId) || new Set<string>());
      clientMonths.add(monthKey);
      newMap.set(clientId, clientMonths);
      return newMap;
    });

    // Store ARN data
    setArnData(prev => {
      const newMap = new Map(prev);
      const clientArnData = new Map(newMap.get(clientId) || new Map());
      clientArnData.set(monthKey, { arnNumber, arnName: arnName.trim() });
      newMap.set(clientId, clientArnData);
      return newMap;
    });

    // Auto-save to Firestore immediately
    if (task?.id && user) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch('/api/task-completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              recurringTaskId: task.id,
              clientId,
              monthKey,
              isCompleted: true,
              arnNumber,
              arnName: arnName.trim(),
            }),
          });
        }
      } catch (error) {
        console.error('Error auto-saving ARN:', error);
      }
    }

    // Close dialog
    setShowArnDialog(false);
    setCurrentArnRequest(null);
    setArnNumber('');
    setArnName('');
    setArnError('');
  };

  const handleArnCancel = () => {
    setShowArnDialog(false);
    setCurrentArnRequest(null);
    setArnNumber('');
    setArnName('');
    setArnError('');
  };

  const handleRemarkSubmit = async () => {
    if (!currentRemarkRequest) return;

    if (!remarkText || remarkText.trim().length === 0) {
      setRemarkError('Remark is required');
      return;
    }

    if (!remarkBy || remarkBy.trim().length === 0) {
      setRemarkError('Name is required');
      return;
    }

    const { clientId, monthKey } = currentRemarkRequest;

    // Add completion
    setClientCompletions(prev => {
      const newMap = new Map(prev);
      const clientMonths = new Set<string>(newMap.get(clientId) || new Set<string>());
      clientMonths.add(monthKey);
      newMap.set(clientId, clientMonths);
      return newMap;
    });

    // Store remark data
    setRemarkData(prev => {
      const newMap = new Map(prev);
      const clientRemarkData = new Map(newMap.get(clientId) || new Map());
      clientRemarkData.set(monthKey, { remark: remarkText.trim(), remarkBy: remarkBy.trim() });
      newMap.set(clientId, clientRemarkData);
      return newMap;
    });

    // Auto-save to Firestore immediately
    if (task?.id && user) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch('/api/task-completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              recurringTaskId: task.id,
              clientId,
              monthKey,
              isCompleted: true,
              remark: remarkText.trim(),
              remarkBy: remarkBy.trim(),
            }),
          });
        }
      } catch (error) {
        console.error('Error auto-saving remark with completion:', error);
      }
    }

    setShowRemarkDialog(false);
    setCurrentRemarkRequest(null);
    setRemarkText('');
    setRemarkBy('');
    setRemarkDate('');
    setRemarkError('');
  };

  const handleRemarkSkip = () => {
    // User opts out — checkbox stays unchecked, no data stored
    setShowRemarkDialog(false);
    setCurrentRemarkRequest(null);
    setRemarkText('');
    setRemarkBy('');
    setRemarkDate('');
    setRemarkError('');
  };

  const handleRemarkOnly = async () => {
    // Save remark WITHOUT ticking the checkbox
    if (!currentRemarkRequest) return;

    if (!remarkText || remarkText.trim().length === 0) {
      setRemarkError('Remark is required');
      return;
    }

    if (!remarkBy || remarkBy.trim().length === 0) {
      setRemarkError('Name is required');
      return;
    }

    const { clientId, monthKey } = currentRemarkRequest;

    // Store remark data only (do NOT mark as completed)
    setRemarkData(prev => {
      const newMap = new Map(prev);
      const clientRemarkData = new Map(newMap.get(clientId) || new Map());
      clientRemarkData.set(monthKey, { remark: remarkText.trim(), remarkBy: remarkBy.trim() });
      newMap.set(clientId, clientRemarkData);
      return newMap;
    });

    // Auto-save to Firestore immediately
    if (task?.id && user) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          await fetch('/api/task-completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              recurringTaskId: task.id,
              clientId,
              monthKey,
              isCompleted: false,
              remark: remarkText.trim(),
              remarkBy: remarkBy.trim(),
            }),
          });
        }
      } catch (error) {
        console.error('Error auto-saving remark:', error);
      }
    }

    setShowRemarkDialog(false);
    setCurrentRemarkRequest(null);
    setRemarkText('');
    setRemarkBy('');
    setRemarkDate('');
    setRemarkError('');
  };

  const isCompleted = (clientId: string, monthKey: string) => {
    return clientCompletions.get(clientId)?.has(monthKey) || false;
  };

  const handleSave = async () => {
    if (!task || !task.id || !user) {
      console.error('Cannot save: missing task, task.id, or user', { task: task?.id, user: user?.uid });
      return;
    }
    
    setSaving(true);
    try {
      // Prepare bulk update data
      const updates: Array<{
        clientId: string;
        monthKey: string;
        isCompleted: boolean;
        arnNumber?: string;
        arnName?: string;
        remark?: string;
        remarkBy?: string;
      }> = [];

      visibleMonths.forEach(month => {
        filteredClients.forEach(client => {
          const isCompleted = clientCompletions.get(client.id)?.has(month.key) || false;
          const clientArnData = arnData.get(client.id);
          const monthArnData = clientArnData?.get(month.key);
          const clientRemarkData = remarkData.get(client.id);
          const monthRemarkData = clientRemarkData?.get(month.key);

          updates.push({
            clientId: client.id,
            monthKey: month.key,
            isCompleted,
            arnNumber: monthArnData?.arnNumber,
            arnName: monthArnData?.arnName,
            remark: monthRemarkData?.remark,
            remarkBy: monthRemarkData?.remarkBy,
          });
        });
      });

      console.log('Saving completions:', {
        taskId: task.id,
        totalUpdates: updates.length,
        completedCount: updates.filter(u => u.isCompleted).length,
        withArnCount: updates.filter(u => u.arnNumber).length,
        withRemarkCount: updates.filter(u => u.remark).length,
        remarks: updates.filter(u => u.remark).map(u => ({ clientId: u.clientId, monthKey: u.monthKey, remark: u.remark })),
        userId: user.uid
      });

      // Save to API instead of direct Firebase access
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/task-completions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recurringTaskId: task.id,
          completions: updates,
          completedBy: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('API Error Response:', errorData);
        throw new Error(`Failed to save completions: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Completions saved successfully:', result);
      
      onClose();
    } catch (error) {
      console.error('Error saving completions:', error);
      alert('Failed to save completions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 pb-20 sm:pb-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-dark border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{task.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track completion for {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} • {visibleMonths[0]?.label || 'Current month'} only
              </p>
              {task.teamMemberMappings && task.teamMemberMappings.length > 0 && filteredClients.length < clients.length && userProfile?.role !== 'admin' && userProfile?.role !== 'manager' && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                  <UserGroupIcon className="w-3 h-3" />
                  Showing only your assigned clients
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-auto flex-1 max-h-[calc(90vh-180px)]">
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    {task.teamMemberMappings && task.teamMemberMappings.length > 0
                      ? 'No clients assigned to you for this task'
                      : 'No clients assigned to this task'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 min-w-[150px] sm:min-w-[200px]">
                          Client Name
                        </th>
                        {visibleMonths.map(month => (
                          <th
                            key={month.key}
                            className="px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-gray-700 min-w-[60px] sm:min-w-[80px]"
                          >
                            <div>{month.monthName}</div>
                            <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              {month.fullDate.getFullYear()}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredClients.map((client, clientIndex) => {
                        return (
                          <tr
                            key={client.id}
                            className={clientIndex % 2 === 0 ? 'bg-white dark:bg-gray-dark' : 'bg-gray-50 dark:bg-gray-800'}
                          >
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 sticky left-0 z-10 bg-white dark:bg-gray-dark">
                              <div>
                                <div className="font-semibold text-xs sm:text-sm">{client.clientName}</div>
                                {client.contact?.email && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-none">{client.contact.email}</div>
                                )}
                              </div>
                            </td>
                            {visibleMonths.map(month => {
                              const monthRemark = remarkData.get(client.id)?.get(month.key);
                              return (
                              <td
                                key={month.key}
                                className="px-2 sm:px-3 py-2 sm:py-3 text-center"
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isCompleted(client.id, month.key)}
                                      onChange={() => toggleCompletion(client.id, month.key)}
                                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 cursor-pointer"
                                      aria-label={`Mark ${client.clientName} as completed for ${month.label}`}
                                    />
                                  </div>
                                  {monthRemark && (
                                    <span
                                      className="text-[9px] text-amber-700 dark:text-amber-400 whitespace-normal break-words"
                                      title={`${monthRemark.remark} — ${monthRemark.remarkBy}`}
                                    >
                                      💬 {monthRemark.remark}
                                    </span>
                                  )}
                                </div>
                              </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Total: {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} × {visibleMonths.length} month{visibleMonths.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-dark border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ARN Dialog */}
      {showArnDialog && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleArnCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ARN Required
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This task requires an Application Reference Number (ARN) to mark as complete.
              </p>

              <div className="space-y-4">
                {/* ARN Number Input */}
                <div>
                  <label htmlFor="arn-number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ARN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="arn-number"
                    type="text"
                    value={arnNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setArnNumber(value);
                      setArnError('');
                    }}
                    placeholder="Enter 15-digit ARN"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {arnNumber.length}/15 digits
                  </p>
                </div>

                {/* Name Input - Read Only */}
                <div>
                  <label htmlFor="arn-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="arn-name"
                    type="text"
                    value={arnName}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Name is automatically filled from your profile
                  </p>
                </div>

                {/* Error Message */}
                {arnError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                    {arnError}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleArnCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-dark border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArnSubmit}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remark Dialog */}
      {showRemarkDialog && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleRemarkSkip}
            />

            <div className="relative bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-md w-full p-6">
              {/* Close button */}
              <button
                onClick={handleRemarkSkip}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                aria-label="Close dialog"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pr-8">
                Add Remark
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add a remark for this task. Submit to mark complete with remark, or Save Remark to add remark without marking complete.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="remark-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Remark <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="remark-text"
                    value={remarkText}
                    onChange={(e) => {
                      setRemarkText(e.target.value);
                      setRemarkError('');
                    }}
                    placeholder="Enter your remark..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="remark-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="remark-name"
                    type="text"
                    value={remarkBy}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Name is automatically filled from your profile
                  </p>
                </div>

                <div>
                  <label htmlFor="remark-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    id="remark-date"
                    type="text"
                    value={remarkDate}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current date is automatically recorded
                  </p>
                </div>

                {remarkError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                    {remarkError}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRemarkOnly}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-dark border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:bg-gray-800 transition-colors flex items-center justify-center"
                >
                  Save remark but mark as incomplete
                </button>
                <button
                  onClick={handleRemarkSubmit}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Submit and mark completed
                  <CheckIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
