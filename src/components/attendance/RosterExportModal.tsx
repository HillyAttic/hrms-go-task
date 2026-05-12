'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, Loader2, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

interface AttendanceDay {
  date: Date;
  status: 'present' | 'absent' | 'approved-leave' | 'unapproved-leave' | 'half-day' | 'holiday' | 'pending';
  hours?: number;
  leaveType?: string; // e.g., 'sick', 'casual', 'vacation', 'emergency'
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
    holiday: number;
    totalHours: number;
  };
}

interface RosterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeAttendance[];
  month: number;
  year: number;
}

interface DetailRow {
  employeeName: string;
  employeeEmail: string;
  date: string;
  day: string;
  status: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number | string;
  clockInLocation: string;
  clockOutLocation: string;
  leaveType: string;
  leaveStatus: string;
  leaveReason: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function statusLabel(status: string): string {
  switch (status) {
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'approved-leave': return 'Approved Leave';
    case 'unapproved-leave': return 'Unapproved Leave';
    case 'half-day': return 'Half Day';
    case 'holiday': return 'Holiday/Sunday';
    case 'pending': return 'Pending';
    default: return status;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Direct browser → Nominatim reverse geocoding
// ──────────────────────────────────────────────────────────────────────────
const geocodeCache = new Map<string, string>();

async function reverseGeocodeOne(lat: number, lon: number): Promise<string> {
  const cacheKey = `${lat},${lon}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`;
  console.log(`[Geocode] Fetching: ${url}`);

  const res = await fetch(url);
  console.log(`[Geocode] Response status: ${res.status}`);

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Geocode] Error response: ${errText}`);
    throw new Error(`Nominatim returned HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = await res.json();
  console.log(`[Geocode] Result for ${lat},${lon}: ${data.display_name?.slice(0, 60)}...`);

  const address = data.display_name || `${lat}, ${lon}`;
  geocodeCache.set(cacheKey, address);
  return address;
}

function delayMs(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function RosterExportModal({
  isOpen,
  onClose,
  employees,
  month,
  year,
}: RosterExportModalProps) {
  const { isAdmin, claims } = useEnhancedAuth();

  const defaultStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const defaultEnd = (() => {
    const last = new Date(year, month + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  })();

  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [includeStats, setIncludeStats] = useState(false);
  const [excludeAdmins, setExcludeAdmins] = useState(true);
  const [excludeManagers, setExcludeManagers] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedMonth(month);
      setSelectedYear(year);
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      setProgressMsg('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, month, year]);

  // Update date range when month/year selectors change
  React.useEffect(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    
    const newStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const newEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    setStartDate(newStart);
    setEndDate(newEnd);
  }, [selectedMonth, selectedYear]);

  // ═══════════════════════════════════════════════════════════════════════
  // Build employee attendance data for the selected date range
  // ═══════════════════════════════════════════════════════════════════════
  const buildEmployeeAttendanceData = async (): Promise<EmployeeAttendance[]> => {
    const { authenticatedFetch } = await import('@/lib/api-client');

    setProgressMsg('Fetching employee data...');

    // Parse dates in local timezone
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const startD = new Date(startYear, startMonth - 1, startDay);
    startD.setHours(0, 0, 0, 0);

    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const endD = new Date(endYear, endMonth - 1, endDay);
    endD.setHours(23, 59, 59, 999);

    // Fetch all required data in parallel
    const [employeesRes, attRes, leaveRes, holidaysRes] = await Promise.all([
      authenticatedFetch('/api/employees'),
      authenticatedFetch(`/api/attendance/records?startDate=${startD.toISOString()}&endDate=${endD.toISOString()}`),
      authenticatedFetch(`/api/leave-requests?startDate=${startD.toISOString()}&endDate=${endD.toISOString()}&includeAll=true`),
      authenticatedFetch('/api/holidays'),
    ]);

    const employeesRaw = employeesRes.ok ? await employeesRes.json() : [];
    const attRaw = attRes.ok ? await attRes.json() : [];
    const leaveRaw = leaveRes.ok ? await leaveRes.json() : [];
    const holidaysRaw = holidaysRes.ok ? await holidaysRes.json() : [];

    const allEmployees: any[] = Array.isArray(employeesRaw) ? employeesRaw : employeesRaw?.data ?? [];
    const attRecords: any[] = Array.isArray(attRaw) ? attRaw : attRaw?.data ?? [];
    const leaveRecords: any[] = Array.isArray(leaveRaw) ? leaveRaw : leaveRaw?.data ?? [];
    const holidays: any[] = Array.isArray(holidaysRaw) ? holidaysRaw : holidaysRaw?.data ?? [];

    console.log(`[buildEmployeeAttendanceData] Fetched ${allEmployees.length} employees, ${attRecords.length} attendance records, ${leaveRecords.length} leave records`);

    // Filter employees based on role exclusions
    const filteredEmployees = allEmployees.filter(emp => {
      if (excludeAdmins && emp.role?.toLowerCase() === 'admin') return false;
      if (excludeManagers && emp.role?.toLowerCase() === 'manager') return false;
      return true;
    });

    console.log(`[buildEmployeeAttendanceData] After role filtering: ${filteredEmployees.length} employees`);

    setProgressMsg('Building attendance data...');

    // Build lookups
    const attMap = new Map<string, Map<string, any>>();
    attRecords.forEach((rec) => {
      const dateStr = new Date(rec.clockIn).toISOString().split('T')[0];
      if (!attMap.has(rec.employeeId)) attMap.set(rec.employeeId, new Map());
      attMap.get(rec.employeeId)!.set(dateStr, rec);
    });

    const leaveMap = new Map<string, any[]>();
    leaveRecords.forEach((lr) => {
      if (!leaveMap.has(lr.employeeId)) leaveMap.set(lr.employeeId, []);
      leaveMap.get(lr.employeeId)!.push(lr);
    });

    // Build holiday set (YYYY-MM-DD format)
    const holidaySet = new Set<string>();
    holidays.forEach((h) => {
      const hDate = new Date(h.date);
      const dateStr = `${hDate.getFullYear()}-${String(hDate.getMonth() + 1).padStart(2, '0')}-${String(hDate.getDate()).padStart(2, '0')}`;
      holidaySet.add(dateStr);
    });

    // Build employee attendance data
    const employeeAttendanceData: EmployeeAttendance[] = filteredEmployees.map((emp) => {
      const days: AttendanceDay[] = [];
      const stats = {
        present: 0,
        absent: 0,
        approvedLeave: 0,
        unapprovedLeave: 0,
        halfDay: 0,
        holiday: 0,
        totalHours: 0,
      };

      // Iterate through each day in the date range
      const currentDate = new Date(startD);
      while (currentDate <= endD) {
        const dateYear = currentDate.getFullYear();
        const dateMon = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dateDay = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${dateYear}-${dateMon}-${dateDay}`;

        const dayOfWeek = currentDate.getDay();
        const isSunday = dayOfWeek === 0;
        const isHoliday = holidaySet.has(dateStr);

        const attRecord = attMap.get(emp.id)?.get(dateStr);
        const leaves = leaveMap.get(emp.id) ?? [];
        const matchedLeave = leaves.find((l) => {
          const ls = l.startDate.split('T')[0];
          const le = l.endDate.split('T')[0];
          return ls <= dateStr && le >= dateStr;
        });

        let status: AttendanceDay['status'] = 'pending';
        let hours = 0;
        let leaveType: string | undefined;
        let leaveStatus: 'approved' | 'pending' | 'rejected' | undefined;

        if (isSunday || isHoliday) {
          status = 'holiday';
          stats.holiday++;
        } else if (matchedLeave) {
          if (matchedLeave.status === 'approved') {
            status = 'approved-leave';
            stats.approvedLeave++;
          } else if (matchedLeave.status === 'rejected') {
            status = 'absent';
            stats.absent++;
          } else {
            status = 'unapproved-leave';
            stats.unapprovedLeave++;
          }
          leaveType = matchedLeave.leaveType;
          leaveStatus = matchedLeave.status;
        } else if (attRecord) {
          if (attRecord.clockOut) {
            const clockInTime = new Date(attRecord.clockIn).getTime();
            const clockOutTime = new Date(attRecord.clockOut).getTime();
            hours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
            stats.totalHours += hours;

            if (hours >= 4) {
              status = 'present';
              stats.present++;
            } else {
              status = 'half-day';
              stats.halfDay++;
            }
          } else {
            // Clocked in but not out - check if it's today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recordDate = new Date(currentDate);
            recordDate.setHours(0, 0, 0, 0);

            if (recordDate.getTime() === today.getTime()) {
              status = 'present';
              stats.present++;
            } else {
              status = 'absent';
              stats.absent++;
            }
          }
        } else {
          // No attendance record and not a holiday/leave
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const recordDate = new Date(currentDate);
          recordDate.setHours(0, 0, 0, 0);

          if (recordDate < today) {
            status = 'absent';
            stats.absent++;
          } else {
            status = 'pending';
          }
        }

        days.push({
          date: new Date(currentDate),
          status,
          hours,
          leaveType,
          leaveStatus,
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        employeeId: emp.id,
        employeeName: emp.name || emp.displayName || emp.email,
        employeeEmail: emp.email,
        role: emp.role,
        days,
        stats,
      };
    });

    console.log(`[buildEmployeeAttendanceData] Built attendance data for ${employeeAttendanceData.length} employees`);
    return employeeAttendanceData;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Shared data builder — used by both Excel and PDF exports
  // ═══════════════════════════════════════════════════════════════════════
  const buildExportData = async (): Promise<{ detailRows: DetailRow[]; geocodeErrors: number }> => {
    const { authenticatedFetch } = await import('@/lib/api-client');

    console.log('[Export Debug] Starting buildExportData');

    // Build fresh employee attendance data for the selected date range
    const employeeAttendanceData = await buildEmployeeAttendanceData();

    console.log('[Export Debug] Built employee attendance data:', employeeAttendanceData.length, 'employees');

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch attendance and leave records for geocoding and detail lookup
    const [attRes, leaveRes] = await Promise.all([
      authenticatedFetch(`/api/attendance/records?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
      authenticatedFetch(`/api/leave-requests?startDate=${start.toISOString()}&endDate=${end.toISOString()}&includeAll=true`),
    ]);

    const attRaw = attRes.ok ? await attRes.json() : [];
    const leaveRaw = leaveRes.ok ? await leaveRes.json() : [];
    const attRecords: any[] = Array.isArray(attRaw) ? attRaw : attRaw?.data ?? [];
    const leaveRecords: any[] = Array.isArray(leaveRaw) ? leaveRaw : leaveRaw?.data ?? [];

    console.log(`[Export] ${attRecords.length} attendance records, ${leaveRecords.length} leave records`);

    // Build lookups
    const attMap = new Map<string, Map<string, any>>();
    attRecords.forEach((rec) => {
      const dateStr = new Date(rec.clockIn).toISOString().split('T')[0];
      if (!attMap.has(rec.employeeId)) attMap.set(rec.employeeId, new Map());
      attMap.get(rec.employeeId)!.set(dateStr, rec);
    });

    const leaveMap = new Map<string, any[]>();
    leaveRecords.forEach((lr) => {
      if (!leaveMap.has(lr.employeeId)) leaveMap.set(lr.employeeId, []);
      leaveMap.get(lr.employeeId)!.push(lr);
    });

    // Geocoding
    const uniqueCoords = new Map<string, { lat: number; lon: number }>();
    if (includeLocation) {
      attRecords.forEach((rec) => {
        const ciLat = rec?.location?.clockIn?.latitude;
        const ciLon = rec?.location?.clockIn?.longitude;
        if (ciLat != null && ciLon != null) {
          uniqueCoords.set(`${Number(ciLat)},${Number(ciLon)}`, { lat: Number(ciLat), lon: Number(ciLon) });
        }
        const coLat = rec?.location?.clockOut?.latitude;
        const coLon = rec?.location?.clockOut?.longitude;
        if (coLat != null && coLon != null) {
          uniqueCoords.set(`${Number(coLat)},${Number(coLon)}`, { lat: Number(coLat), lon: Number(coLon) });
        }
      });
    }

    console.log(`[Export] Found ${uniqueCoords.size} unique coordinates to geocode`);

    let geocodeErrors = 0;
    if (uniqueCoords.size > 0) {
      const coordList = [...uniqueCoords.entries()];
      for (let i = 0; i < coordList.length; i++) {
        const [key, { lat, lon }] = coordList[i];
        setProgressMsg(`Resolving address ${i + 1} of ${coordList.length}...`);

        if (geocodeCache.has(key)) {
          console.log(`[Geocode] Cache hit for ${key}`);
          continue;
        }

        try {
          await reverseGeocodeOne(lat, lon);
        } catch (err: any) {
          console.error(`[Geocode] FAILED for ${key}:`, err.message);
          geocodeErrors++;
          geocodeCache.set(key, `${lat}, ${lon}`);
        }

        if (i < coordList.length - 1) {
          await delayMs(1100);
        }
      }
    }

    console.log(`[Export] Geocode cache now has ${geocodeCache.size} entries`);

    const getAddress = (rec: any, field: 'clockIn' | 'clockOut'): string => {
      const loc = rec?.location?.[field];
      if (!loc || loc.latitude == null || loc.longitude == null) return '';
      const key = `${Number(loc.latitude)},${Number(loc.longitude)}`;
      return geocodeCache.get(key) || `${loc.latitude}, ${loc.longitude}`;
    };

    // Build rows from the employee attendance data
    const detailRows: DetailRow[] = [];
    for (const emp of employeeAttendanceData) {
      for (const day of emp.days) {
        const d = day.date;
        const dateYear = d.getFullYear();
        const dateMon = String(d.getMonth() + 1).padStart(2, '0');
        const dateDay = String(d.getDate()).padStart(2, '0');
        const dateStr = `${dateYear}-${dateMon}-${dateDay}`;

        const rec = attMap.get(emp.employeeId)?.get(dateStr);
        const leaves = leaveMap.get(emp.employeeId) ?? [];
        const matchedLeave = leaves.find((l) => {
          const ls = l.startDate.split('T')[0];
          const le = l.endDate.split('T')[0];
          return ls <= dateStr && le >= dateStr;
        });

        const clockInTime = rec?.clockIn
          ? new Date(rec.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
          : '';
        const clockOutTime = rec?.clockOut
          ? new Date(rec.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
          : day.status === 'present' ? 'Not clocked out' : '';

        detailRows.push({
          employeeName: emp.employeeName,
          employeeEmail: emp.employeeEmail,
          date: `${dateDay}/${dateMon}/${dateYear}`,
          day: DAY_NAMES[d.getDay()],
          status: statusLabel(day.status),
          clockIn: clockInTime,
          clockOut: clockOutTime,
          hoursWorked: day.hours && day.hours > 0 ? Number(day.hours.toFixed(2)) : '',
          clockInLocation: includeLocation && rec ? getAddress(rec, 'clockIn') : '',
          clockOutLocation: includeLocation && rec ? getAddress(rec, 'clockOut') : '',
          leaveType: matchedLeave?.leaveType ?? '',
          leaveStatus: matchedLeave?.status ?? '',
          leaveReason: matchedLeave?.reason ?? '',
        });
      }
    }

    return { detailRows, geocodeErrors };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Excel export
  // ═══════════════════════════════════════════════════════════════════════
  const exportExcel = (detailRows: DetailRow[], employeeData: EmployeeAttendance[]) => {
    const sheetRows = detailRows.map((r) => {
      const row: any = {
        'Employee Name': r.employeeName,
        'Employee Email': r.employeeEmail,
        'Date': r.date,
        'Day': r.day,
        'Status': r.status,
        'Clock In': r.clockIn,
        'Clock Out': r.clockOut,
        'Hours Worked': r.hoursWorked,
      };
      if (includeLocation) {
        row['Clock In Location'] = r.clockInLocation;
        row['Clock Out Location'] = r.clockOutLocation;
      }
      row['Leave Type'] = r.leaveType;
      row['Leave Status'] = r.leaveStatus;
      row['Leave Reason'] = r.leaveReason;
      return row;
    });

    const wb = XLSX.utils.book_new();

    const wsDetail = XLSX.utils.json_to_sheet(sheetRows);
    const detailCols: XLSX.ColInfo[] = [
      { wch: 22 }, { wch: 26 }, { wch: 12 }, { wch: 5 },
      { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 13 },
    ];
    if (includeLocation) {
      detailCols.push({ wch: 55 }, { wch: 55 });
    }
    detailCols.push({ wch: 14 }, { wch: 14 }, { wch: 30 });
    wsDetail['!cols'] = detailCols;
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Daily Attendance');

    if (includeStats) {
      const summaryRows = employeeData.map((emp) => {
        return {
          'Employee Name': emp.employeeName,
          'Employee Email': emp.employeeEmail,
          'Present': emp.stats.present,
          'Absent': emp.stats.absent,
          'Approved Leave': emp.stats.approvedLeave,
          'Unapproved Leave': emp.stats.unapprovedLeave,
          'Half Day': emp.stats.halfDay,
          'Holiday/Sunday': emp.stats.holiday,
          'Total Hours': Number(emp.stats.totalHours.toFixed(2)),
        };
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [
        { wch: 22 }, { wch: 26 }, { wch: 9 }, { wch: 8 },
        { wch: 15 }, { wch: 17 }, { wch: 10 }, { wch: 16 }, { wch: 13 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    }

    const period = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
    XLSX.writeFile(wb, `Attendance_Roster_${period}.xlsx`);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PDF export
  // ═══════════════════════════════════════════════════════════════════════
  const exportPdf = async (detailRows: DetailRow[], employeeData: EmployeeAttendance[]) => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Title
    doc.setFontSize(16);
    doc.text('Attendance Roster Report', 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const formattedStart = new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedEnd = new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Period: ${formattedStart} — ${formattedEnd}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 14, 27);
    doc.text(`Employees: ${employeeData.length}`, 14, 32);
    doc.setTextColor(0);

    // Detail table
    const headers = ['Employee', 'Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Hours'];
    if (includeLocation) {
      headers.push('Clock In Location', 'Clock Out Location');
    }
    headers.push('Leave Type', 'Leave Status');

    const body = detailRows.map((r) => {
      const row = [r.employeeName, r.date, r.day, r.status, r.clockIn, r.clockOut, String(r.hoursWorked)];
      if (includeLocation) {
        row.push(r.clockInLocation, r.clockOutLocation);
      }
      row.push(r.leaveType, r.leaveStatus);
      return row;
    });

    const colStyles: Record<number, any> = {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      2: { cellWidth: 12 },
      3: { cellWidth: 25 },
      4: { cellWidth: 18 },
      5: { cellWidth: 22 },
      6: { cellWidth: 14 },
    };

    if (includeLocation) {
      colStyles[7] = { cellWidth: 50 };
      colStyles[8] = { cellWidth: 50 };
      colStyles[9] = { cellWidth: 18 };
      colStyles[10] = { cellWidth: 18 };
    } else {
      colStyles[7] = { cellWidth: 18 };
      colStyles[8] = { cellWidth: 18 };
    }

    autoTable(doc, {
      startY: 37,
      head: [headers],
      body,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
      columnStyles: colStyles,
      didParseCell: (data: any) => {
        // Color-code status column
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw;
          if (val === 'Present') data.cell.styles.textColor = [22, 163, 74];
          else if (val === 'Absent') data.cell.styles.textColor = [220, 38, 38];
          else if (val === 'Approved Leave') data.cell.styles.textColor = [147, 51, 234];
          else if (val === 'Holiday/Sunday') data.cell.styles.textColor = [37, 99, 235];
          else if (val === 'Half Day') data.cell.styles.textColor = [234, 88, 12];
        }
      },
    });

    // Summary page (optional)
    if (includeStats) {
      doc.addPage('landscape');
      doc.setFontSize(14);
      doc.text('Attendance Summary', 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${formattedStart} — ${formattedEnd}`, 14, 22);
      doc.setTextColor(0);

      const summaryHeaders = ['Employee', 'Email', 'Present', 'Absent', 'Approved Leave', 'Unapproved Leave', 'Half Day', 'Holiday', 'Total Hours'];
      const summaryBody = employeeData.map((emp) => {
        return [
          emp.employeeName, emp.employeeEmail,
          String(emp.stats.present), String(emp.stats.absent), String(emp.stats.approvedLeave),
          String(emp.stats.unapprovedLeave), String(emp.stats.halfDay), String(emp.stats.holiday),
          emp.stats.totalHours.toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: 27,
        head: [summaryHeaders],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 28 },
          5: { cellWidth: 30 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 22 },
        },
      });
    }

    const period = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
    doc.save(`Attendance_Roster_${period}.pdf`);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Main export handler
  // ═══════════════════════════════════════════════════════════════════════
  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before end date');
      return;
    }

    setExporting(true);
    setProgressMsg('Fetching attendance records...');

    try {
      const { detailRows, geocodeErrors } = await buildExportData();

      // Get the employee data that was built during buildExportData
      const employeeData = await buildEmployeeAttendanceData();

      setProgressMsg(`Building ${exportFormat === 'excel' ? 'Excel' : 'PDF'} file...`);

      if (exportFormat === 'excel') {
        exportExcel(detailRows, employeeData);
      } else {
        await exportPdf(detailRows, employeeData);
      }

      if (geocodeErrors > 0) {
        alert(`Export done! Note: ${geocodeErrors} location(s) could not be resolved to addresses — check browser console (F12) for details.`);
      }

      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
      setProgressMsg('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Attendance Roster
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Month and Year Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Select Period</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="export-month" className="text-xs">Month</Label>
                <select
                  id="export-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="0">January</option>
                  <option value="1">February</option>
                  <option value="2">March</option>
                  <option value="3">April</option>
                  <option value="4">May</option>
                  <option value="5">June</option>
                  <option value="6">July</option>
                  <option value="7">August</option>
                  <option value="8">September</option>
                  <option value="9">October</option>
                  <option value="10">November</option>
                  <option value="11">December</option>
                </select>
              </div>
              <div>
                <Label htmlFor="export-year" className="text-xs">Year</Label>
                <select
                  id="export-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Custom Date Range (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="export-start" className="text-xs">Start Date</Label>
                <input
                  id="export-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="export-end" className="text-xs">End Date</Label>
                <input
                  id="export-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Format</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => setExportFormat('excel')}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 rounded-lg transition-all ${
                  exportFormat === 'excel'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
                }`}
              >
                <FileSpreadsheet className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${exportFormat === 'excel' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Excel</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">.xlsx</div>
                </div>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 rounded-lg transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
                }`}
              >
                <FileText className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${exportFormat === 'pdf' ? 'text-red-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">PDF</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">.pdf</div>
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Options</p>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Include clock-in / clock-out location (full address)</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStats}
                  onChange={(e) => setIncludeStats(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Include summary {exportFormat === 'excel' ? 'sheet' : 'page'} (per-employee totals)
                </span>
              </label>
              {claims?.role === 'admin' && (
                <>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeAdmins}
                      onChange={(e) => setExcludeAdmins(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-blue-600 rounded flex-shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Exclude Admins from export</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeManagers}
                      onChange={(e) => setExcludeManagers(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-blue-600 rounded flex-shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Exclude Managers from export</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium text-xs sm:text-sm">Export includes:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] sm:text-xs pl-1">
              <li>Daily status, clock-in/out times (IST), hours worked</li>
              {includeLocation && <li>Full address for clock-in/out locations</li>}
              <li>Leave type, status, and reason</li>
              {includeStats && <li>Summary {exportFormat === 'excel' ? 'sheet' : 'page'} with per-employee totals</li>}
            </ul>
            {includeLocation && (
              <p className="text-[11px] sm:text-xs mt-2 text-orange-600 dark:text-orange-400">
                Address lookup uses OpenStreetMap (~1 sec per unique location). Previously resolved locations are cached.
              </p>
            )}
          </div>

          {/* Progress */}
          {exporting && progressMsg && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-blue-600" />
              <span className="break-words">{progressMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={exporting}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className={`w-full sm:w-auto order-1 sm:order-2 text-white ${
              exportFormat === 'excel'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                <span className="text-sm">Export {exportFormat === 'excel' ? 'Excel' : 'PDF'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
