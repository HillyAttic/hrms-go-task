'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useModal } from '@/contexts/modal-context';
import dynamic from 'next/dynamic';

// Lazy load the HolidayManagementModal
const HolidayManagementModal = dynamic(() => import('@/components/attendance/HolidayManagementModal').then(mod => ({ default: mod.HolidayManagementModal })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
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
            (a: any) => a.employeeId === emp.id &&
              new Date(a.clockIn).toISOString().split('T')[0] === dateStr
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
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'approved-leave': return 'bg-purple-500';
      case 'unapproved-leave': return 'bg-red-500';
      case 'half-day': return 'bg-orange-500';
      case 'holiday': return 'bg-blue-500';
      case 'pending': return 'bg-gray-300';
      case 'wfh': return 'bg-black';
      default: return 'bg-gray-300';
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Sheet</h1>
        <p className="text-gray-600 dark:text-gray-400">Monthly attendance overview for all employees</p>
      </div>

      {/* Month/Year Selector */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        >
          {monthNames.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={fetchAttendanceData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
        <button
          onClick={() => setShowHolidayModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Manage Holidays
        </button>
        <button
          onClick={() => setShowExportModal(true)}
          disabled={loading || employees.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </button>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Approved Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Half Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Unapproved Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Sunday/Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-black rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">WFH</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Pending/Future</span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700">
                    Employee
                  </th>
                  {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                    <th key={day} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300">
                      {day}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map((employee) => (
                  <tr key={employee.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800">
                      <button
                        onClick={() => openEmployeeModal(employee)}
                        className="text-left hover:text-blue-600"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{employee.employeeName}</div>
                        <div className="text-xs text-gray-500">{employee.employeeEmail}</div>
                      </button>
                    </td>
                    {employee.days.map((day, idx) => (
                      <td key={idx} className="px-2 py-3">
                        <div
                          className={`w-6 h-6 rounded ${getStatusColor(day.status, day.leaveType)} mx-auto cursor-pointer`}
                          title={`${day.date.toLocaleDateString()}: ${day.status}${day.hours ? ` (${day.hours.toFixed(1)}h)` : ''}`}
                        ></div>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="text-xs flex flex-nowrap gap-x-3 gap-y-1">
                        <span className="text-green-600">P: {employee.stats.present}</span>
                        <span className="text-red-600">A: {employee.stats.absent}</span>
                        <span className="text-green-600">AL: {employee.stats.approvedLeave}</span>
                        <span className="text-green-600">HD: {employee.stats.halfDay}</span>
                        <span className="text-gray-900 dark:text-gray-100">WFH: {employee.stats.wfh}</span>
                        <span className="text-red-600">UL: {employee.stats.unapprovedLeave}</span>
                        <span className="text-blue-600">H: {employee.stats.holiday}</span>
                        <span className="text-gray-600 dark:text-gray-400">Hrs: {employee.stats.totalHours.toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 sm:mb-6 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{selectedEmployee.employeeName}</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{selectedEmployee.employeeEmail}</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
                  {monthNames[month]} {year} - Attendance Overview
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  closeModal();
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{selectedEmployee.stats.present}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-red-600">{selectedEmployee.stats.absent}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Absent</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{selectedEmployee.stats.approvedLeave}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Approved Leave</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{selectedEmployee.stats.halfDay}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Half Day</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{selectedEmployee.stats.wfh}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">WFH</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-red-600">{selectedEmployee.stats.unapprovedLeave}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Unapproved</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{selectedEmployee.stats.holiday}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Holidays</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 sm:p-4 rounded-lg col-span-2">
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{selectedEmployee.stats.totalHours.toFixed(1)}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
              </div>
            </div>

            {/* Calendar View */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[280px]">
                {selectedEmployee.days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-1.5 sm:p-3 rounded-lg border ${getStatusColor(day.status)} bg-opacity-20 border-opacity-50`}
                  >
                    <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{day.date.getDate()}</div>
                    <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 capitalize truncate">{getStatusLabel(day.status)}</div>
                    {(day.hours ?? 0) > 0 && (
                      <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{(day.hours ?? 0).toFixed(1)}h</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
