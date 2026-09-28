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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Manage Access</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {credentialLabel}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{grantedCount} user{grantedCount !== 1 ? 's' : ''} have access</span>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
            />

            <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.uid}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={user.hasAccess}
                      onChange={() => toggleUser(user.uid)}
                      className="h-4 w-4 rounded border-border text-ring focus:ring-ring"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.displayName}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    {user.hasAccess && (
                      <span className="text-xs text-success font-medium">
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
            className="px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:bg-muted"
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
