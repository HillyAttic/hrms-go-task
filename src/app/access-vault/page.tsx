'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CredentialModal from '@/components/password-manager/CredentialModal';
import BulkImportModal from '@/components/password-manager/BulkImportModal';
import type { CredentialCategory, SafeCredential } from '@/types/password-manager.types';

type Tab = CredentialCategory;

const TABS: { value: Tab; label: string }[] = [
  { value: 'gst', label: 'GST' },
  { value: 'income-tax', label: 'Income Tax' },
  { value: 'mca', label: 'MCA' },
];

const COLUMNS: Record<Tab, string[]> = {
  gst: ['S.No', 'Client Name', 'GST Number', 'Username', 'Password', 'Actions'],
  'income-tax': ['Client Name', 'Date of Birth', 'PAN No', 'Username', 'Password', 'Actions'],
  mca: ['S.No', 'Client Name', 'Membership/DIN No', 'Username', 'Password', 'Actions'],
};

const SEARCH_PLACEHOLDER: Record<Tab, string> = {
  gst: 'Search by Client Name or GST Number...',
  'income-tax': 'Search by Client Name or PAN No...',
  mca: 'Search by Client Name or Membership/DIN No...',
};

function matchesSearch(record: SafeCredential, tab: Tab, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = (record.clientName ?? '').toLowerCase();
  if (tab === 'gst') return name.includes(q) || (record.gstNumber ?? '').toLowerCase().includes(q);
  if (tab === 'income-tax') return name.includes(q) || (record.panNumber ?? '').toLowerCase().includes(q);
  return name.includes(q) || (record.membershipDin ?? '').toLowerCase().includes(q);
}

export default function AccessVaultPage() {
  const [activeTab, setActiveTab] = useState<Tab>('gst');
  const [records, setRecords] = useState<SafeCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Reveal password
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealedData, setRevealedData] = useState<{ password: string; label: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // CRUD modals
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SafeCredential | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/password-manager/vault?category=${activeTab}`);
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

  useEffect(() => {
    fetchRecords();
    setSearch('');
  }, [fetchRecords]);

  // Client-side filtered records
  const filteredRecords = useMemo(
    () => records.filter((r) => matchesSearch(r, activeTab, search)),
    [records, activeTab, search]
  );

  // ── Reveal ──────────────────────────────────────────────────

  const handleReveal = async (record: SafeCredential) => {
    setRevealingId(record.id);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/password-manager/vault/${record.id}/reveal`);
      if (response.ok) {
        const { password } = await response.json();
        const label = [record.clientName, record.gstNumber || record.panNumber || record.membershipDin]
          .filter(Boolean)
          .join(' - ');
        setRevealedData({ password, label });
      } else {
        toast.error('Failed to reveal password');
      }
    } catch {
      toast.error('Failed to reveal password');
    } finally {
      setRevealingId(null);
    }
  };

  const handleCopy = async () => {
    if (!revealedData) return;
    try {
      await navigator.clipboard.writeText(revealedData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // ── CRUD ────────────────────────────────────────────────────

  const handleCredentialSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const payload: Record<string, unknown> = { ...data, category: activeTab };
      if (editingRecord && !payload.plainPassword) delete payload.plainPassword;

      const url = editingRecord
        ? `/api/password-manager/vault/${editingRecord.id}`
        : '/api/password-manager/vault';
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) return;
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/password-manager/vault/${id}`, { method: 'DELETE' });
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

  const columns = COLUMNS[activeTab];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Access Vault</h1>
        <p className="text-muted-foreground mt-1">
          Manage credentials for categories you have been granted access to
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search box */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER[activeTab]}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Record count */}
        <span className="hidden sm:flex items-center text-sm text-muted-foreground shrink-0">
          {loading ? 'Loading...' : search ? `${filteredRecords.length} of ${records.length}` : `${records.length} record${records.length !== 1 ? 's' : ''}`}
        </span>

        {/* Buttons */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted/50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Bulk Import
          </button>
          <button
            onClick={() => { setEditingRecord(null); setShowCredentialModal(true); }}
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
      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <svg className="mx-auto h-10 w-10 text-muted-foreground dark:text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {search ? (
              <p>
                No results for &ldquo;<strong>{search}</strong>&rdquo;.{' '}
                <button onClick={() => setSearch('')} className="text-blue-500 hover:underline">Clear search</button>
              </p>
            ) : (
              <p>No credentials available. Contact your admin to request access, or add a new record.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/50">
                    {/* S.No — GST & MCA */}
                    {(activeTab === 'gst' || activeTab === 'mca') && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {record.serialNumber || '-'}
                      </td>
                    )}

                    {/* Client Name */}
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      <Highlight text={record.clientName} query={search} />
                    </td>

                    {/* Category-specific fields */}
                    {activeTab === 'gst' && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Highlight text={record.gstNumber || '-'} query={search} />
                      </td>
                    )}
                    {activeTab === 'income-tax' && (
                      <>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {record.dateOfBirth || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <Highlight text={record.panNumber || '-'} query={search} />
                        </td>
                      </>
                    )}
                    {activeTab === 'mca' && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <Highlight text={record.membershipDin || '-'} query={search} />
                      </td>
                    )}

                    {/* Username */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {record.username}
                    </td>

                    {/* Reveal */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReveal(record)}
                        disabled={revealingId === record.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                      >
                        {revealingId === record.id ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-border border-t-transparent rounded-full animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Reveal
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingRecord(record); setShowCredentialModal(true); }}
                          className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
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

      {/* Reveal Password Modal */}
      <Dialog open={!!revealedData} onOpenChange={() => { setRevealedData(null); setCopied(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Password</DialogTitle>
            {revealedData && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{revealedData.label}</p>
            )}
          </DialogHeader>
          {revealedData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <code className="flex-1 font-mono text-sm text-foreground break-all">
                  {revealedData.password}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-gray-600 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Close this dialog to clear the password from view.
              </p>
              <button
                onClick={() => { setRevealedData(null); setCopied(false); }}
                className="w-full px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:bg-muted dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Modal */}
      <CredentialModal
        isOpen={showCredentialModal}
        onClose={() => { setShowCredentialModal(false); setEditingRecord(null); }}
        onSubmit={handleCredentialSubmit}
        credential={editingRecord}
        category={activeTab}
        isLoading={saving}
      />

      {/* Bulk Import — uses vault endpoint that checks category access */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        category={activeTab}
        onImportComplete={fetchRecords}
        importEndpoint="/api/password-manager/vault/bulk-import"
      />
    </div>
  );
}

// Highlights matching substring in yellow
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text || text === '-') return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
