'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

const visitDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

interface VisitRecord {
  date: string;
  employeeName: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  scheduledDuration?: number;
  taskTitle: string;
  taskType?: 'recurring' | 'non-recurring';
  attendanceStatus?: 'present' | 'absent' | 'incomplete' | 'no-data';
  attendanceDetails?: {
    clockIn?: string;
    clockOut?: string;
    totalHours?: number;
  };
}

interface MonthlyVisits {
  month: string;
  monthName: string;
  visits: VisitRecord[];
  totalVisits: number;
}

interface ClientMonthlyReport {
  clientId: string;
  clientName: string;
  monthlyData: MonthlyVisits[];
  totalVisits: number;
  isBank?: boolean;
}

export default function ClientVisitsPage() {
  return (
    <Suspense fallback={null}>
      <ClientVisitsPageContent />
    </Suspense>
  );
}

function ClientVisitsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [clientReports, setClientReports] = useState<ClientMonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [startDate, setStartDate] = useState(searchParams.get('start') ?? '');
  const [endDate, setEndDate] = useState(searchParams.get('end') ?? '');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'visits' | 'bank'>(
    searchParams.get('tab') === 'bank' ? 'bank' : 'visits'
  );

  useEffect(() => {
    fetchClientReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active tab and filters in the URL so the view is shareable
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    if (activeTab !== 'visits') params.set('tab', activeTab);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchTerm, startDate, endDate, activeTab, pathname, router]);

  const fetchClientReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/client-visits/monthly-report?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setClientReports(data.clients || []);
      } else {
        toast.error('Failed to load client visit reports');
      }
    } catch (error) {
      console.error('Error fetching client reports:', error);
      toast.error('Failed to load client visit reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClientReports();
  };

  const handleClear = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchClientReports(), 100);
  };

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleMonth = (key: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMonths(newExpanded);
  };

  const regularClients = clientReports.filter(c => !c.isBank);
  const bankClients = clientReports.filter(c => c.isBank);
  const activeClients = activeTab === 'visits' ? regularClients : bankClients;
  const totalVisitsAcrossClients = activeClients.reduce((sum, client) => sum + client.totalVisits, 0);

  const getAttendanceStatusBadge = (status?: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            ✓ Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            ✗ Absent
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            ⚠ Incomplete
          </span>
        );
      case 'no-data':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            - Scheduled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Client Visit Reports</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Monthly visit reports organized by client</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('visits')}
          aria-pressed={activeTab === 'visits'}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'visits'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-white dark:border-b-gray-800 border-gray-200 dark:border-gray-700 -mb-px'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Client Visits
          {regularClients.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {regularClients.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          aria-pressed={activeTab === 'bank'}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'bank'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-white dark:border-b-gray-800 border-gray-200 dark:border-gray-700 -mb-px'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Bank
          {bankClients.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {bankClients.length}
            </span>
          )}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{activeClients.length}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Clients</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{totalVisitsAcrossClients}</div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Visits</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
            {activeClients.reduce((sum, c) => sum + c.monthlyData.length, 0)}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Months</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="clientSearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              autoComplete="off"
              aria-label="Search client name"
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Search client name…"
            />
          </div>
          <input
            type="date"
            name="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            autoComplete="off"
            aria-label="Start date"
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="date"
            name="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            autoComplete="off"
            aria-label="End date"
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
          <button
            onClick={handleClear}
            className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Client Reports */}
      {loading ? (
        <div role="status" aria-live="polite" className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
          <div aria-hidden="true" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading client reports…</p>
        </div>
      ) : activeClients.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No client visits found</p>
          {searchTerm && (
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-2">
              Try adjusting your search criteria
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {activeClients.map((client) => (
            <div
              key={client.clientId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              {/* Client Header */}
              <button
                onClick={() => toggleClient(client.clientId)}
                aria-expanded={expandedClients.has(client.clientId)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-300 font-semibold text-base sm:text-lg">
                      {client.clientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {client.clientName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {client.totalVisits} visit{client.totalVisits !== 1 ? 's' : ''} • {client.monthlyData.length} month{client.monthlyData.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                    expandedClients.has(client.clientId) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Monthly Data */}
              {expandedClients.has(client.clientId) && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {client.monthlyData.map((monthData) => {
                    const monthKey = `${client.clientId}-${monthData.month}`;
                    return (
                      <div key={monthData.month} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        {/* Month Header */}
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          aria-expanded={expandedMonths.has(monthKey)}
                          className="w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                              {monthData.monthName}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              ({monthData.totalVisits})
                            </span>
                          </div>
                          <svg
                            aria-hidden="true"
                            focusable="false"
                            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                              expandedMonths.has(monthKey) ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Visit Records */}
                        {expandedMonths.has(monthKey) && (
                          <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {monthData.visits.map((visit, idx) => (
                              <div
                                key={idx}
                                className="px-3 sm:px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                              >
                                <div className="flex flex-col gap-2 sm:gap-3">
                                  {/* Date and Time */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {visitDateFormatter.format(new Date(visit.date))}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {visit.startTime !== '-'
                                          ? `Scheduled: ${visit.startTime} - ${visit.endTime}${visit.scheduledDuration ? ` (${visit.scheduledDuration}h)` : ''}`
                                          : 'No time set'}
                                      </div>
                                    </div>
                                    {getAttendanceStatusBadge(visit.attendanceStatus)}
                                  </div>

                                  {/* Employee */}
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {visit.employeeName}
                                    </span>
                                  </div>

                                  {/* Task */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {visit.taskTitle}
                                    </span>
                                    {visit.taskType && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        visit.taskType === 'recurring'
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                      }`}>
                                        {visit.taskType === 'recurring' ? 'Recurring' : 'Non-Recurring'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Attendance Details */}
                                  {visit.attendanceDetails && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-6 space-y-0.5">
                                      <div className="font-medium text-gray-600 dark:text-gray-400">Actual:</div>
                                      {visit.attendanceDetails.clockIn && (
                                        <div>In: {visit.attendanceDetails.clockIn}</div>
                                      )}
                                      {visit.attendanceDetails.clockOut && (
                                        <div>Out: {visit.attendanceDetails.clockOut}</div>
                                      )}
                                      {visit.attendanceDetails.totalHours !== undefined && (
                                        <div className="font-medium text-gray-600 dark:text-gray-300">
                                          {visit.attendanceDetails.totalHours.toFixed(2)}h worked
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
