'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserGroupIcon, ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { authenticatedFetch } from '@/lib/api-client';

interface DelegateUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ClientInfo {
  id: string;
  name: string;
}

interface DelegateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
  assignedClientIds: string[];
  assignedClients?: ClientInfo[];
  teamMemberMappings?: Array<{
    userId: string;
    userName: string;
    clientIds: string[];
  }>;
  onDelegated?: () => void;
}

export function DelegateTaskModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentUserId,
  currentUserName,
  currentUserRole,
  assignedClientIds,
  assignedClients,
  onDelegated,
}: DelegateTaskModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<DelegateUser[]>([]);
  const [clientList, setClientList] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Load available users for delegation
  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        let users: DelegateUser[] = [];
        if (currentUserRole === 'manager') {
          const response = await authenticatedFetch('/api/manager-hierarchy/my-employees');
          if (response.ok) {
            const employees: DelegateUser[] = await response.json();
            users = employees.filter(e => e.id !== currentUserId);
          }
        } else {
          const response = await authenticatedFetch('/api/recurring-tasks/delegate/available-users');
          if (response.ok) {
            const data: DelegateUser[] = await response.json();
            users = data.filter(u => u.id !== currentUserId);
          }
        }
        setAvailableUsers(users);
      } catch (error) {
        console.error('Error loading users for delegation:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, currentUserRole, currentUserId]);

  // Load client names
  useEffect(() => {
    if (!isOpen) return;

    if (assignedClients && assignedClients.length > 0) {
      setClientList(assignedClients);
      setSelectedClientIds(assignedClients.map(c => c.id));
      return;
    }

    if (assignedClientIds.length === 0) {
      setClientList([]);
      setSelectedClientIds([]);
      return;
    }

    const fetchClientNames = async () => {
      try {
        const response = await authenticatedFetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          const allClients: Array<{ id?: string; clientName?: string }> = data.data || data;
          const filtered: ClientInfo[] = allClients
            .filter(c => c.id && assignedClientIds.includes(c.id))
            .map(c => ({ id: c.id!, name: c.clientName || c.id! }));
          setClientList(filtered);
          setSelectedClientIds(filtered.map(c => c.id));
        }
      } catch {
        const fallback = assignedClientIds.map(id => ({ id, name: id }));
        setClientList(fallback);
        setSelectedClientIds(assignedClientIds);
      }
    };

    fetchClientNames();
  }, [isOpen, assignedClientIds, assignedClients]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setSelectedClientIds([]);
      setUserSearch('');
      setClientSearch('');
    }
  }, [isOpen]);

  const filteredUsers = userSearch.trim()
    ? availableUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : availableUsers;

  const filteredClients = clientSearch.trim()
    ? clientList.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clientList;

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const toggleAllClients = () => {
    if (selectedClientIds.length === clientList.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clientList.map(c => c.id));
    }
  };

  const handleDelegate = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to delegate to');
      return;
    }
    if (selectedClientIds.length === 0) {
      toast.error('Please select at least one client to delegate');
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        selectedUsers.map(userId => {
          const user = availableUsers.find(u => u.id === userId);
          return authenticatedFetch('/api/recurring-tasks/delegate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId,
              delegateToUserId: userId,
              delegateToUserName: user?.name || '',
              delegatedByUserId: currentUserId,
              delegatedByUserName: currentUserName,
              clientIds: selectedClientIds,
            }),
          });
        })
      );

      const succeeded = results.filter(
        r => r.status === 'fulfilled' && (r.value as Response).ok
      ).length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        toast.success(
          `Task delegated to ${succeeded} user${succeeded > 1 ? 's' : ''} successfully!`
        );
        onDelegated?.();
        onClose();
      }
      if (failed > 0) {
        toast.error(`Failed to delegate to ${failed} user${failed > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error delegating task:', error);
      toast.error('Failed to delegate task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightIcon className="w-5 h-5 text-orange-600" />
            Delegate Task
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Delegate &quot;{taskTitle}&quot; to another team member
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Assignment Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Currently assigned to:</strong> {currentUserName}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {assignedClientIds.length} client{assignedClientIds.length !== 1 ? 's' : ''} assigned
            </p>
          </div>

          {/* Users + Clients side-by-side on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Select Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-medium">
                Delegate To <span className="text-red-500">*</span>
              </Label>
              {selectedUsers.length > 0 && (
                <span className="text-xs text-orange-600 font-medium">
                  {selectedUsers.length} selected
                </span>
              )}
            </div>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading available users...
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p>No users available for delegation</p>
                <p className="text-xs mt-1">
                  {currentUserRole === 'manager'
                    ? 'No employees assigned under you in the manager hierarchy'
                    : 'No admins or managers available'}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="sticky top-0 z-10 bg-card border-b border-border px-3 py-2 flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full text-xs bg-transparent outline-none text-muted-foreground placeholder-gray-400"
                  />
                </div>
                <div className="divide-y divide-border max-h-[200px] overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">No users match your search</p>
                  ) : (
                    filteredUsers.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 accent-orange-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.role} · {user.email}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {currentUserRole === 'manager'
                ? 'Select one or more employees assigned under you'
                : 'Select one or more admins or managers'}
            </p>
          </div>

          {/* Select Clients */}
          {clientList.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">
                  Clients to Delegate <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={toggleAllClients}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {selectedClientIds.length === clientList.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="sticky top-0 z-10 bg-card border-b border-border px-3 py-2 flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full text-xs bg-transparent outline-none text-muted-foreground placeholder-gray-400"
                  />
                </div>
                <div className="divide-y divide-border max-h-[200px] overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">No clients match your search</p>
                  ) : (
                    filteredClients.map(client => (
                      <label
                        key={client.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClientIds.includes(client.id)}
                          onChange={() => toggleClient(client.id)}
                          className="w-4 h-4 accent-orange-500 flex-shrink-0"
                        />
                        <span className="text-sm text-foreground">
                          {client.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedClientIds.length} of {clientList.length} client
                {clientList.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          ) : (
            <div />
          )}

          </div>{/* end grid */}

          {/* Info Note */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> The delegated user
              {selectedUsers.length > 1 ? 's' : ''} will see this task on their dashboard with
              the assigned clients. They can plan or further delegate the task.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelegate}
            disabled={selectedUsers.length === 0 || selectedClientIds.length === 0 || saving || loading}
            loading={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving
              ? 'Delegating...'
              : `Delegate to ${selectedUsers.length > 0 ? selectedUsers.length + ' ' : ''}User${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
