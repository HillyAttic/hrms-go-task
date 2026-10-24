'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  /** Admins viewing somebody else's calendar can jump back to the picker. */
  onSwitchUser?: () => void;
  /**
   * Opt-in neumorphic soft-UI treatment, matching the dashboard/roster calendar.
   * Off by default so the other consumers (attendance tray, payroll slips,
   * admin salary config) keep their current flat look.
   */
  softUI?: boolean;
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
  onSwitchUser,
  softUI = false,
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

  /* Soft-UI depth tiers. Each is '' when softUI is off, and every conflicting
     utility (rounded / border / shadow) is swapped rather than appended, so the
     default render stays byte-identical to the previous markup. Shadows carry a
     single cool-grey layer only — no white highlight, which would bloom against
     the dimmed dialog backdrop. */
  const plateSoft = softUI
    ? ' border-slate-200/70 bg-white/80 shadow-[10px_10px_28px_rgba(163,177,198,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90 dark:shadow-[10px_10px_28px_rgba(0,0,0,0.6)]'
    : '';
  const btnSoft = softUI
    ? ' rounded-xl border-slate-200/80 bg-white/70 shadow-[3px_3px_7px_rgba(163,177,198,0.4)] transition-all hover:bg-white/90 active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.4)] dark:border-white/10 dark:bg-white/5 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.45)] dark:hover:bg-white/10 dark:active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]'
    : '';
  // The stats grid children are the 8 tiles; a child selector keeps them untouched.
  const tileSoft = softUI
    ? ' [&>div]:rounded-xl [&>div]:border [&>div]:border-white/80 [&>div]:shadow-[3px_3px_7px_rgba(163,177,198,0.35)] dark:[&>div]:border-white/10 dark:[&>div]:shadow-[3px_3px_7px_rgba(0,0,0,0.45)]'
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`flex max-h-[92vh] w-[98vw] max-w-4xl flex-col gap-0 overflow-hidden p-3 sm:p-4${plateSoft}`}>
        {/* Header */}
        <div className="flex shrink-0 justify-between items-start mb-2 gap-2 pr-8">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {employeeName}
            </DialogTitle>
            {employeeEmail && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{employeeEmail}</p>
            )}
            {/* Month + switch action share one row to save vertical space for the grid */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Attendance Overview
              </p>
              {onSwitchUser && (
                <button
                  type="button"
                  onClick={onSwitchUser}
                  className={`inline-flex shrink-0 items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 ${
                    softUI
                      ? 'rounded-xl shadow-[2px_2px_5px_rgba(163,177,198,0.4)] transition-all active:shadow-[inset_2px_2px_4px_rgba(163,177,198,0.45)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.45)] dark:active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]'
                      : 'rounded-md transition-colors'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Switch employee
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Month Navigation + Export */}
        <div className="flex shrink-0 items-center justify-between gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={previousMonth} className={`flex items-center gap-1 text-xs sm:text-sm${btnSoft}`}>
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="outline" size="sm" onClick={goToToday} className={`h-7 px-2 text-xs sm:h-8${btnSoft}`}>
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={nextMonth} className={`flex items-center gap-1 text-xs sm:text-sm${btnSoft}`}>
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
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Stats Grid — compact strip so the calendar below stays visible */}
            <div className={`mb-2 grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2.5${tileSoft}`}>
              <div className="bg-green-50 dark:bg-green-900/20 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-green-600">{stats.present}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Present</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-red-600">{stats.absent}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Absent</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-purple-600">{stats.approvedLeave}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Approved Leave</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-orange-600">{stats.halfDay}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Half Day</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{stats.wfh}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">WFH</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-red-600">{stats.unapprovedLeave}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Unapproved</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-blue-600">{stats.holidays}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Holidays</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-1.5 sm:p-2 rounded-lg">
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{stats.totalHours.toFixed(1)}</div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Total Hours</div>
              </div>
            </div>

            {/* Calendar — fills the remaining height. Rows keep a minimum height so the
                day / status / hours lines are never clipped; on short viewports the
                calendar area scrolls instead of squeezing the cells. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 min-w-[280px] shrink-0">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* softUI rows carry a 3-line cell (chip + status + hours), so the row
                  track has to be taller than the flat layout's 2-line cells. */}
              <div
                className={`grid min-h-0 flex-1 grid-cols-7 min-w-[280px] ${
                  softUI
                    ? 'gap-1.5 auto-rows-[minmax(4.25rem,1fr)] sm:auto-rows-[minmax(5rem,1fr)] sm:gap-2'
                    : 'gap-1 auto-rows-[minmax(3.5rem,1fr)] sm:auto-rows-[minmax(4.25rem,1fr)] sm:gap-1.5'
                }`}
              >
                {days.map((date, index) => {
                  if (!date)
                    return softUI ? (
                      /* Out-of-month slot: recessed tray slot rather than blank */
                      <div
                        key={`empty-${index}`}
                        className="rounded-xl border border-slate-200/70 bg-gray-100/70 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.22)] dark:border-white/10 dark:bg-black/20 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28)]"
                      />
                    ) : (
                      <div key={`empty-${index}`} />
                    );

                  const status = getDateStatus(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const todayRing = isToday ? 'ring-2 ring-inset ring-blue-500' : '';
                  // Recessed tray look: every slot sits sunken at rest and pops out on
                  // hover. Today stays pushed forward so it reads without the ring alone.
                  // One tier per state so the shadow layers never fight each other.
                  const depthClass = !softUI
                    ? ''
                    : isToday
                      ? 'shadow-[5px_5px_12px_rgba(163,177,198,0.45)] hover:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.22)] dark:shadow-[5px_5px_12px_rgba(0,0,0,0.55)] dark:hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28)]'
                      : 'shadow-[inset_2px_2px_5px_rgba(163,177,198,0.22)] hover:shadow-[4px_4px_10px_rgba(163,177,198,0.35)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28)] dark:hover:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]';

                  return (
                    <div
                      key={date.toISOString()}
                      className={
                        softUI
                          ? `overflow-hidden rounded-xl border border-slate-200/80 p-1 transition-shadow duration-200 sm:p-1.5 ${getStatusColor(status.status)} bg-opacity-20 dark:border-white/10 ${depthClass} ${todayRing}`
                          : `overflow-hidden p-1 sm:p-1.5 rounded-lg border ${getStatusColor(status.status)} bg-opacity-20 border-opacity-50 ${todayRing}`
                      }
                    >
                      {softUI ? (
                        /* Day number as a soft-UI chip; today carries the brand gradient */
                        <div
                          className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:text-xs ${
                            isToday
                              ? 'bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] text-white shadow-[0_4px_10px_-2px_rgba(4,71,253,0.5)]'
                              : 'bg-white/85 text-gray-900 shadow-[2px_2px_5px_rgba(163,177,198,0.5)] dark:bg-white/10 dark:text-white dark:shadow-[2px_2px_5px_rgba(0,0,0,0.45)]'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      ) : (
                        <div className="text-[11px] sm:text-sm font-medium text-gray-900 dark:text-white">
                          {date.getDate()}
                        </div>
                      )}
                      <div className={`text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 capitalize truncate${softUI ? ' pl-0.5' : ''}`}
                      >
                        {getStatusLabel(status.status)}
                      </div>
                      {status.status === 'present' && status.duration && status.duration !== 'In Progress' && (
                        <div className={`text-[10px] sm:text-xs text-gray-600 dark:text-gray-400${softUI ? ' pl-0.5' : ''}`}>{status.duration}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-sm mt-2">
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
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 ${color} ${softUI ? 'rounded-md shadow-[1px_1px_3px_rgba(163,177,198,0.5)] dark:shadow-[1px_1px_3px_rgba(0,0,0,0.5)]' : 'rounded'}`}></div>
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
