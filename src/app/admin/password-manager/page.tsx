'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import CredentialModal from '@/components/password-manager/CredentialModal';
import BulkImportModal from '@/components/password-manager/BulkImportModal';
import type { CredentialCategory, SafeCredential } from '@/types/password-manager.types';

type CredentialTab = CredentialCategory;
type PageTab = CredentialTab | 'access-control';

const CREDENTIAL_TABS: { value: CredentialTab; label: string }[] = [
  { value: 'gst', label: 'GST' },
  { value: 'income-tax', label: 'Income Tax' },
  { value: 'mca', label: 'MCA' },
];

const ALL_TABS: { value: PageTab; label: string }[] = [
  ...CREDENTIAL_TABS,
  { value: 'access-control', label: 'Access Control' },
];

const GST_COLUMNS = ['S.No', 'Client Name', 'GST Number', 'Username', 'Actions'];
const INCOME_TAX_COLUMNS = ['Client Name', 'Date of Birth', 'PAN No', 'Username', 'Actions'];
const MCA_COLUMNS = ['S.No', 'Client Name', 'Membership/DIN No', 'Username', 'Actions'];

function getColumns(category: CredentialCategory): string[] {
  if (category === 'gst') return GST_COLUMNS;
  if (category === 'income-tax') return INCOME_TAX_COLUMNS;
  return MCA_COLUMNS;
}

interface UserAccess {
  uid: string;
  displayName: string;
  email: string;
  categories: string[];
}

export default function PasswordManagerPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('gst');
  const [records, setRecords] = useState<SafeCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SafeCredential | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Access Control state
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [savingAccess, setSavingAccess] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (activeTab === 'access-control') return;
    setLoading(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(
        `/api/password-manager/credentials?category=${activeTab}`
      );
      if (response.ok) {
        const data = await response.json();
        setRecords(data.data);
      } else {
        toast.error('Failed to load credentials');
      }
    } catch {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchUsers = useCallback(async () => {
    setAccessLoading(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/password-manager/access');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error('Failed to load users');
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setAccessLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'access-control') {
      fetchUsers();
    } else {
      fetchRecords();
    }
  }, [activeTab, fetchRecords, fetchUsers]);

  // ── Access control helpers ──────────────────────────────────

  const CATEGORIES: CredentialCategory[] = ['gst', 'income-tax', 'mca'];

  const toggleUserCategory = async (uid: string, category: CredentialCategory) => {
    const user = users.find((u) => u.uid === uid);
    if (!user) return;

    const has = user.categories.includes(category);
    const newCategories = has
      ? user.categories.filter((c) => c !== category)
      : [...user.categories, category];

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, categories: newCategories } : u))
    );

    setSavingAccess(uid);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/password-manager/access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, categories: newCategories }),
      });
      if (!response.ok) {
        // Revert on failure
        setUsers((prev) =>
          prev.map((u) => (u.uid === uid ? { ...u, categories: user.categories } : u))
        );
        toast.error('Failed to update access');
      }
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, categories: user.categories } : u))
      );
      toast.error('Failed to update access');
    } finally {
      setSavingAccess(null);
    }
  };

  // ── Credential CRUD ─────────────────────────────────────────

  const handleCredentialSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const payload: Record<string, unknown> = { ...data, category: activeTab as CredentialTab };
      if (editingRecord && !payload.plainPassword) delete payload.plainPassword;

      const url = editingRecord
        ? `/api/password-manager/credentials/${editingRecord.id}`
        : '/api/password-manager/credentials';
      const method = editingRecord ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingRecord ? 'Credential updated' : 'Credential created');
        setShowCredentialModal(false);
        setEditingRecord(null);
        fetchRecords();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to save credential');
      }
    } catch {
      toast.error('Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) return;
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/password-manager/credentials/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Credential deleted');
        fetchRecords();
      } else {
        toast.error('Failed to delete credential');
      }
    } catch {
      toast.error('Failed to delete credential');
    }
  };

  const isCredentialTab = activeTab !== 'access-control';
  const columns = isCredentialTab ? getColumns(activeTab as CredentialCategory) : [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Manager</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage portal credentials and control user access
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {ALL_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.value
                ? tab.value === 'access-control'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Access Control Tab ─────────────────────────────── */}
      {activeTab === 'access-control' && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Grant users access to credential categories. Users with access can view and manage all
              records in that category from their Access Vault.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            {accessLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        User
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        GST
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Income Tax
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        MCA
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.displayName}
                          </p>
                          {user.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          )}
                        </td>
                        {CATEGORIES.map((cat) => (
                          <td key={cat} className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleUserCategory(user.uid, cat)}
                              disabled={savingAccess === user.uid}
                              className={`w-10 h-6 rounded-full transition-colors relative ${
                                user.categories.includes(cat)
                                  ? 'bg-green-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              } disabled:opacity-60`}
                              title={
                                user.categories.includes(cat)
                                  ? `Revoke ${cat} access`
                                  : `Grant ${cat} access`
                              }
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  user.categories.includes(cat) ? 'translate-x-4' : ''
                                }`}
                              />
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Credential Tabs (GST / Income Tax / MCA) ──────── */}
      {isCredentialTab && (
        <>
          {/* Action Bar */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? 'Loading...' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkImport(true)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Bulk Import CSV
              </button>
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setShowCredentialModal(true);
                }}
                className="px-3 py-2 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Record
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : records.length === 0 ? (
              <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                <svg
                  className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <p>No credentials found. Add records or bulk import a CSV.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {(activeTab === 'gst' || activeTab === 'mca') && (
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {record.serialNumber || '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {record.clientName}
                        </td>
                        {activeTab === 'gst' && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {record.gstNumber || '-'}
                          </td>
                        )}
                        {activeTab === 'income-tax' && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {record.dateOfBirth || '-'}
                          </td>
                        )}
                        {activeTab === 'income-tax' && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {record.panNumber || '-'}
                          </td>
                        )}
                        {activeTab === 'mca' && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {record.membershipDin || '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {record.username}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingRecord(record);
                                setShowCredentialModal(true);
                              }}
                              className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {isCredentialTab && (
        <>
          <CredentialModal
            isOpen={showCredentialModal}
            onClose={() => {
              setShowCredentialModal(false);
              setEditingRecord(null);
            }}
            onSubmit={handleCredentialSubmit}
            credential={editingRecord}
            category={activeTab as CredentialTab}
            isLoading={saving}
          />
          <BulkImportModal
            isOpen={showBulkImport}
            onClose={() => setShowBulkImport(false)}
            category={activeTab as CredentialTab}
            onImportComplete={fetchRecords}
          />
        </>
      )}
    </div>
  );
}
