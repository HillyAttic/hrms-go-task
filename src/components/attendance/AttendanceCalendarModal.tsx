'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
}

interface DayStatus {
  date: Date;
  status: 'present' | 'absent' | 'approved-leave' | 'unapproved-leave' | 'half-day' | 'upcoming' | 'holiday' | 'wfh';
  duration?: string;
  hours?: number;
  leaveType?: 'full' | 'half';
  leaveStatus?: 'approved' | 'pending' | 'rejected';
}

export function AttendanceCalendarModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeEmail,
}: AttendanceCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Map<string, DayStatus>>(new Map());
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchHolidays();
      fetchMonthAttendance();
    }
  }, [isOpen, employeeId, currentMonth]);

  const fetchHolidays = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'holidays'));
      const holidayDates = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        let dateStr = '';
        if (data.date && typeof data.date.toDate === 'function') {
          const d = data.date.toDate();
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof data.date === 'string') {
          dateStr = data.date.includes('T')
            ? (() => { const d = new Date(data.date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()
            : data.date;
        } else if (data.date?.seconds) {
          const d = new Date(data.date.seconds * 1000);
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        if (dateStr) holidayDates.add(dateStr);
      });
      setHolidays(holidayDates);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchMonthAttendance = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Fetch attendance records from Firestore
      const q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', employeeId),
        where('clockIn', '>=', Timestamp.fromDate(startOfMonth)),
        where('clockIn', '<=', Timestamp.fromDate(endOfMonth))
      );
      const snapshot = await getDocs(q);
      const dataMap = new Map<string, DayStatus>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const clockIn = data.clockIn?.toDate();
        const clockOut = data.clockOut?.toDate();
        if (!clockIn) return;

        const y = clockIn.getFullYear();
        const m = String(clockIn.getMonth() + 1).padStart(2, '0');
        const d = String(clockIn.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        let duration = 'In Progress';
        let hours = 0;
        if (clockOut) {
          const diffMs = clockOut.getTime() - clockIn.getTime();
          const h = Math.floor(diffMs / 3600000);
          const min = Math.floor((diffMs % 3600000) / 60000);
          duration = `${h}h ${min}m`;
          hours = Math.round((diffMs / 3600000) * 10) / 10;
        }

        dataMap.set(dateKey, { date: clockIn, status: 'present', duration, hours });
      });

      // Fetch approved leave requests via API (bypasses Firestore security rules)
      try {
        const { authenticatedFetch } = await import('@/lib/api-client');
        const leaveRes = await authenticatedFetch(
          `/api/leave-requests?employeeId=${employeeId}&startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`
        );
        if (leaveRes.ok) {
          const leaveRaw = await leaveRes.json();
          const leaveData: any[] = Array.isArray(leaveRaw)
            ? leaveRaw
            : Array.isArray(leaveRaw?.data)
              ? leaveRaw.data
              : [];

          leaveData
            .filter((l: any) => l.employeeId === employeeId && l.status === 'approved')
            .forEach((leave: any) => {
              const leaveStart = leave.startDate?.split('T')[0];
              const leaveEnd = leave.endDate?.split('T')[0];
              if (!leaveStart || !leaveEnd) return;

              const cur = new Date(leaveStart + 'T00:00:00');
              const end = new Date(leaveEnd + 'T00:00:00');

              while (cur <= end) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, '0');
                const d = String(cur.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${d}`;

                // Present takes precedence over leave
                if (!dataMap.has(dateKey)) {
                  const isWfh = leave.leaveType === 'wfh';
                  const isHalfDay = leave.leaveType === 'half-day';
                  dataMap.set(dateKey, {
                    date: new Date(cur),
                    status: isWfh ? 'wfh' : isHalfDay ? 'half-day' : 'approved-leave',
                    leaveType: isHalfDay ? 'half' : 'full',
                    leaveStatus: 'approved',
                  });
                }
                cur.setDate(cur.getDate() + 1);
              }
            });
        }
      } catch (leaveError) {
        console.error('Error fetching leave requests:', leaveError);
      }

      setAttendanceData(dataMap);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const getDateStatus = (date: Date): DayStatus => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > today) return { date, status: 'upcoming' };
    if (attendanceData.has(dateKey)) return attendanceData.get(dateKey)!;
    if (holidays.has(dateKey)) return { date, status: 'holiday' };
    if (date.getDay() === 0) return { date, status: 'holiday' };
    return { date, status: 'absent' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'approved-leave': return 'bg-purple-500';
      case 'unapproved-leave': return 'bg-red-500';
      case 'half-day': return 'bg-orange-500';
      case 'holiday': return 'bg-blue-500';
      case 'upcoming': return 'bg-gray-200';
      case 'wfh': return 'bg-black';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved-leave': return 'Leave';
      case 'unapproved-leave': return 'Unapproved';
      case 'half-day': return 'Half Day';
      case 'upcoming': return 'upcoming';
      case 'wfh': return 'WFH';
      default: return status;
    }
  };

  const calculateStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let present = 0, absent = 0, approvedLeave = 0, halfDay = 0, unapprovedLeave = 0, wfh = 0, holidayCount = 0, totalHours = 0;

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      const status = getDateStatus(date);

      switch (status.status) {
        case 'present':
          present++;
          totalHours += status.hours ?? 0;
          break;
        case 'absent': absent++; break;
        case 'approved-leave': approvedLeave++; break;
        case 'half-day': halfDay++; break;
        case 'unapproved-leave': unapprovedLeave++; break;
        case 'wfh': wfh++; break;
        case 'holiday': holidayCount++; break;
      }
    }
    return { present, absent, approvedLeave, halfDay, unapprovedLeave, wfh, holidays: holidayCount, totalHours };
  };

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToToday = () => setCurrentMonth(new Date());

  const stats = calculateStats();
  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[98vw] sm:w-full p-3 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 sm:mb-5 gap-2 pr-8">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {employeeName}
            </DialogTitle>
            {employeeEmail && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{employeeEmail}</p>
            )}
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Attendance Overview
            </p>
          </div>
        </div>

        {/* Month Navigation + Export */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
          <Button variant="outline" size="sm" onClick={previousMonth} className="flex items-center gap-1 text-xs sm:text-sm">
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7 sm:h-8 px-2">
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={nextMonth} className="flex items-center gap-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.present}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Absent</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.approvedLeave}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Approved Leave</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.halfDay}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Half Day</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.wfh}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">WFH</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.unapprovedLeave}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Unapproved</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-4 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.holidays}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Holidays</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 sm:p-4 rounded-lg col-span-2">
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalHours.toFixed(1)}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 min-w-[280px]">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[280px]">
                {days.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} />;

                  const status = getDateStatus(date);
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-1.5 sm:p-3 rounded-lg border ${getStatusColor(status.status)} bg-opacity-20 border-opacity-50 ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {date.getDate()}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 capitalize truncate">
                        {getStatusLabel(status.status)}
                      </div>
                      {status.status === 'present' && status.duration && status.duration !== 'In Progress' && (
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{status.duration}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-sm mt-4">
              {[
                { color: 'bg-green-500', label: 'Present' },
                { color: 'bg-red-500', label: 'Absent' },
                { color: 'bg-purple-500', label: 'Approved Leave' },
                { color: 'bg-orange-500', label: 'Half Day' },
                { color: 'bg-black', label: 'WFH' },
                { color: 'bg-red-500', label: 'Unapproved' },
                { color: 'bg-blue-500', label: 'Holiday' },
                { color: 'bg-gray-200', label: 'Upcoming' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1 sm:gap-2">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 ${color} rounded`}></div>
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
