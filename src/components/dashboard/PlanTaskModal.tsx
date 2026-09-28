import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import { Client, clientService } from '@/services/client.service';
import { rosterService } from '@/services/roster.service';
import { UserManagementService } from '@/services/user-management.service';
import { XMarkIcon, PlusIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ClientVisit {
  clientId: string;
  clientName: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
}

interface PlanTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedClientIds: string[];
  userId: string;
  userName: string;
  taskTitle: string;
  recurringTaskId?: string; // Add task ID to filter roster entries
}

export function PlanTaskModal({
  isOpen,
  onClose,
  assignedClientIds,
  userId,
  userName,
  taskTitle,
  recurringTaskId,
}: PlanTaskModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [existingVisits, setExistingVisits] = useState<ClientVisit[]>([]); // Track saved visits
  const [currentVisit, setCurrentVisit] = useState<Partial<ClientVisit>>({
    clientId: '',
    scheduleDate: '',
    startTime: '09:00',
    endTime: '17:00',
  });
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingExistingVisits, setLoadingExistingVisits] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load assigned clients
  useEffect(() => {
    const loadClients = async () => {
      if (!isOpen || assignedClientIds.length === 0) return;
      
      setLoadingClients(true);
      try {
        const allClients = await clientService.getAll({ status: 'active', limit: 1000 });
        const assignedClients = allClients.filter(client => 
          assignedClientIds.includes(client.id!)
        );
        setClients(assignedClients);
        
        // Set first client as default if available
        if (assignedClients.length > 0 && !currentVisit.clientId) {
          setCurrentVisit(prev => ({
            ...prev,
            clientId: assignedClients[0].id!,
          }));
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [isOpen, assignedClientIds]);

  // Load existing roster entries for this task
  useEffect(() => {
    const loadExistingVisits = async () => {
      if (!isOpen || !userId) return;
      
      setLoadingExistingVisits(true);
      try {
        console.log('🔍 [PlanTaskModal] Loading existing visits for user:', userId, 'task:', taskTitle);
        
        // Get all roster entries for this user
        const allRosterEntries = await rosterService.getRosterEntries({ userId });
        
        console.log('📋 [PlanTaskModal] Total roster entries for user:', allRosterEntries.length);
        
        // Filter entries that match this task title and are in the future or recent past (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const taskVisits = allRosterEntries
          .filter(entry => {
            const matchesTask = entry.taskDetail === taskTitle;
            const entryDate = entry.taskDate ? new Date(entry.taskDate) : (entry.timeStart ? new Date(entry.timeStart) : null);
            const isRecentOrFuture = entryDate ? entryDate >= thirtyDaysAgo : false;
            const hasRequiredFields = entry.clientId && entry.clientName;
            
            console.log('🔎 [PlanTaskModal] Entry:', {
              taskDetail: entry.taskDetail,
              taskDate: entry.taskDate,
              matchesTask,
              isRecentOrFuture,
              hasRequiredFields,
              willInclude: matchesTask && isRecentOrFuture && hasRequiredFields
            });
            
            return matchesTask && isRecentOrFuture && hasRequiredFields;
          })
          .map(entry => {
            const timeStart = entry.timeStart instanceof Date ? entry.timeStart : new Date(entry.timeStart!);
            const timeEnd = entry.timeEnd instanceof Date ? entry.timeEnd : new Date(entry.timeEnd!);
            
            return {
              clientId: entry.clientId!,
              clientName: entry.clientName!,
              scheduleDate: entry.taskDate || timeStart.toISOString().split('T')[0],
              startTime: `${timeStart.getHours().toString().padStart(2, '0')}:${timeStart.getMinutes().toString().padStart(2, '0')}`,
              endTime: `${timeEnd.getHours().toString().padStart(2, '0')}:${timeEnd.getMinutes().toString().padStart(2, '0')}`,
            };
          });
        
        console.log('✅ [PlanTaskModal] Loaded existing visits:', taskVisits.length);
        setExistingVisits(taskVisits);
      } catch (error) {
        console.error('❌ [PlanTaskModal] Error loading existing visits:', error);
      } finally {
        setLoadingExistingVisits(false);
      }
    };

    loadExistingVisits();
  }, [isOpen, userId, taskTitle]);

  // Reset new visits when modal closes (but keep existing visits)
  useEffect(() => {
    if (!isOpen) {
      setVisits([]);
      setCurrentVisit({
        clientId: clients.length > 0 ? clients[0].id! : '',
        scheduleDate: '',
        startTime: '09:00',
        endTime: '17:00',
      });
    }
  }, [isOpen, clients]);

  const handleAddVisit = () => {
    if (!currentVisit.clientId || !currentVisit.scheduleDate || !currentVisit.startTime || !currentVisit.endTime) {
      alert('Please fill in all fields');
      return;
    }

    const client = clients.find(c => c.id === currentVisit.clientId);
    if (!client) return;

    const newVisit: ClientVisit = {
      clientId: currentVisit.clientId,
      clientName: client.clientName,
      scheduleDate: currentVisit.scheduleDate,
      startTime: currentVisit.startTime,
      endTime: currentVisit.endTime,
    };

    setVisits([...visits, newVisit]);
    
    // Reset current visit for next entry
    setCurrentVisit({
      clientId: clients.length > 0 ? clients[0].id! : '',
      scheduleDate: '',
      startTime: '09:00',
      endTime: '17:00',
    });
  };

  const handleRemoveVisit = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (visits.length === 0) {
      alert('Please add at least one visit');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 [PlanTaskModal] Saving visits:', visits.length);
      
      // Create roster entries for each visit
      const rosterEntries = visits.map(visit => {
        const scheduleDate = new Date(visit.scheduleDate);
        const [startHour, startMinute] = visit.startTime.split(':').map(Number);
        const [endHour, endMinute] = visit.endTime.split(':').map(Number);

        const timeStart = new Date(scheduleDate);
        timeStart.setHours(startHour, startMinute, 0, 0);

        const timeEnd = new Date(scheduleDate);
        timeEnd.setHours(endHour, endMinute, 0, 0);

        return {
          taskType: 'single' as const,
          userId,
          userName,
          clientId: visit.clientId,
          clientName: visit.clientName,
          taskDetail: taskTitle,
          timeStart,
          timeEnd,
          taskDate: visit.scheduleDate,
          durationHours: (timeEnd.getTime() - timeStart.getTime()) / (1000 * 60 * 60),
        };
      });

      // Bulk create roster entries
      await rosterService.bulkCreateRosterEntries(rosterEntries);

      console.log('✅ [PlanTaskModal] Visits saved successfully');
      alert(`Successfully scheduled ${visits.length} visit${visits.length > 1 ? 's' : ''}!`);
      
      // Add newly saved visits to existing visits
      setExistingVisits([...existingVisits, ...visits]);
      setVisits([]); // Clear new visits
      
      onClose();
    } catch (error) {
      console.error('❌ [PlanTaskModal] Error saving visits:', error);
      alert('Error saving visits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableClients = () => {
    // Show all assigned clients in dropdown
    return clients;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hour, minute] = timeString.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Task - {taskTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Schedule client visits for your assigned clients
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loading State for Existing Visits */}
          {loadingExistingVisits && (
            <div className="text-center py-4 text-muted-foreground">
              Loading existing visits...
            </div>
          )}

          {/* Existing Visits (Already Saved) */}
          {!loadingExistingVisits && existingVisits.length > 0 && (
            <div>
              <Label className="mb-3 block font-semibold text-success">
                Previously Scheduled Visits ({existingVisits.length})
              </Label>
              <div className="border border-success/30 rounded-lg overflow-hidden bg-success/10">
                <table className="w-full">
                  <thead className="bg-success/15">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-success uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-success uppercase tracking-wider">
                        Schedule Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-success uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-success uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-success uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {existingVisits.map((visit, index) => (
                      <tr key={`existing-${index}`} className="hover:bg-success/10">
                        <td className="px-4 py-3 text-sm text-foreground">{visit.clientName}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatDate(visit.scheduleDate)}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatTime(visit.startTime)}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatTime(visit.endTime)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                            Saved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-success mt-2">
                These visits are already saved in the roster calendar
              </p>
            </div>
          )}

          {/* Current Visits Table (New, Not Yet Saved) */}
          {visits.length > 0 && (
            <div>
              <Label className="mb-3 block font-semibold text-info">
                New Visits to Schedule ({visits.length})
              </Label>
              <div className="border border-info/30 rounded-lg overflow-hidden bg-info/10">
                <table className="w-full">
                  <thead className="bg-info/15">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-info uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-info uppercase tracking-wider">
                        Schedule Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-info uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-info uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-info uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {visits.map((visit, index) => (
                      <tr key={`new-${index}`} className="hover:bg-info/10">
                        <td className="px-4 py-3 text-sm text-foreground">{visit.clientName}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatDate(visit.scheduleDate)}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatTime(visit.startTime)}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatTime(visit.endTime)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            type="button"
                            onClick={() => handleRemoveVisit(index)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-info mt-2">
                Click "Save" button below to add these visits to the roster
              </p>
            </div>
          )}

          {/* Add Visit Form */}
          <div className="border border-border rounded-lg p-4 bg-muted">
            <Label className="mb-3 block font-semibold">
              {visits.length === 0 ? 'Add Visit' : 'Add More Visit'}
            </Label>
            
            {loadingClients ? (
              <div className="text-center py-4 text-muted-foreground">Loading clients...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No clients assigned to you for this task
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name */}
                <div>
                  <Label htmlFor="clientId" className="flex items-center gap-2 mb-2">
                    <span>Client Name</span>
                    <span className="text-xs text-muted-foreground">(Auto-picked from assigned)</span>
                  </Label>
                  <Select
                    id="clientId"
                    value={currentVisit.clientId}
                    onChange={(e) => setCurrentVisit({ ...currentVisit, clientId: e.target.value })}
                    className="w-full"
                  >
                    <option value="">Select a client...</option>
                    {getAvailableClients().map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.clientName} {client.businessName ? `(${client.businessName})` : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clients.length} client{clients.length !== 1 ? 's' : ''} assigned to you
                  </p>
                </div>

                {/* Schedule Date */}
                <div>
                  <Label htmlFor="scheduleDate" className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="w-4 h-4" />
                    Schedule Visit Date
                  </Label>
                  <input
                    type="date"
                    id="scheduleDate"
                    value={currentVisit.scheduleDate}
                    onChange={(e) => setCurrentVisit({ ...currentVisit, scheduleDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <Label htmlFor="startTime" className="flex items-center gap-2 mb-2">
                    <ClockIcon className="w-4 h-4" />
                    Start Time
                  </Label>
                  <input
                    type="time"
                    id="startTime"
                    value={currentVisit.startTime}
                    onChange={(e) => setCurrentVisit({ ...currentVisit, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none"
                  />
                </div>

                {/* End Time */}
                <div>
                  <Label htmlFor="endTime" className="flex items-center gap-2 mb-2">
                    <ClockIcon className="w-4 h-4" />
                    End Time
                  </Label>
                  <input
                    type="time"
                    id="endTime"
                    value={currentVisit.endTime}
                    onChange={(e) => setCurrentVisit({ ...currentVisit, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Add Visit Button */}
            {clients.length > 0 && (
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={handleAddVisit}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={loadingClients}
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Visit to Schedule
                </Button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-info/10 border border-info/30 rounded-lg p-4">
            <p className="text-sm text-info">
              <strong>Summary:</strong>
            </p>
            <ul className="text-sm text-info mt-2 ml-4 list-disc space-y-1">
              <li>Previously scheduled: <strong>{existingVisits.length}</strong> visit{existingVisits.length !== 1 ? 's' : ''}</li>
              <li>New visits to save: <strong>{visits.length}</strong> visit{visits.length !== 1 ? 's' : ''}</li>
              <li>Total after saving: <strong>{existingVisits.length + visits.length}</strong> visit{(existingVisits.length + visits.length) !== 1 ? 's' : ''}</li>
            </ul>
            <p className="text-sm text-info mt-3">
              <strong>Note:</strong> All visits appear in:
            </p>
            <ul className="text-sm text-info mt-1 ml-4 list-disc space-y-1">
              <li>Admin/Manager view at <strong>/roster/view-schedule</strong></li>
              <li>Your personal calendar at <strong>/roster/update-schedule</strong></li>
              <li>Color-coded based on duration (Yellow: &lt;8hrs, Orange: ≥8hrs)</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            {visits.length > 0 ? 'Cancel' : 'Close'}
          </Button>
          {visits.length > 0 && (
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={visits.length === 0 || saving}
              loading={saving}
              className="text-white"
            >
              {saving ? 'Saving...' : `Save ${visits.length} New Visit${visits.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
