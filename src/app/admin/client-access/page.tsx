'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accessDocs, setAccessDocs] = useState<ClientAccessDoc[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

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
        <h1 className="text-2xl font-bold text-foreground">Client Access</h1>
        <p className="text-muted-foreground mt-1">
          Control which clients each user can see
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground mx-auto" />
        </div>
      ) : users.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          No users found.
        </div>
      ) : (
        <>
          {/* User Search and Selection */}
          <div className="mb-6">
            {/* Mobile Dropdown - visible only on small screens */}
            <div className="block md:hidden mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Select User
              </label>
              <select
                value={activeUserId || ''}
                onChange={(e) => {
                  setActiveUserId(e.target.value);
                  setSearchQuery('');
                  setComplianceFilter('all');
                }}
                className="w-full px-4 py-2 text-sm border border-border rounded-lg focus:outline-none"
              >
                <option value="">Choose a user...</option>
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
                  placeholder="Search users by name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-border rounded-lg focus:outline-none"
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
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      activeUserId === user.uid
                        ? 'border-border bg-muted shadow-md'
                        : 'border-border hover:border-ring hover:shadow'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            activeUserId === user.uid
                              ? 'text-info'
                              : 'text-foreground'
                          }`}
                        >
                          {user.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                          user.role === 'manager'
                            ? 'bg-info/15 text-info'
                            : 'bg-success/15 text-success'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching "{userSearchQuery}"
                </div>
              )}
            </div>
          </div>

          {/* User Panel */}
          {activeUserId && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Toggle clients to grant or revoke access for this user. Only assigned clients
                  will be visible to them on the Clients page and in task modals.
                </p>
                <p className="text-sm font-medium text-info mt-1">
                  {assignedCount} of {clients.length} clients assigned
                </p>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col gap-3 mb-4 sm:flex-row">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none"
                />
                <select
                  value={complianceFilter}
                  onChange={(e) => setComplianceFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none"
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
                    className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-md bg-success text-white hover:bg-success/90 disabled:opacity-60 whitespace-nowrap"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    disabled={savingUser === activeUserId}
                    className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-md bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60 whitespace-nowrap"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Client count */}
              <div className="mb-2 text-xs text-muted-foreground">
                {filteredClients.length} clients shown
              </div>

              {/* Client Table */}
              <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                {filteredClients.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">
                    No clients match your search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            S.No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Client Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Business Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            PAN/GSTIN
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                            Access
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredClients.map((client, idx) => {
                          const hasAccess = client.id ? allowedClientIds.has(client.id) : false;
                          return (
                            <tr
                              key={client.id}
                              className="hover:bg-muted/50"
                            >
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {client.clientNumber || idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">
                                {client.clientName}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {client.businessName || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {getTaxId(client)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => client.id && toggleClient(client.id)}
                                  disabled={savingUser === activeUserId}
                                  className={`w-10 h-6 rounded-full transition-colors relative ${
                                    hasAccess
                                      ? 'bg-success'
                                      : 'bg-muted'
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
