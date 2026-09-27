'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useModal } from '@/contexts/modal-context';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';

// Lazy load the HolidayManagementModal
const HolidayManagementModal = dynamic(() => import('@/components/attendance/HolidayManagementModal').then(mod => ({ default: mod.HolidayManagementModal })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div></div>,
  ssr: false
});

// Lazy load the RosterExportModal
const RosterExportModal = dynamic(() => import('@/components/attendance/RosterExportModal').then(mod => ({ default: mod.RosterExportModal })), {
  loading: () => null,
  ssr: false
});

interface AttendanceDay {
  date: Date;
  status: 'present' | 'absent' | 'approved-leave' | 'unapproved-leave' | 'half-day' | 'holiday' | 'pending' | 'wfh';
  hours?: number;
  leaveType?: string; // e.g., 'sick', 'casual', 'wfh'
  leaveStatus?: 'approved' | 'pending' | 'rejected';
}

interface EmployeeAttendance {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role?: string;
  days: AttendanceDay[];
  stats: {
    present: number;
    absent: number;
    approvedLeave: number;
    unapprovedLeave: number;
    halfDay: number;
    wfh: number;
    holiday: number;
    totalHours: number;
  };
}

export default function AttendanceRosterPage() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendance | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    fetchAttendanceData();
  }, [month, year]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);

      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');

      // Fetch all employees
      const employeesRes = await authenticatedFetch('/api/employees');
      if (!employeesRes.ok) throw new Error('Failed to fetch employees');
      const employeesRaw = await employeesRes.json();
      // /api/employees returns { data: Employee[], total: number } — extract safely
      const employeesData: any[] = Array.isArray(employeesRaw)
        ? employeesRaw
        : Array.isArray(employeesRaw?.data)
          ? employeesRaw.data
          : [];

      // Fetch attendance records for the month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999); // Set to end of day to include all records on the last day

      const attendanceRes = await authenticatedFetch(
        `/api/attendance/records?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const attendanceRaw = attendanceRes.ok ? await attendanceRes.json() : [];
      const attendanceData: any[] = Array.isArray(attendanceRaw)
        ? attendanceRaw
        : Array.isArray(attendanceRaw?.data)
          ? attendanceRaw.data
          : [];

      // Fetch leave requests for the month
      // Use includeAll=true to get leave requests for all employees (roster needs complete data)
      const leaveRes = await authenticatedFetch(
        `/api/leave-requests?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&includeAll=true`
      );
      const leaveRaw = leaveRes.ok ? await leaveRes.json() : [];
      const leaveData: any[] = Array.isArray(leaveRaw)
        ? leaveRaw
        : Array.isArray(leaveRaw?.data)
          ? leaveRaw.data
          : [];

      // Fetch holidays using API (Admin SDK on server-side)
      const holidaysRes = await authenticatedFetch('/api/holidays');
      const holidaysData = holidaysRes.ok ? await holidaysRes.json() : [];
      
      const holidays = new Set<string>();
      
      holidaysData.forEach((holiday: any) => {
        if (holiday.date) {
          // API returns ISO string, convert to YYYY-MM-DD
          const holidayDate = new Date(holiday.date);
          const year = holidayDate.getFullYear();
          const month = String(holidayDate.getMonth() + 1).padStart(2, '0');
          const day = String(holidayDate.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          holidays.add(formattedDate);
        }
      });

      // Build attendance roster
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const roster: EmployeeAttendance[] = employeesData
        .filter((emp: any) => emp.status !== 'resigned') // Exclude resigned employees
        .map((emp: any) => {
        const days: AttendanceDay[] = [];
        let presentCount = 0;
        let absentCount = 0;
        let approvedLeaveCount = 0;
        let unapprovedLeaveCount = 0;
        let halfDayCount = 0;
        let wfhCount = 0;
        let holidayCount = 0;
        let totalHours = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          
          // Format date consistently as YYYY-MM-DD in local timezone
          const dateYear = date.getFullYear();
          const dateMonth = String(date.getMonth() + 1).padStart(2, '0');
          const dateDay = String(date.getDate()).padStart(2, '0');
          const dateStr = `${dateYear}-${dateMonth}-${dateDay}`;

          // Check if it's Sunday
          const isSunday = date.getDay() === 0;

          // Check if it's a holiday
          const isHoliday = holidays.has(dateStr);
          
          // Debugging removed to reduce console noise

          // Check attendance
          const attendance = attendanceData.find(
            (a: any) => {
              if (a.employeeId !== emp.id) return false;
              const clockInDate = new Date(a.clockIn);
              if (isNaN(clockInDate.getTime())) return false;
              
              // Format clockInDate to YYYY-MM-DD in IST to match dateStr
              const formatter = new Intl.DateTimeFormat('en-CA', { 
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
              });
              return formatter.format(clockInDate) === dateStr;
            }
          );

          // Check leave requests - compare YYYY-MM-DD strings to avoid timezone mismatch
          // (ISO strings from API are UTC midnight; local Date objects are local midnight — direct
          //  Date comparison fails for UTC+5:30 where UTC midnight = 05:30 local > 00:00 local)
          const leaveRequests = leaveData.filter((l: any) => {
            if (l.employeeId !== emp.id) return false;
            const leaveStart = l.startDate.split('T')[0]; // "YYYY-MM-DD"
            const leaveEnd = l.endDate.split('T')[0];
            return leaveStart <= dateStr && leaveEnd >= dateStr;
          });

          // Find relevant leave (approved takes precedence)
          const approvedLeave = leaveRequests.find((l: any) => l.status === 'approved');
          const pendingLeave = leaveRequests.find((l: any) => l.status === 'pending');

          let status: 'present' | 'absent' | 'approved-leave' | 'unapproved-leave' | 'half-day' | 'holiday' | 'pending' | 'wfh' = 'pending';
          let hours = 0;
          let leaveType: string = 'full';
          let leaveStatus: 'approved' | 'pending' | 'rejected' = 'pending';

          if (approvedLeave) {
            if (approvedLeave.leaveType === 'wfh') {
              status = 'wfh';
              wfhCount++;
            } else if (approvedLeave.leaveType === 'half-day') {
              status = 'half-day';
              halfDayCount++;
            } else {
              status = 'approved-leave';
              approvedLeaveCount++;
            }
            leaveType = approvedLeave.leaveType || 'approved-leave';
            leaveStatus = 'approved';
          } else if (pendingLeave) {
            status = 'unapproved-leave';
            unapprovedLeaveCount++;
            leaveStatus = 'pending';
          } else if (attendance) {
            status = 'present';
            hours = attendance.totalHours || 0;
            presentCount++;
            totalHours += hours;
          } else if (isSunday || isHoliday) {
            status = 'holiday';
            holidayCount++;
          } else if (date < new Date()) {
            status = 'absent';
            absentCount++;
          }

          days.push({ date, status, hours, leaveType, leaveStatus });
        }

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          employeeEmail: emp.email,
          role: emp.role,
          days,
          stats: {
            present: presentCount,
            absent: absentCount,
            approvedLeave: approvedLeaveCount,
            unapprovedLeave: unapprovedLeaveCount,
            halfDay: halfDayCount,
            wfh: wfhCount,
            holiday: holidayCount,
            totalHours,
          },
        };
      });

      setEmployees(roster);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, leaveType?: string) => {
    switch (status) {
      case 'present': return 'bg-success';
      case 'absent': return 'bg-destructive';
      case 'approved-leave': return 'bg-info';
      case 'unapproved-leave': return 'bg-destructive';
      case 'half-day': return 'bg-warning';
      case 'holiday': return 'bg-accent';
      case 'pending': return 'bg-muted';
      case 'wfh': return 'bg-foreground';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved-leave': return 'Leave';
      case 'unapproved-leave': return 'Unapproved';
      case 'half-day': return 'Half Day';
      case 'wfh': return 'WFH';
      default: return status;
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openEmployeeModal = (employee: EmployeeAttendance) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    openModal();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Attendance Sheet"
        description="Monthly attendance overview for all employees."
        actions={
          <>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              aria-label="Month"
              className="h-11 rounded-lg border-2 border-border bg-card px-4 py-2 text-foreground"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              aria-label="Year"
              className="h-11 rounded-lg border-2 border-border bg-card px-4 py-2 text-foreground"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={fetchAttendanceData}
              className="rounded-lg border-2 border-border bg-card px-4 py-2 text-foreground transition-colors hover:bg-muted"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowHolidayModal(true)}
              className="rounded-lg border-2 border-border bg-card px-4 py-2 text-foreground transition-colors hover:bg-muted"
            >
              Manage Holidays
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={loading || employees.length === 0}
              className="flex items-center gap-2 rounded-lg border-2 border-border bg-foreground px-4 py-2 text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Excel
            </button>
          </>
        }
      />

      {/* Legend — swatches come from getStatusColor so the key can't drift from the grid */}
      <Card className="mb-6 flex flex-wrap items-center gap-4 p-4">
        {[
          { label: 'Present', status: 'present' },
          { label: 'Absent', status: 'absent' },
          { label: 'Approved Leave', status: 'approved-leave' },
          { label: 'Half Day', status: 'half-day' },
          { label: 'Unapproved Leave', status: 'unapproved-leave' },
          { label: 'Sunday/Holiday', status: 'holiday' },
          { label: 'WFH', status: 'wfh' },
          { label: 'Pending/Future', status: 'pending' },
        ].map(({ label, status }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded border border-border ${getStatusColor(status)}`} />
            <span className="text-sm text-foreground">{label}</span>
          </div>
        ))}
      </Card>

      {/* Attendance Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-foreground"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="sticky left-0 bg-muted px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Employee
                  </th>
                  {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                    <th key={day} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((employee) => (
                  <tr key={employee.employeeId} className="hover:bg-muted/50">
                    <td className="sticky left-0 bg-card px-4 py-3">
                      <button
                        onClick={() => openEmployeeModal(employee)}
                        className="text-left hover:text-foreground"
                      >
                        <div className="font-medium text-foreground">{employee.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{employee.employeeEmail}</div>
                      </button>
                    </td>
                    {employee.days.map((day, idx) => (
                      <td key={idx} className="px-2 py-3">
                        <div
                          className={`mx-auto h-6 w-6 cursor-pointer rounded border border-border ${getStatusColor(day.status, day.leaveType)}`}
                          title={`${day.date.toLocaleDateString()}: ${day.status}${day.hours ? ` (${day.hours.toFixed(1)}h)` : ''}`}
                        ></div>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap gap-x-3 gap-y-1 text-xs">
                        <span className="text-success">P: {employee.stats.present}</span>
                        <span className="text-destructive">A: {employee.stats.absent}</span>
                        <span className="text-success">AL: {employee.stats.approvedLeave}</span>
                        <span className="text-success">HD: {employee.stats.halfDay}</span>
                        <span className="text-foreground">WFH: {employee.stats.wfh}</span>
                        <span className="text-destructive">UL: {employee.stats.unapprovedLeave}</span>
                        <span className="text-info">H: {employee.stats.holiday}</span>
                        <span className="text-muted-foreground">Hrs: {employee.stats.totalHours.toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Employee Detail Modal */}
      {showEmployeeModal && selectedEmployee && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto p-3 sm:p-6 m-2 sm:m-4">
            <div className="mb-4 flex items-start justify-between gap-2 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg font-bold text-foreground sm:text-xl">{selectedEmployee.employeeName}</h3>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{selectedEmployee.employeeEmail}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                  {monthNames[month]} {year} - Attendance Overview
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  closeModal();
                }}
                aria-label="Close"
                className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Summary */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {[
                { label: 'Present', value: selectedEmployee.stats.present, tone: 'text-success' },
                { label: 'Absent', value: selectedEmployee.stats.absent, tone: 'text-destructive' },
                { label: 'Approved Leave', value: selectedEmployee.stats.approvedLeave, tone: 'text-success' },
                { label: 'Half Day', value: selectedEmployee.stats.halfDay, tone: 'text-success' },
                { label: 'WFH', value: selectedEmployee.stats.wfh, tone: 'text-foreground' },
                { label: 'Unapproved', value: selectedEmployee.stats.unapprovedLeave, tone: 'text-destructive' },
                { label: 'Holidays', value: selectedEmployee.stats.holiday, tone: 'text-info' },
              ].map(({ label, value, tone }) => (
                <div key={label} className="rounded-lg border-2 border-border bg-muted/40 p-2 sm:p-4">
                  <div className={`font-display text-lg font-bold sm:text-2xl ${tone}`}>{value}</div>
                  <div className="text-xs text-muted-foreground sm:text-sm">{label}</div>
                </div>
              ))}
              <div className="col-span-2 rounded-lg border-2 border-border bg-muted/40 p-2 sm:p-4">
                <div className="font-display text-lg font-bold text-foreground sm:text-2xl">{selectedEmployee.stats.totalHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground sm:text-sm">Total Hours</div>
              </div>
            </div>

            {/* Calendar View */}
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <div className="grid min-w-[280px] grid-cols-7 gap-1 sm:gap-2">
                {selectedEmployee.days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border border-border p-1.5 sm:p-3 ${getStatusColor(day.status)} bg-opacity-20`}
                  >
                    <div className="text-xs font-medium text-foreground sm:text-sm">{day.date.getDate()}</div>
                    <div className="truncate text-[10px] capitalize text-muted-foreground sm:text-xs">{getStatusLabel(day.status)}</div>
                    {(day.hours ?? 0) > 0 && (
                      <div className="text-[10px] text-muted-foreground sm:text-xs">{(day.hours ?? 0).toFixed(1)}h</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      , document.body)}

      {/* Holiday Management Modal */}
      <HolidayManagementModal
        isOpen={showHolidayModal}
        onClose={() => {
          setShowHolidayModal(false);
          fetchAttendanceData(); // Refresh data when modal closes to show new holidays
        }}
      />

      {/* Roster Export Modal */}
      <RosterExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        employees={employees}
        month={month}
        year={year}
      />
    </div>
  );
}
