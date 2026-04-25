'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import flatpickr from 'flatpickr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import {
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { authenticatedFetch } from '@/lib/api-client';
import { Client, clientService } from '@/services/client.service';

interface ScheduleEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ScheduleEntry {
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
}

interface ScheduleTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  currentUserId: string;
  teamMemberMappings?: Array<{
    userId: string;
    userName: string;
    clientIds: string[];
  }>;
  contactIds?: string[];
  onScheduled?: () => void;
}

export function ScheduleTaskModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentUserId,
  teamMemberMappings,
  contactIds,
  onScheduled,
}: ScheduleTaskModalProps) {
  const [employees, setEmployees] = useState<ScheduleEmployee[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // Callback ref: fires the instant the DOM node is attached (even inside Radix Portal).
  // Uses inline:true so the calendar renders inside the dialog DOM — avoids Radix focus-trap
  // stealing clicks from a floating calendar appended to document.body.
  const calendarRef = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      fpInstance.current?.destroy();
      fpInstance.current = null;
      return;
    }
    fpInstance.current?.destroy();
    fpInstance.current = flatpickr(node, {
      mode: 'multiple',
      dateFormat: 'Y-m-d',
      minDate: 'today',
      conjunction: ', ',
      inline: true,
      disableMobile: true,
      onChange: (selectedDates) => {
        setScheduleDates(
          selectedDates.map(d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          })
        );
      },
    });
  }, []);

  // Get clients available for the selected employee.
  // Priority: employee's own mapping clientIds → task-level contactIds → all loaded clients.
  const getClientsForEmployee = (employeeId: string): Client[] => {
    if (!employeeId) return [];

    // If this employee has their own mapping with clients, use those
    const empMapping = teamMemberMappings?.find(m => m.userId === employeeId);
    if (empMapping && empMapping.clientIds.length > 0) {
      return allClients.filter(c => c.id && empMapping.clientIds.includes(c.id));
    }

    // Otherwise fall back to the full task client list (all clients already loaded)
    return allClients;
  };

  // Load employees and clients
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load ALL employees under this manager from the hierarchy.
        // We intentionally do NOT filter by teamMemberMappings here — the
        // admin may have assigned the task to the manager directly, meaning
        // only the manager is in teamMemberMappings. The Schedule modal lets
        // the manager distribute work to their entire team.
        const empResponse = await authenticatedFetch('/api/manager-hierarchy/my-employees');
        if (empResponse.ok) {
          const emps: ScheduleEmployee[] = await empResponse.json();
          setEmployees(emps);
        }

        // OPTIMIZED: Use cached clients instead of fetching on every modal open
        const { useCachedClients } = await import('@/hooks/use-cached-clients');
        const { data: allTaskClients } = useCachedClients();

        if (!allTaskClients) {
          // Fallback if cache is not ready
          const fallbackClients = await clientService.getAll({ status: 'active', limit: 1000 });
          const taskClientIds = new Set<string>();

          teamMemberMappings?.forEach(m => m.clientIds.forEach(id => taskClientIds.add(id)));
          contactIds?.forEach(id => taskClientIds.add(id));

          const filtered = taskClientIds.size > 0
            ? fallbackClients.filter(c => c.id && taskClientIds.has(c.id))
            : fallbackClients;
          setAllClients(filtered);
        } else {
          // Use cached clients
          const taskClientIds = new Set<string>();

          teamMemberMappings?.forEach(m => m.clientIds.forEach(id => taskClientIds.add(id)));
          contactIds?.forEach(id => taskClientIds.add(id));

          const filtered = taskClientIds.size > 0
            ? allTaskClients.filter(c => c.id && taskClientIds.has(c.id))
            : allTaskClients;
          setAllClients(filtered);
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
        toast.error('Failed to load scheduling data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, teamMemberMappings, contactIds]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEntries([]);
      setSelectedEmployee('');
      setSelectedClient('');
      setScheduleDates([]);
      setStartTime('09:00');
      setEndTime('17:00');
    }
  }, [isOpen]);

  // Update client selection when employee changes
  useEffect(() => {
    setSelectedClient('');
  }, [selectedEmployee]);


  const handleAddEntry = () => {
    if (!selectedEmployee || !selectedClient || scheduleDates.length === 0) {
      toast.error('Please select employee, client, and at least one date');
      return;
    }

    const emp = employees.find(e => e.id === selectedEmployee);
    const client = allClients.find(c => c.id === selectedClient);

    if (!emp || !client) return;

    const newEntries: ScheduleEntry[] = scheduleDates.map(date => ({
      employeeId: emp.id,
      employeeName: emp.name,
      clientId: client.id!,
      clientName: client.clientName,
      scheduleDate: date,
      startTime,
      endTime,
    }));

    setEntries(prev => [...prev, ...newEntries]);

    // Reset dates for next entry (keep employee and client for batch scheduling)
    setScheduleDates([]);
    fpInstance.current?.clear();
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (entries.length === 0) {
      toast.error('Please add at least one schedule entry');
      return;
    }

    setSaving(true);
    try {
      const response = await authenticatedFetch('/api/recurring-tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          taskTitle,
          scheduledBy: currentUserId,
          entries: entries.map(entry => ({
            userId: entry.employeeId,
            userName: entry.employeeName,
            clientId: entry.clientId,
            clientName: entry.clientName,
            scheduleDate: entry.scheduleDate,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully scheduled ${result.created || entries.length} roster entries!`);
        onScheduled?.();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Group entries by employee for display
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.employeeId]) {
      acc[entry.employeeId] = {
        employeeName: entry.employeeName,
        items: [],
      };
    }
    acc[entry.employeeId].items.push(entry);
    return acc;
  }, {} as Record<string, { employeeName: string; items: ScheduleEntry[] }>);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const availableClients = getClientsForEmployee(selectedEmployee);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto !p-4 sm:!p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            Schedule Task
          </DialogTitle>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Schedule &quot;{taskTitle}&quot; for team members
          </p>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading scheduling data...
            </div>
          ) : (
            <>
              {/* Add Schedule Form */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800">
                <Label className="mb-2 sm:mb-3 block font-semibold text-sm sm:text-base">Add Schedule Entry</Label>

                {/* Two-column equal grid on md+: form fields left, calendar right. Single column on mobile. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

                  {/* LEFT — Employee, Client, Time, Add button */}
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Employee */}
                    <div>
                      <Label htmlFor="scheduleEmployee" className="flex items-center gap-2 mb-2">
                        <UserGroupIcon className="w-4 h-4" />
                        Select Employee
                      </Label>
                      <Select
                        id="scheduleEmployee"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full"
                      >
                        <option value="">Select employee...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email})
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Client */}
                    <div>
                      <Label htmlFor="scheduleClient" className="mb-2 block">
                        Client
                      </Label>
                      <Select
                        id="scheduleClient"
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="w-full"
                        disabled={!selectedEmployee}
                      >
                        <option value="">
                          {selectedEmployee ? 'Select client...' : 'Select employee first'}
                        </option>
                        {availableClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.clientName} {client.businessName ? `(${client.businessName})` : ''}
                          </option>
                        ))}
                      </Select>
                      {selectedEmployee && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {availableClients.length} client{availableClients.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>

                    {/* Start / End Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="schedStartTime" className="mb-2 block">
                          Start Time
                        </Label>
                        <input
                          type="time"
                          id="schedStartTime"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="schedEndTime" className="mb-2 block">
                          End Time
                        </Label>
                        <input
                          type="time"
                          id="schedEndTime"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      type="button"
                      onClick={handleAddEntry}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 mt-auto"
                      disabled={!selectedEmployee || !selectedClient || scheduleDates.length === 0}
                    >
                      <PlusIcon className="w-5 h-5" />
                      {scheduleDates.length > 1
                        ? `Add ${scheduleDates.length} Dates`
                        : 'Add to Schedule'}
                    </Button>
                  </div>

                  {/* RIGHT — Inline calendar + selected date chips */}
                  <div className="flex-1 min-w-0">
                    <Label className="flex items-center gap-2 mb-2">
                      <CalendarDaysIcon className="w-4 h-4" />
                      Schedule Date(s)
                      {scheduleDates.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-teal-600 text-white text-xs rounded-full">
                          {scheduleDates.length} selected
                        </span>
                      )}
                    </Label>
                    {/* flatpickr inline target — renders calendar directly here inside dialog DOM */}
                    <div ref={calendarRef} className="flatpickr-inline-wrapper" />
                    {scheduleDates.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {scheduleDates.map(date => (
                          <span
                            key={date}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-xs rounded-full"
                          >
                            {formatDate(date)}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = scheduleDates.filter(d => d !== date);
                                setScheduleDates(updated);
                                fpInstance.current?.setDate(updated);
                              }}
                              className="ml-0.5 hover:text-red-600"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Scheduled Entries */}
              {entries.length > 0 && (
                <div>
                  <Label className="mb-2 sm:mb-3 block font-semibold text-teal-700 dark:text-teal-400 text-sm sm:text-base">
                    Scheduled Entries ({entries.length})
                  </Label>

                  {Object.entries(groupedEntries).map(([empId, group]) => (
                    <div
                      key={empId}
                      className="mb-3 border border-teal-200 dark:border-teal-800 rounded-lg overflow-hidden"
                    >
                      <div className="bg-teal-50 dark:bg-teal-900/30 px-3 py-2 border-b border-teal-200 dark:border-teal-800">
                        <span className="font-medium text-teal-800 dark:text-teal-300 text-sm">
                          {group.employeeName}
                        </span>
                        <span className="text-xs text-teal-600 dark:text-teal-400 ml-2">
                          ({group.items.length} {group.items.length === 1 ? 'entry' : 'entries'})
                        </span>
                      </div>
                      <div className="bg-white dark:bg-gray-dark overflow-x-auto">
                        <table className="w-full min-w-[320px]">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Client
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Date
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase hidden sm:table-cell">
                                Time
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Del
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {group.items.map((entry, idx) => {
                              const globalIdx = entries.findIndex(
                                e =>
                                  e.employeeId === entry.employeeId &&
                                  e.clientId === entry.clientId &&
                                  e.scheduleDate === entry.scheduleDate &&
                                  e.startTime === entry.startTime
                              );
                              return (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white max-w-[100px] truncate">
                                    {entry.clientName}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                    {formatDate(entry.scheduleDate)}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white whitespace-nowrap hidden sm:table-cell">
                                    {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEntry(globalIdx)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Box — hidden on mobile to save space */}
              <div className="hidden sm:block bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3 sm:p-4">
                <p className="text-sm text-teal-900 dark:text-teal-300">
                  <strong>How it works:</strong>
                </p>
                <ul className="text-xs sm:text-sm text-teal-800 dark:text-teal-400 mt-2 ml-4 list-disc space-y-1">
                  <li>Select an employee, client, and date to schedule a visit</li>
                  <li>You can add multiple dates for the same employee/client</li>
                  <li>You can assign multiple clients to different employees</li>
                  <li>Scheduled visits will appear in each employee&apos;s roster</li>
                  <li>Admin can view all schedules at <strong>/roster/view-schedule</strong></li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 mt-3 sm:mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="text-sm h-9 sm:h-10">
            {entries.length > 0 ? 'Cancel' : 'Close'}
          </Button>
          {entries.length > 0 && (
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={entries.length === 0 || saving}
              loading={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm h-9 sm:h-10"
            >
              {saving ? 'Saving...' : `Save ${entries.length} Schedule${entries.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
