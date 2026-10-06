'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { Client } from '@/services/client.service';

interface UserInfo {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

interface ClientAccessDoc {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  allowedClientIds: string[];
}

export default function ClientAccessPage() {
  return (
    <Suspense fallback={null}>
      <ClientAccessPageContent />
    </Suspense>
  );
}

function ClientAccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accessDocs, setAccessDocs] = useState<ClientAccessDoc[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(searchParams.get('user'));
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [complianceFilter, setComplianceFilter] = useState<string>(searchParams.get('compliance') ?? 'all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Keep the selected user and filters in the URL so the view is shareable
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeUserId) params.set('user', activeUserId);
    if (searchQuery) params.set('q', searchQuery);
    if (complianceFilter !== 'all') params.set('compliance', complianceFilter);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeUserId, searchQuery, complianceFilter, pathname, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');

      const [usersRes, clientsRes, accessRes] = await Promise.all([
        authenticatedFetch('/api/admin/users'),
        authenticatedFetch('/api/clients'),
        authenticatedFetch('/api/client-access'),
      ]);

      if (usersRes.ok) {
        const allUsers = await usersRes.json();
        const nonAdminUsers = allUsers
          .filter((u: any) => u.role !== 'admin')
          .map((u: any) => ({
            uid: u.uid,
            displayName: u.displayName || u.email,
            email: u.email,
            role: u.role,
          }));
        setUsers(nonAdminUsers);
        if (nonAdminUsers.length > 0 && !activeUserId) {
          setActiveUserId(nonAdminUsers[0].uid);
        }
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.data || []);
      }

      if (accessRes.ok) {
        const data = await accessRes.json();
        setAccessDocs(data.data || []);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    fetchData();
  }, []);

  // Get allowed client IDs for active user
  const activeAccessDoc = useMemo(
    () => accessDocs.find((d) => d.userId === activeUserId),
    [accessDocs, activeUserId]
  );

  const allowedClientIds = useMemo(
    () => new Set(activeAccessDoc?.allowedClientIds || []),
    [activeAccessDoc]
  );

  // Filter clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Compliance filter
    if (complianceFilter !== 'all') {
      result = result.filter((client) => {
        const comp = client.compliance;
        if (!comp) return false;
        return !!(comp as any)[complianceFilter];
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (client) =>
          client.clientName?.toLowerCase().includes(q) ||
          client.businessName?.toLowerCase().includes(q) ||
          client.taxIdentifiers?.gstin?.toLowerCase().includes(q) ||
          client.taxIdentifiers?.pan?.toLowerCase().includes(q) ||
          client.taxIdentifiers?.tan?.toLowerCase().includes(q)
      );
    }

    // Sort by client number
    result.sort((a, b) => (a.clientNumber || '').localeCompare(b.clientNumber || ''));

    return result;
  }, [clients, complianceFilter, searchQuery]);

  const assignedCount = useMemo(
    () => clients.filter((c) => c.id && allowedClientIds.has(c.id)).length,
    [clients, allowedClientIds]
  );

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  // Toggle a single client
  const toggleClient = async (clientId: string) => {
    if (!activeUserId) return;

    const user = users.find((u) => u.uid === activeUserId);
    if (!user) return;

    const currentIds = [...(activeAccessDoc?.allowedClientIds || [])];
    const has = currentIds.includes(clientId);
    const newIds = has ? currentIds.filter((id) => id !== clientId) : [...currentIds, clientId];

    // Optimistic update
    setAccessDocs((prev) => {
      const existing = prev.find((d) => d.userId === activeUserId);
      if (existing) {
        return prev.map((d) =>
          d.userId === activeUserId ? { ...d, allowedClientIds: newIds } : d
        );
      }
      return [
        ...prev,
        {
          id: 'temp',
          userId: activeUserId,
          userName: user.displayName,
          userEmail: user.email,
          allowedClientIds: newIds,
        },
      ];
    });

    setSavingUser(activeUserId);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/client-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userName: user.displayName,
          userEmail: user.email,
          allowedClientIds: newIds,
        }),
      });
      if (!response.ok) {
        // Revert
        setAccessDocs((prev) =>
          prev.map((d) =>
            d.userId === activeUserId ? { ...d, allowedClientIds: currentIds } : d
          )
        );
        toast.error('Failed to update access');
      }
    } catch {
      setAccessDocs((prev) =>
        prev.map((d) =>
          d.userId === activeUserId ? { ...d, allowedClientIds: currentIds } : d
        )
      );
      toast.error('Failed to update access');
    } finally {
      setSavingUser(null);
    }
  };

  // Select all filtered clients
  const handleSelectAll = async () => {
    if (!activeUserId) return;
    const user = users.find((u) => u.uid === activeUserId);
    if (!user) return;

    const currentIds = [...(activeAccessDoc?.allowedClientIds || [])];
    const filteredIds = filteredClients.map((c) => c.id!).filter(Boolean);
    const merged = [...new Set([...currentIds, ...filteredIds])];

    setAccessDocs((prev) => {
      const existing = prev.find((d) => d.userId === activeUserId);
      if (existing) {
        return prev.map((d) =>
          d.userId === activeUserId ? { ...d, allowedClientIds: merged } : d
        );
      }
      return [
        ...prev,
        {
          id: 'temp',
          userId: activeUserId,
          userName: user.displayName,
          userEmail: user.email,
          allowedClientIds: merged,
        },
      ];
    });

    setSavingUser(activeUserId);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/client-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userName: user.displayName,
          userEmail: user.email,
          allowedClientIds: merged,
        }),
      });
      if (!response.ok) {
        setAccessDocs((prev) =>
          prev.map((d) =>
            d.userId === activeUserId ? { ...d, allowedClientIds: currentIds } : d
          )
        );
        toast.error('Failed to update access');
      } else {
        toast.success(`${filteredIds.length} clients selected`);
      }
    } catch {
      setAccessDocs((prev) =>
        prev.map((d) =>
          d.userId === activeUserId ? { ...d, allowedClientIds: currentIds } : d
        )
      );
      toast.error('Failed to update access');
    } finally {
      setSavingUser(null);
    }
  };

  // Deselect all filtered clients
  const handleDeselectAll = async () => {
    if (!activeUserId) return;
    const user = users.find((u) => u.uid === activeUserId);
    if (!user) return;

    const currentIds = [...(activeAccessDoc?.allowedClientIds || [])];
    const filteredIdSet = new Set(filteredClients.map((c) => c.id!).filter(Boolean));
    const remaining = currentIds.filter((id) => !filteredIdSet.has(id));

    setAccessDocs((prev) =>
      prev.map((d) =>
        d.userId === activeUserId ? { ...d, allowedClientIds: remaining } : d
      )
    );

    setSavingUser(activeUserId);
    try {
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch('/api/client-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userName: user.displayName,
          userEmail: user.email,
          allowedClientIds: remaining,
        }),
      });
      if (!response.ok) {
        setAccessDocs((prev) =>
          prev.map((d) =>
            d.userId === activeUserId ? { ...d, allowedClientIds: currentIds } : d
          )
        );
        toast.error('Failed to update access');
      } else {
        toast.success('Clients deselected');
      }
    } catch {
      setAccessDocs((prev) =>
        prev.map((d) =>
          d.userId === activeUserId ? { ...d, allowedClientIds: currentIds } : d
        )
      );
      toast.error('Failed to update access');
    } finally {
      setSavingUser(null);
    }
  };

  const getTaxId = (client: Client) => {
    if (client.taxIdentifiers?.gstin) return `GSTIN: ${client.taxIdentifiers.gstin}`;
    if (client.taxIdentifiers?.pan) return `PAN: ${client.taxIdentifiers.pan}`;
    if (client.taxIdentifiers?.tan) return `TAN: ${client.taxIdentifiers.tan}`;
    return '-';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Access</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Control which clients each user can see
        </p>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading…" className="p-8 text-center">
          <div aria-hidden="true" className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">
          No users found.
        </div>
      ) : (
        <>
          {/* User Search and Selection */}
          <div className="mb-6">
            {/* Mobile Dropdown - visible only on small screens */}
            <div className="block md:hidden mb-4">
              <label htmlFor="active-user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select User
              </label>
              <select
                id="active-user-select"
                name="activeUser"
                value={activeUserId || ''}
                onChange={(e) => {
                  setActiveUserId(e.target.value);
                  setSearchQuery('');
                  setComplianceFilter('all');
                }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Choose a user…</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop View - hidden on mobile */}
            <div className="hidden md:block">
              <div className="mb-4">
                <input
                  type="text"
                  name="userSearch"
                  placeholder="Search users by name, email, or role…"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  autoComplete="off"
                  aria-label="Search users by name, email, or role"
                  className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* User Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredUsers.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => {
                      setActiveUserId(user.uid);
                      setSearchQuery('');
                      setComplianceFilter('all');
                    }}
                    aria-pressed={activeUserId === user.uid}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      activeUserId === user.uid
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            activeUserId === user.uid
                              ? 'text-purple-700 dark:text-purple-300'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          user.role === 'manager'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No users found matching “{userSearchQuery}”
                </div>
              )}
            </div>
          </div>

          {/* User Panel */}
          {activeUserId && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Toggle clients to grant or revoke access for this user. Only assigned clients
                  will be visible to them on the Clients page and in task modals.
                </p>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">
                  {assignedCount} of {clients.length} clients assigned
                </p>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col gap-3 mb-4 sm:flex-row">
                <input
                  type="text"
                  name="clientSearch"
                  placeholder="Search clients…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  aria-label="Search clients"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:bg-gray-800 dark:text-white"
                />
                <select
                  name="complianceFilter"
                  value={complianceFilter}
                  onChange={(e) => setComplianceFilter(e.target.value)}
                  aria-label="Filter by compliance service"
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Rows</option>
                  <option value="roc">ROC</option>
                  <option value="gstr1">GSTR1</option>
                  <option value="gst3b">GST3B</option>
                  <option value="iff">IFF</option>
                  <option value="itr">ITR</option>
                  <option value="itrAudit">ITR Audit</option>
                  <option value="taxAudit">Tax Audit</option>
                  <option value="accounting">Accounting</option>
                  <option value="clientVisit">Client Visit</option>
                  <option value="bank">Bank</option>
                  <option value="tcs">TCS</option>
                  <option value="tds">TDS</option>
                  <option value="statutoryAudit">Statutory Audit</option>
                </select>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={handleSelectAll}
                    disabled={savingUser === activeUserId}
                    className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 whitespace-nowrap"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    disabled={savingUser === activeUserId}
                    className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 whitespace-nowrap"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Client count */}
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {filteredClients.length} clients shown
              </div>

              {/* Client Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                {filteredClients.length === 0 ? (
                  <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                    No clients match your search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            S.No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Client Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Business Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            PAN/GSTIN
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Access
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredClients.map((client, idx) => {
                          const hasAccess = client.id ? allowedClientIds.has(client.id) : false;
                          return (
                            // ponytail: no content-visibility here — this table is auto-layout
                            // with no column widths, so skipping row measurement makes column
                            // widths jump while scrolling. Add pagination or a real virtualizer
                            // when client counts get large.
                            <tr
                              key={client.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {client.clientNumber || idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {client.clientName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {client.businessName || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {getTaxId(client)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => client.id && toggleClient(client.id)}
                                  disabled={savingUser === activeUserId}
                                  role="switch"
                                  aria-checked={hasAccess}
                                  aria-label={`${hasAccess ? 'Revoke' : 'Grant'} access for ${client.clientName}`}
                                  className={`w-10 h-6 rounded-full transition-colors relative ${
                                    hasAccess
                                      ? 'bg-green-500'
                                      : 'bg-gray-300 dark:bg-gray-600'
                                  } disabled:opacity-60`}
                                  title={
                                    hasAccess ? 'Revoke access' : 'Grant access'
                                  }
                                >
                                  <span
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                      hasAccess ? 'translate-x-4' : ''
                                    }`}
                                  />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
