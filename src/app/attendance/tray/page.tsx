'use client';

import React, { useState, useEffect, useCallback, useId, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocsFromServer,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ManagerGuard } from '@/components/Auth/PermissionGuard';

// Lazy load heavy modals
const LocationMapModal = dynamic(() => import('@/components/attendance/LocationMapModal').then(mod => ({ default: mod.LocationMapModal })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false
});

const AttendanceCalendarModal = dynamic(() => import('@/components/attendance/AttendanceCalendarModal').then(mod => ({ default: mod.AttendanceCalendarModal })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false
});
import {
  Clock,
  MapPin,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  ShieldAlert,
  FullscreenIcon
} from 'lucide-react';
import { employeeService } from '@/services/employee.service';
import { inMemoryPersistence } from 'firebase/auth/cordova';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  location?: {
    clockIn?: { latitude: number; longitude: number };
    clockOut?: { latitude: number; longitude: number };
  };
  totalHours: number;
  status: 'active' | 'completed' | 'incomplete';
  createdAt: Date;
  updatedAt: Date;
}

interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Admin' | 'Employee';
  status: 'active' | 'on-leave' | 'resigned';
}

export default function AttendanceTrayPage() {
  return (
    <Suspense fallback={null}>
      <AttendanceTrayPageInner />
    </Suspense>
  );
}

function AttendanceTrayPageInner() {
  const { user, userProfile, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(searchParams.get('page'));
    return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const itemsPerPage = 20;

  // Filter states (initialized from the URL)
  const [selectedEmployee, setSelectedEmployee] = useState<string>(() => searchParams.get('employee') || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(() => searchParams.get('status') || 'all');
  const [dateFilter, setDateFilter] = useState<string>(() => searchParams.get('date') || 'all');

  const employeeFilterId = useId();
  const statusFilterId = useId();
  const dateFilterId = useId();

  // Keep filters and page in the URL
  const writeParams = (opts: { employee: string; status: string; date: string; page: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    const entries: [string, string | undefined][] = [
      ['employee', opts.employee === 'all' ? undefined : opts.employee],
      ['status', opts.status === 'all' ? undefined : opts.status],
      ['date', opts.date === 'all' ? undefined : opts.date],
      ['page', opts.page > 1 ? String(opts.page) : undefined],
    ];
    for (const [key, value] of entries) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // State for location map modal
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; title: string } | null>(null);

  // State for calendar modal
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<{ id: string; name: string } | null>(null);

  // Convert Firestore timestamp to Date
  const convertTimestamps = (record: any): AttendanceRecord => {
    const convertTimestamp = (timestamp: any): Date | undefined => {
      if (!timestamp) return undefined;
      
      try {
        if (timestamp instanceof Date) return timestamp;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
          return new Date(timestamp.seconds * 1000);
        }
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? undefined : date;
        }
        return undefined;
      } catch (error) {
        console.error('Error converting timestamp:', error, timestamp);
        return undefined;
      }
    };
    
    return {
      ...record,
      clockIn: convertTimestamp(record.clockIn),
      clockOut: convertTimestamp(record.clockOut),
      createdAt: convertTimestamp(record.createdAt),
      updatedAt: convertTimestamp(record.updatedAt),
    };
  };

  // Fetch manager hierarchy and assigned employees
  const fetchManagerHierarchy = useCallback(async () => {
    if (!user || !isManager || isAdmin) {
      setAssignedEmployeeIds([]);
      return;
    }

    try {
      const { managerHierarchyService } = await import('@/services/manager-hierarchy.service');
      const hierarchy = await managerHierarchyService.getByManagerId(user.uid);
      
      if (hierarchy && hierarchy.employeeIds) {
        setAssignedEmployeeIds(hierarchy.employeeIds);
      } else {
        setAssignedEmployeeIds([]);
      }
    } catch (error) {
      console.error('Error fetching manager hierarchy:', error);
      setAssignedEmployeeIds([]);
    }
  }, [user, isManager, isAdmin]);

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    try {
      let allEmployees = await employeeService.getAll();
      
      // Filter employees for managers
      if (isManager && !isAdmin && assignedEmployeeIds.length > 0) {
        allEmployees = allEmployees.filter(emp => 
          emp.id && assignedEmployeeIds.includes(emp.id)
        );
      } else if (isManager && !isAdmin && assignedEmployeeIds.length === 0) {
        // Manager has no assigned employees
        allEmployees = [];
      }
      
      setEmployees(allEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, [isManager, isAdmin, assignedEmployeeIds]);

  // Fetch attendance records
  const fetchAttendanceHistory = useCallback(async (page = 1) => {
    setLoading(true);
    
    try {
      const fetchLimit = page * itemsPerPage + 1; // Fetch one extra to detect "has more"

      // For managers (non-admin): push employee filter to Firestore query
      // so limit() applies to THEIR employees' records only, not all employees
      const isManagerOnly = isManager && !isAdmin;

      if (isManagerOnly && assignedEmployeeIds.length === 0) {
        // Manager has no assigned employees - nothing to show
        setAttendances([]);
        setHasMoreData(false);
        return;
      }

      // Helper to build a query for a given set of employee IDs (or all)
      const buildQuery = (employeeIds?: string[]) => {
        const coll = collection(db, 'attendance-records');
        const parts: any[] = [];

        // Employee filter
        if (selectedEmployee !== 'all') {
          parts.push(where('employeeId', '==', selectedEmployee));
        } else if (employeeIds && employeeIds.length > 0) {
          parts.push(where('employeeId', 'in', employeeIds));
        }

        // Date filter
        if (dateFilter !== 'all') {
          const now = new Date();
          let startDate = new Date();
          switch (dateFilter) {
            case 'today':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
          }
          parts.push(where('clockIn', '>=', Timestamp.fromDate(startDate)));
        }

        parts.push(orderBy('clockIn', 'desc'));
        parts.push(limit(fetchLimit));

        return query(coll, ...parts);
      };

      let allRecords: AttendanceRecord[] = [];

      if (isManagerOnly && assignedEmployeeIds.length > 30) {
        // Firestore 'in' supports max 30 values — run parallel batch queries
        const batches: string[][] = [];
        for (let i = 0; i < assignedEmployeeIds.length; i += 30) {
          batches.push(assignedEmployeeIds.slice(i, i + 30));
        }

        const batchResults = await Promise.all(
          batches.map(async (batch) => {
            const batchQuery = buildQuery(batch);
            const snapshot = await getDocsFromServer(batchQuery);
            return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
          })
        );

        // Merge, deduplicate by ID, and sort all batch results
        const recordsMap = new Map<string, AttendanceRecord>();
        batchResults.flat().forEach(record => {
          if (record.id && !recordsMap.has(record.id)) {
            recordsMap.set(record.id, record);
          }
        });
        
        allRecords = Array.from(recordsMap.values())
          .sort((a, b) => (b.clockIn?.getTime() || 0) - (a.clockIn?.getTime() || 0));
      } else {
        // Single query: admin sees all, manager sees assigned employees (≤30)
        const employeeIds = isManagerOnly ? assignedEmployeeIds : undefined;
        const q = buildQuery(employeeIds);
        const snapshot = await getDocsFromServer(q);

        if (snapshot.empty) {
          setAttendances([]);
          setHasMoreData(false);
          return;
        }

        allRecords = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
      }

      if (allRecords.length === 0) {
        setAttendances([]);
        setHasMoreData(false);
      } else {
        // Detect if more data exists (we fetched one extra record)
        const expectedLimit = page * itemsPerPage;
        const hasMore = allRecords.length > expectedLimit;

        // Trim to actual limit (remove the extra detection record)
        const trimmedRecords = hasMore ? allRecords.slice(0, expectedLimit) : allRecords;

        // Apply status filter client-side
        let filteredRecords = trimmedRecords;
        if (selectedStatus !== 'all') {
          filteredRecords = trimmedRecords.filter(record => {
            if (selectedStatus === 'active') return !record.clockOut;
            if (selectedStatus === 'completed') return !!record.clockOut;
            return true;
          });
        }

        // Get the records for the current page
        const startIndex = (page - 1) * itemsPerPage;
        const pageRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

        setAttendances(pageRecords);
        setHasMoreData(hasMore);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [selectedEmployee, selectedStatus, dateFilter, isManager, isAdmin, assignedEmployeeIds]);

  // Load manager hierarchy first, then employees
  useEffect(() => {
    fetchManagerHierarchy();
  }, [fetchManagerHierarchy]);

  // Load employees after hierarchy is fetched
  useEffect(() => {
    if (isManager && !isAdmin) {
      // Wait for assignedEmployeeIds to be set
      if (assignedEmployeeIds.length > 0 || assignedEmployeeIds.length === 0) {
        fetchEmployees();
      }
    } else {
      fetchEmployees();
    }
  }, [fetchEmployees, isManager, isAdmin, assignedEmployeeIds]);

  useEffect(() => {
    fetchAttendanceHistory(currentPage);
  }, [fetchAttendanceHistory, currentPage, selectedEmployee, selectedStatus, dateFilter]);

  // Format time for display
  const formatTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Time';
      return validDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Error';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Date';
      return validDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Error';
    }
  };

  // Calculate duration
  const calculateDuration = (clockIn: Date, clockOut?: Date) => {
    try {
      if (!clockIn || isNaN(clockIn.getTime())) return 'Invalid Start Time';
      if (!clockOut) return 'In Progress';
      if (isNaN(clockOut.getTime())) return 'Invalid End Time';
            
      const diffMs = clockOut.getTime() - clockIn.getTime();
      if (diffMs < 0) return 'Negative Duration';
            
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
            
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return 'Calculation Error';
    }
  };

  // Get status badge
  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.clockIn) {
      return <Badge variant="secondary">Not Clocked In</Badge>;
    } else if (record.clockOut) {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-900">Completed</Badge>;
    } else {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-900">Active</Badge>;
    }
  };

  // Handle location click
  const handleLocationClick = (latitude: number, longitude: number, title: string) => {
    setSelectedLocation({ latitude, longitude, title });
    setShowMapModal(true);
  };

  // Handle calendar overview click
  const handleCalendarClick = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeForCalendar({ id: employeeId, name: employeeName });
    setShowCalendarModal(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view attendance tray.</p>
          <Link
            href="/auth/signin"
            className={buttonVariants({ className: 'bg-blue-600 hover:bg-blue-700 text-white' })}
          >
            Sign In to Continue
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <ManagerGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
            <ShieldAlert className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            You don't have permission to access this page. Only administrators and managers can view the attendance tray.
          </p>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Go Back
          </Link>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-0">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Attendance Tray</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2 sm:mt-0">View attendance history for all employees</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(1);
              fetchAttendanceHistory(1);
            }}
            className="flex items-center gap-1"
          >
            <Loader2 className="h-4 w-4" />
            Refresh
          </Button>
          <Link href="/attendance" className={buttonVariants({ variant: 'outline', className: 'flex items-center gap-2' })}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employee Filter */}
            <div>
              <label htmlFor={employeeFilterId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee
              </label>
              <select
                id={employeeFilterId}
                name="employeeFilter"
                value={selectedEmployee}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedEmployee(value);
                  setCurrentPage(1);
                  writeParams({ employee: value, status: selectedStatus, date: dateFilter, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor={statusFilterId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                id={statusFilterId}
                name="statusFilter"
                value={selectedStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedStatus(value);
                  setCurrentPage(1);
                  writeParams({ employee: selectedEmployee, status: value, date: dateFilter, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label htmlFor={dateFilterId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                id={dateFilterId}
                name="dateFilter"
                value={dateFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setDateFilter(value);
                  setCurrentPage(1);
                  writeParams({ employee: selectedEmployee, status: selectedStatus, date: value, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      {attendances.length === 0 && !loading && !isInitialLoad ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Attendance Records</h3>
            <p className="text-gray-600 dark:text-gray-400">No attendance records found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attendances.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Employee Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{record.employeeName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(record.clockIn)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clock In</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatTime(record.clockIn)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clock Out</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatTime(record.clockOut)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                      <p className="font-medium text-gray-900 dark:text-white">{calculateDuration(record.clockIn, record.clockOut)}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    {getStatusBadge(record)}
                  </div>
                </div>

                {/* Bottom row: location links + calendar button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      {record.location?.clockIn && (
                        <button
                          onClick={() => handleLocationClick(
                            record.location!.clockIn!.latitude,
                            record.location!.clockIn!.longitude,
                            `${record.employeeName} - Clock In Location`
                          )}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Map (In)</span>
                        </button>
                      )}
                      {record.location?.clockOut && (
                        <button
                          onClick={() => handleLocationClick(
                            record.location!.clockOut!.latitude,
                            record.location!.clockOut!.longitude,
                            `${record.employeeName} - Clock Out Location`
                          )}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Map (Out)</span>
                        </button>
                      )}
                    </div>

                    {/* Calendar Overview Button - always visible */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCalendarClick(record.employeeId, record.employeeName)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Calendar className="h-3 w-3" />
                      Calendar Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-8">
            <Button
              onClick={() => {
                const prevPage = Math.max(1, currentPage - 1);
                setCurrentPage(prevPage);
                writeParams({ employee: selectedEmployee, status: selectedStatus, date: dateFilter, page: prevPage });
              }}
              disabled={currentPage <= 1 || loading}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} {hasMoreData ? 'of many' : ''}
              </span>
            </div>
          
            <Button
              onClick={() => {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                writeParams({ employee: selectedEmployee, status: selectedStatus, date: dateFilter, page: nextPage });
              }}
              disabled={!hasMoreData || loading}
              variant="outline"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2" role="status" aria-label="Loading…">
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">Loading records…</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Location Map Modal */}
      {selectedLocation && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => {
            setShowMapModal(false);
            setSelectedLocation(null);
          }}
          latitude={selectedLocation.latitude}
          longitude={selectedLocation.longitude}
          title={selectedLocation.title}
        />
      )}

      {/* Calendar Overview Modal */}
      {selectedEmployeeForCalendar && (
        <AttendanceCalendarModal
          isOpen={showCalendarModal}
          onClose={() => {
            setShowCalendarModal(false);
            setSelectedEmployeeForCalendar(null);
          }}
          employeeId={selectedEmployeeForCalendar.id}
          employeeName={selectedEmployeeForCalendar.name}
        />
      )}
    </div>
  </ManagerGuard>
  );
}
