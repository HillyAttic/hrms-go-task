'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

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
  const [clientReports, setClientReports] = useState<ClientMonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'visits' | 'bank'>('visits');

  useEffect(() => {
    fetchClientReports();
  }, []);

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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            ✓ Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
            ✗ Absent
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
            ⚠ Incomplete
          </span>
        );
      case 'no-data':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground dark:text-muted-foreground">
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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Client Visit Reports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Monthly visit reports organized by client</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 sm:mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'visits'
              ? 'bg-card text-foreground border border-b-white dark:border-b-gray-800 border-border -mb-px'
              : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground'
          }`}
        >
          Client Visits
          {regularClients.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-info/15 text-info">
              {regularClients.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'bank'
              ? 'bg-card text-foreground border border-b-white dark:border-b-gray-800 border-border -mb-px'
              : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground'
          }`}
        >
          Bank
          {bankClients.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-info/15 text-info">
              {bankClients.length}
            </span>
          )}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow">
          <div className="text-2xl sm:text-3xl font-bold text-info">{activeClients.length}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Total Clients</div>
        </div>
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow">
          <div className="text-2xl sm:text-3xl font-bold text-success">{totalVisitsAcrossClients}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Total Visits</div>
        </div>
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow">
          <div className="text-2xl sm:text-3xl font-bold text-info">
            {activeClients.reduce((sum, c) => sum + c.monthlyData.length, 0)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">Active Months</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-border rounded-lg"
              placeholder="Search client name..."
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-border rounded-lg"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-border rounded-lg"
            placeholder="End Date"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-foreground text-background rounded-lg hover:bg-foreground/90 transition"
          >
            Search
          </button>
          <button
            onClick={handleClear}
            className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-muted dark:bg-gray-600 text-muted-foreground rounded-lg hover:bg-muted dark:hover:bg-muted transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Client Reports */}
      {loading ? (
        <div className="bg-card rounded-lg shadow p-8 sm:p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading client reports...</p>
        </div>
      ) : activeClients.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-muted-foreground">No client visits found</p>
          {searchTerm && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Try adjusting your search criteria
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {activeClients.map((client) => (
            <div
              key={client.clientId}
              className="bg-card rounded-lg shadow overflow-hidden"
            >
              {/* Client Header */}
              <button
                onClick={() => toggleClient(client.clientId)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-muted/50 transition"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-info/15 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-info font-semibold text-base sm:text-lg">
                      {client.clientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                      {client.clientName}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {client.totalVisits} visit{client.totalVisits !== 1 ? 's' : ''} • {client.monthlyData.length} month{client.monthlyData.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
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
                <div className="border-t border-border">
                  {client.monthlyData.map((monthData) => {
                    const monthKey = `${client.clientId}-${monthData.month}`;
                    return (
                      <div key={monthData.month} className="border-b border-border last:border-b-0">
                        {/* Month Header */}
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between bg-muted hover:bg-muted/50 transition"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm sm:text-base font-medium text-foreground">
                              {monthData.monthName}
                            </span>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              ({monthData.totalVisits})
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
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
                          <div className="divide-y divide-border">
                            {monthData.visits.map((visit, idx) => (
                              <div
                                key={idx}
                                className="px-3 sm:px-6 py-3 hover:bg-muted/50 transition"
                              >
                                <div className="flex flex-col gap-2 sm:gap-3">
                                  {/* Date and Time */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium text-foreground">
                                        {new Date(visit.date).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {visit.startTime !== '-'
                                          ? `Scheduled: ${visit.startTime} - ${visit.endTime}${visit.scheduledDuration ? ` (${visit.scheduledDuration}h)` : ''}`
                                          : 'No time set'}
                                      </div>
                                    </div>
                                    {getAttendanceStatusBadge(visit.attendanceStatus)}
                                  </div>

                                  {/* Employee */}
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm font-medium text-foreground">
                                      {visit.employeeName}
                                    </span>
                                  </div>

                                  {/* Task */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      {visit.taskTitle}
                                    </span>
                                    {visit.taskType && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        visit.taskType === 'recurring'
                                          ? 'bg-info/15 text-info'
                                          : 'bg-warning/15 text-warning'
                                      }`}>
                                        {visit.taskType === 'recurring' ? 'Recurring' : 'Non-Recurring'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Attendance Details */}
                                  {visit.attendanceDetails && (
                                    <div className="text-xs text-muted-foreground pl-6 space-y-0.5">
                                      <div className="font-medium text-muted-foreground">Actual:</div>
                                      {visit.attendanceDetails.clockIn && (
                                        <div>In: {visit.attendanceDetails.clockIn}</div>
                                      )}
                                      {visit.attendanceDetails.clockOut && (
                                        <div>Out: {visit.attendanceDetails.clockOut}</div>
                                      )}
                                      {visit.attendanceDetails.totalHours !== undefined && (
                                        <div className="font-medium text-muted-foreground">
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
