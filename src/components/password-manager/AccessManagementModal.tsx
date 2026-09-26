'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { UserAccessInfo } from '@/types/password-manager.types';

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialId: string;
  credentialLabel: string;
}

export default function AccessManagementModal({
  isOpen,
  onClose,
  credentialId,
  credentialLabel,
}: AccessManagementModalProps) {
  const [users, setUsers] = useState<UserAccessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen && credentialId) {
      fetchUsers();
    }
  }, [isOpen, credentialId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(
        `/api/password-manager/credentials/${credentialId}/access`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error('Failed to load users');
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (uid: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, hasAccess: !u.hasAccess } : u))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const allowedUserIds = users.filter((u) => u.hasAccess).map((u) => u.uid);
      const response = await authenticatedFetch(
        `/api/password-manager/credentials/${credentialId}/access`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allowedUserIds }),
        }
      );
      if (response.ok) {
        toast.success('Access updated successfully');
        onClose();
      } else {
        toast.error('Failed to update access');
      }
    } catch {
      toast.error('Failed to update access');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const grantedCount = users.filter((u) => u.hasAccess).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Manage Access</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {credentialLabel}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{grantedCount} user{grantedCount !== 1 ? 's' : ''} have access</span>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No users found
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.uid}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={user.hasAccess}
                      onChange={() => toggleUser(user.uid)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-ring"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.displayName}
                      </p>
                      {user.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    {user.hasAccess && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Access
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Access'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
