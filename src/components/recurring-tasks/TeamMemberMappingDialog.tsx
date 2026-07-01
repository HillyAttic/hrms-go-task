import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import { Client, clientService } from '@/services/client.service';
import { UserProfile } from '@/types/auth.types';
import { authenticatedFetch } from '@/lib/api-client';
import { XMarkIcon, UserIcon, BuildingOfficeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { TeamMemberMapping } from '@/services/recurring-task.service';

interface TeamMemberMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mappings: TeamMemberMapping[]) => void;
  initialMappings?: TeamMemberMapping[];
}

const COMPLIANCE_FILTERS = [
  { value: 'all', label: 'All Clients' },
  { value: 'roc', label: 'ROC' },
  { value: 'gstr1', label: 'GSTR1' },
  { value: 'gst3b', label: 'GST3B' },
  { value: 'iff', label: 'IFF' },
  { value: 'itr', label: 'ITR' },
  { value: 'taxAudit', label: 'Tax Audit' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'clientVisit', label: 'Client Visit' },
  { value: 'bank', label: 'Bank' },
  { value: 'tcs', label: 'TCS' },
  { value: 'tds', label: 'TDS' },
  { value: 'statutoryAudit', label: 'Statutory Audit' },
] as const;

type ComplianceKey = 'roc' | 'gstr1' | 'gst3b' | 'iff' | 'itr' | 'taxAudit' | 'accounting' | 'clientVisit' | 'bank' | 'tcs' | 'tds' | 'statutoryAudit';

export function TeamMemberMappingDialog({
  isOpen,
  onClose,
  onSave,
  initialMappings = [],
}: TeamMemberMappingDialogProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<TeamMemberMapping[]>(initialMappings);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pendingClientIds, setPendingClientIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Load users and clients
  useEffect(() => {
    const loadData = async () => {
      setLoadingUsers(true);
      setLoadingClients(true);
      try {
        const [usersResponse, clientsResult] = await Promise.all([
          authenticatedFetch('/api/manager-hierarchy/my-employees'),
          clientService.getAll({ status: 'active', limit: 1000 }),
        ]);
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        const usersData = await usersResponse.json();
        const userProfiles: UserProfile[] = usersData.map((user: any) => ({
          uid: user.id,
          email: user.email,
          displayName: user.name,
          role: user.role,
        }));
        setUsers(userProfiles);
        setClients(clientsResult);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingUsers(false);
        setLoadingClients(false);
      }
    };
    if (isOpen) loadData();
  }, [isOpen]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMappings(initialMappings);
      setSelectedUserId('');
      setPendingClientIds([]);
      setClientSearch('');
      setComplianceFilter('all');
      lastSelectedIndexRef.current = null;
    }
  }, [isOpen, initialMappings]);

  // Reset pending selection when user changes
  useEffect(() => {
    setPendingClientIds([]);
    setClientSearch('');
    setComplianceFilter('all');
    lastSelectedIndexRef.current = null;
  }, [selectedUserId]);

  // Get already-assigned client IDs for the selected user
  const getAssignedClientIds = () => {
    return mappings.find(m => m.userId === selectedUserId)?.clientIds || [];
  };

  // Find which user a client is assigned to (across ALL mappings)
  const getClientMapping = (clientId: string) => {
    return mappings.find(m => m.clientIds.includes(clientId));
  };

  // Get filtered clients (show ALL clients, mark assigned ones)
  const getFilteredClients = () => {
    return clients.filter(client => {
      if (clientSearch && !client.clientName.toLowerCase().includes(clientSearch.toLowerCase())) return false;
      if (complianceFilter !== 'all') {
        const key = complianceFilter as ComplianceKey;
        if (!client.compliance?.[key]) return false;
      }
      return true;
    });
  };

  const filteredClients = getFilteredClients();

  // Handle checkbox click with Ctrl+click range select support
  const handleClientCheckbox = (clientId: string, index: number, ctrlKey: boolean) => {
    // Skip if already assigned to the selected user
    const assignedIds = getAssignedClientIds();
    if (assignedIds.includes(clientId)) return;

    if (ctrlKey && lastSelectedIndexRef.current !== null) {
      // Range select between last selected and current
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const rangeIds = filteredClients.slice(start, end + 1).map(c => c.id!);
      setPendingClientIds(prev => {
        const merged = Array.from(new Set([...prev, ...rangeIds]));
        return merged;
      });
    } else {
      setPendingClientIds(prev =>
        prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
      );
      lastSelectedIndexRef.current = index;
    }
  };

  // Select all currently filtered clients (skip already-assigned to selected user)
  const handleSelectAllFiltered = () => {
    const assignedIds = getAssignedClientIds();
    const ids = filteredClients.filter(c => !assignedIds.includes(c.id!)).map(c => c.id!);
    setPendingClientIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  // Deselect all pending
  const handleDeselectAll = () => {
    setPendingClientIds([]);
    lastSelectedIndexRef.current = null;
  };

  // Add pending clients to the mapping
  const handleAddSelected = () => {
    if (!selectedUserId || pendingClientIds.length === 0) return;
    const user = users.find(u => u.uid === selectedUserId);
    if (!user) return;

    // Filter out any clients already assigned to this user (safety)
    const assignedIds = getAssignedClientIds();
    const newClientIds = pendingClientIds.filter(id => !assignedIds.includes(id));
    if (newClientIds.length === 0) return;

    const existingMapping = mappings.find(m => m.userId === selectedUserId);
    if (existingMapping) {
      setMappings(mappings.map(m =>
        m.userId === selectedUserId
          ? { ...m, clientIds: Array.from(new Set([...m.clientIds, ...newClientIds])) }
          : m
      ));
    } else {
      setMappings([
        ...mappings,
        { userId: selectedUserId, userName: user.displayName || user.email, clientIds: newClientIds },
      ]);
    }
    setPendingClientIds([]);
    lastSelectedIndexRef.current = null;
  };

  const handleRemoveClient = (userId: string, clientId: string) => {
    setMappings(mappings.map(m => {
      if (m.userId === userId) {
        const newClientIds = m.clientIds.filter(id => id !== clientId);
        return { ...m, clientIds: newClientIds };
      }
      return m;
    }).filter(m => m.clientIds.length > 0));
  };

  const handleRemoveUser = (userId: string) => {
    setMappings(mappings.filter(m => m.userId !== userId));
  };

  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.clientName || 'Unknown Client';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Wide landscape dialog: w-[95vw] on desktop, capped at 1100px */}
      <DialogContent className="w-[95vw] max-w-[1100px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Team Member Mapping</DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Assign specific clients to team members. Each member will only see tasks for their assigned clients.
          </p>
        </div>

        {/* Two-column landscape body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Selection controls */}
          <div className="md:w-[45%] flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-5 space-y-4">
            {/* Team Member Selection */}
            <div>
              <Label htmlFor="user-select" className="flex items-center gap-2 mb-2">
                <UserIcon className="w-4 h-4" />
                Select Team Member
              </Label>
              <Select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
                className="w-full"
              >
                <option value="">Choose a team member...</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName || user.email} ({user.role})
                  </option>
                ))}
              </Select>
              {loadingUsers && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Loading users...</p>
              )}
            </div>

            {/* Client Multi-Select */}
            {selectedUserId ? (
              <div className="flex flex-col flex-1 min-h-0">
                <Label className="flex items-center gap-2 mb-2">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  Select Clients
                  {pendingClientIds.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {pendingClientIds.length} selected
                    </span>
                  )}
                </Label>

                {/* Filters Row */}
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-8 pr-3 h-9 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <select
                    value={complianceFilter}
                    onChange={(e) => setComplianceFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {COMPLIANCE_FILTERS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk action row */}
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} shown
                    {(() => {
                      const assignedCount = filteredClients.filter(c => getClientMapping(c.id!)).length;
                      const unassignedCount = filteredClients.length - assignedCount;
                      if (assignedCount > 0) {
                        return ` (${assignedCount} assigned, ${unassignedCount} unassigned)`;
                      }
                      return ` (all unassigned)`;
                    })()}
                    {(clientSearch || complianceFilter !== 'all') && ' (filtered)'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      disabled={filteredClients.length === 0}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    {pendingClientIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Deselect All
                      </button>
                    )}
                  </div>
                </div>

                {/* Client List */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-y-auto flex-1 min-h-[200px] max-h-[340px] bg-white dark:bg-gray-dark">
                  {loadingClients ? (
                    <div className="flex items-center justify-center h-20 text-sm text-gray-500">Loading clients...</div>
                  ) : filteredClients.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-sm text-gray-500">No clients match the filter</div>
                  ) : (
                    filteredClients.map((client, index) => {
                      const isChecked = pendingClientIds.includes(client.id!);
                      const assignedMapping = getClientMapping(client.id!);
                      const isAssignedToSelectedUser = assignedMapping?.userId === selectedUserId;
                      const isAssignedToOther = assignedMapping && assignedMapping.userId !== selectedUserId;

                      return (
                        <label
                          key={client.id}
                          className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                            isAssignedToSelectedUser
                              ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                              : isAssignedToOther
                              ? 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                              : isChecked
                              ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-gray-700'
                              : 'hover:bg-blue-50 dark:hover:bg-gray-700'
                          }`}
                          title={
                            isAssignedToSelectedUser
                              ? 'Already assigned to this member'
                              : isAssignedToOther
                              ? `Already assigned to ${assignedMapping.userName}`
                              : 'Hold Ctrl and click to range-select'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || isAssignedToSelectedUser}
                            disabled={isAssignedToSelectedUser}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAssignedToSelectedUser) {
                                handleClientCheckbox(client.id!, index, e.ctrlKey || e.metaKey);
                              }
                            }}
                            className={`w-4 h-4 rounded border-gray-300 focus:ring-blue-500 ${
                              isAssignedToSelectedUser
                                ? 'text-red-600 border-red-400 cursor-not-allowed opacity-60'
                                : 'text-blue-600 cursor-pointer'
                            }`}
                          />
                          <span className={`text-sm flex-1 truncate ${
                            isAssignedToSelectedUser
                              ? 'text-red-700 dark:text-red-400 font-medium'
                              : isAssignedToOther
                              ? 'text-orange-700 dark:text-orange-400'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {client.clientName}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isAssignedToSelectedUser && (
                              <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded px-1.5 py-0.5 font-medium">
                                Assigned
                              </span>
                            )}
                            {isAssignedToOther && (
                              <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded px-1.5 py-0.5 font-medium" title={`Assigned to ${assignedMapping.userName}`}>
                                Assigned: {assignedMapping.userName.split(' ')[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {client.compliance?.gstr1 && <span className="text-[10px] bg-green-100 text-green-700 rounded px-1">G1</span>}
                            {client.compliance?.itr && <span className="text-[10px] bg-purple-100 text-purple-700 rounded px-1">ITR</span>}
                            {client.compliance?.tds && <span className="text-[10px] bg-yellow-100 text-yellow-700 rounded px-1">TDS</span>}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Add Button */}
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={pendingClientIds.length === 0}
                    className="text-white"
                    size="sm"
                  >
                    Add {pendingClientIds.length > 0 ? `${pendingClientIds.length} ` : ''}Client{pendingClientIds.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg py-10">
                Select a team member to assign clients
              </div>
            )}
          </div>

          {/* RIGHT — Current mappings */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5">
            <Label className="mb-3 block flex-shrink-0">
              Current Mappings
              <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                {mappings.length} member{mappings.length !== 1 ? 's' : ''}
              </span>
            </Label>

            <div className="flex-1 overflow-y-auto">
              {mappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg py-12">
                  <UserIcon className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">No mappings yet</p>
                  <p className="text-xs mt-1">Assign clients to a team member to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.userId}
                      className="p-3 bg-white dark:bg-gray-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight">{mapping.userName}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {mapping.clientIds.length} client{mapping.clientIds.length !== 1 ? 's' : ''} assigned
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(mapping.userId)}
                          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                          title="Remove all mappings for this member"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {mapping.clientIds.map((clientId) => (
                          <div
                            key={clientId}
                            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1"
                          >
                            <span className="text-xs text-gray-800 dark:text-gray-200 leading-none">{getClientName(clientId)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveClient(mapping.userId, clientId)}
                              className="text-red-400 hover:text-red-600 ml-0.5"
                              aria-label={`Remove ${getClientName(clientId)}`}
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="text-white">
            Save Mappings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
