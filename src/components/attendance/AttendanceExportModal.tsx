'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, Loader2, Calendar, Users } from 'lucide-react';
import { employeeService } from '@/services/employee.service';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as XLSX from 'xlsx';

interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Admin' | 'Employee';
  status: 'active' | 'on-leave' | 'resigned';
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  clockIn: Date;
  clockOut?: Date;
  location?: {
    clockIn?: { latitude: number; longitude: number };
    clockOut?: { latitude: number; longitude: number };
  };
  totalHours: number;
  status: 'active' | 'completed' | 'incomplete';
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

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedEmployeeId?: string;
  preSelectedStartDate?: Date;
  preSelectedEndDate?: Date;
  assignedEmployeeIds?: string[];
  isManager?: boolean;
  isAdmin?: boolean;
}

export function AttendanceExportModal({
  isOpen,
  onClose,
  preSelectedEmployeeId,
  preSelectedStartDate,
  preSelectedEndDate,
  assignedEmployeeIds,
  isManager,
  isAdmin
}: AttendanceExportModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [includeStats, setIncludeStats] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Update date range when month/year selectors change
  React.useEffect(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    
    const newStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    const newEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    setStartDate(newStart);
    setEndDate(newEnd);
  }, [selectedMonth, selectedYear]);

  // Day names and status labels
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const statusLabel = (status: string): string => {
    if (status === 'completed') return 'Completed';
    if (status === 'active') return 'Active';
    if (status === 'incomplete') return 'Incomplete';
    return status;
  };

  // Geocoding cache and functions
  const geocodeCache = new Map<string, string>();

  const reverseGeocodeOne = async (lat: number, lon: number): Promise<string> => {
    const cacheKey = `${lat},${lon}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Nominatim returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const address = data.display_name || `${lat}, ${lon}`;
      geocodeCache.set(cacheKey, address);
      return address;
    } catch (error) {
      console.error(`[Geocode] Error for ${lat},${lon}:`, error);
      const fallback = `${lat}, ${lon}`;
      geocodeCache.set(cacheKey, fallback);
      return fallback;
    }
  };

  const delayMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      try {
        const allEmployees = await employeeService.getAll();
        let activeEmployees = allEmployees.filter(emp => emp.status === 'active');

        // Filter to assigned employees only for managers
        if (isManager && !isAdmin && assignedEmployeeIds && assignedEmployeeIds.length > 0) {
          activeEmployees = activeEmployees.filter(emp => emp.id && assignedEmployeeIds.includes(emp.id));
        } else if (isManager && !isAdmin) {
          activeEmployees = [];
        }

        // Sort employees: pre-selected first, then alphabetically
        if (preSelectedEmployeeId) {
          const sortedEmployees = activeEmployees.sort((a, b) => {
            if (a.id === preSelectedEmployeeId) return -1;
            if (b.id === preSelectedEmployeeId) return 1;
            return a.name.localeCompare(b.name);
          });
          setEmployees(sortedEmployees);
        } else {
          setEmployees(activeEmployees.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadEmployees();
      
      // Set default dates based on pre-selected or current month
      if (preSelectedStartDate && preSelectedEndDate) {
        const preStartMonth = preSelectedStartDate.getMonth();
        const preStartYear = preSelectedStartDate.getFullYear();
        setSelectedMonth(preStartMonth);
        setSelectedYear(preStartYear);
        setStartDate(preSelectedStartDate.toISOString().split('T')[0]);
        setEndDate(preSelectedEndDate.toISOString().split('T')[0]);
      } else {
        // Default to current month
        const now = new Date();
        setSelectedMonth(now.getMonth());
        setSelectedYear(now.getFullYear());
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
      }
      
      // Pre-select employee if provided
      if (preSelectedEmployeeId) {
        setSelectedEmployees([preSelectedEmployeeId]);
        setSelectAll(false);
      } else {
        setSelectedEmployees([]);
        setSelectAll(false);
      }
      
      // Reset search query
      setSearchQuery('');
    }
  }, [isOpen, preSelectedEmployeeId, preSelectedStartDate, preSelectedEndDate, isManager, isAdmin, assignedEmployeeIds]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id!));
    }
    setSelectAll(!selectAll);
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle individual employee selection
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Convert Firestore timestamp to Date
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
      console.error('Error converting timestamp:', error);
      return undefined;
    }
  };

  // Fetch attendance records and build detail rows
  const buildExportData = async (): Promise<{ detailRows: DetailRow[]; geocodeErrors: number }> => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const records: AttendanceRecord[] = [];
    const employeeMap = new Map<string, Employee>();

    // Build employee map
    employees.forEach(emp => {
      if (emp.id) employeeMap.set(emp.id, emp);
    });

    // Fetch attendance records for selected employees
    for (const employeeId of selectedEmployees) {
      const q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', employeeId),
        where('clockIn', '>=', Timestamp.fromDate(start)),
        where('clockIn', '<=', Timestamp.fromDate(end)),
        orderBy('clockIn', 'asc')
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const emp = employeeMap.get(employeeId);
        records.push({
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          employeeEmail: emp?.email || '',
          clockIn: convertTimestamp(data.clockIn)!,
          clockOut: convertTimestamp(data.clockOut),
          location: data.location,
          totalHours: data.totalHours || 0,
          status: data.status || 'completed',
        });
      });
    }

    // Sort by date ascending
    records.sort((a, b) => a.clockIn.getTime() - b.clockIn.getTime());

    // Fetch leave requests
    const leaveRecords: any[] = [];
    for (const employeeId of selectedEmployees) {
      const leaveQuery = query(
        collection(db, 'leave-requests'),
        where('employeeId', '==', employeeId)
      );
      const leaveSnapshot = await getDocs(leaveQuery);
      leaveSnapshot.docs.forEach(doc => {
        leaveRecords.push({ id: doc.id, ...doc.data() });
      });
    }

    // Build leave map
    const leaveMap = new Map<string, any[]>();
    leaveRecords.forEach((lr) => {
      if (!leaveMap.has(lr.employeeId)) leaveMap.set(lr.employeeId, []);
      leaveMap.get(lr.employeeId)!.push(lr);
    });

    // Geocoding
    const uniqueCoords = new Map<string, { lat: number; lon: number }>();
    if (includeLocation) {
      records.forEach((rec) => {
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

    let geocodeErrors = 0;
    if (uniqueCoords.size > 0) {
      const coordList = [...uniqueCoords.entries()];
      for (let i = 0; i < coordList.length; i++) {
        const [key, { lat, lon }] = coordList[i];
        setProgressMsg(`Resolving address ${i + 1} of ${coordList.length}…`);

        if (geocodeCache.has(key)) {
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

    const getAddress = (rec: AttendanceRecord, field: 'clockIn' | 'clockOut'): string => {
      const loc = rec?.location?.[field];
      if (!loc || loc.latitude == null || loc.longitude == null) return '';
      const key = `${Number(loc.latitude)},${Number(loc.longitude)}`;
      return geocodeCache.get(key) || `${loc.latitude}, ${loc.longitude}`;
    };

    // Build detail rows
    const detailRows: DetailRow[] = records.map(rec => {
      const d = rec.clockIn;
      const dateYear = d.getFullYear();
      const dateMon = String(d.getMonth() + 1).padStart(2, '0');
      const dateDay = String(d.getDate()).padStart(2, '0');
      const dateStr = `${dateYear}-${dateMon}-${dateDay}`;

      const leaves = leaveMap.get(rec.employeeId) ?? [];
      const matchedLeave = leaves.find((l) => {
        const ls = l.startDate.split('T')[0];
        const le = l.endDate.split('T')[0];
        return ls <= dateStr && le >= dateStr;
      });

      const clockInTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      const clockOutTime = rec.clockOut
        ? rec.clockOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
        : '';

      const hoursWorked = rec.clockOut ? calculateDuration(rec.clockIn, rec.clockOut) : '';

      return {
        employeeName: rec.employeeName,
        employeeEmail: rec.employeeEmail || '',
        date: `${dateDay}/${dateMon}/${dateYear}`,
        day: DAY_NAMES[d.getDay()],
        status: statusLabel(rec.status),
        clockIn: clockInTime,
        clockOut: clockOutTime || (rec.status === 'active' ? 'Not clocked out' : ''),
        hoursWorked: hoursWorked,
        clockInLocation: includeLocation ? getAddress(rec, 'clockIn') : '',
        clockOutLocation: includeLocation ? getAddress(rec, 'clockOut') : '',
        leaveType: matchedLeave?.leaveType ?? '',
        leaveStatus: matchedLeave?.status ?? '',
        leaveReason: matchedLeave?.reason ?? '',
      };
    });

    return { detailRows, geocodeErrors };
  };

  // Calculate duration
  const calculateDuration = (clockIn: Date, clockOut?: Date): string => {
    if (!clockOut) return '';
    
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  };

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true);
    setProgressMsg('Fetching attendance records…');

    try {
      const { detailRows, geocodeErrors } = await buildExportData();

      setProgressMsg('Building Excel file…');

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
        // Build summary by employee
        const employeeSummary = new Map<string, any>();
        
        detailRows.forEach(row => {
          if (!employeeSummary.has(row.employeeName)) {
            employeeSummary.set(row.employeeName, {
              name: row.employeeName,
              email: row.employeeEmail,
              present: 0,
              absent: 0,
              active: 0,
              completed: 0,
              totalRecords: 0,
            });
          }
          
          const summary = employeeSummary.get(row.employeeName);
          summary.totalRecords++;
          
          if (row.status === 'Completed') summary.completed++;
          else if (row.status === 'Active') summary.active++;
        });

        const summaryRows = Array.from(employeeSummary.values()).map(s => ({
          'Employee Name': s.name,
          'Employee Email': s.email,
          'Total Records': s.totalRecords,
          'Completed': s.completed,
          'Active': s.active,
        }));

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        wsSummary['!cols'] = [
          { wch: 22 }, { wch: 26 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      }

      const period = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
      XLSX.writeFile(wb, `Attendance_Records_${period}.xlsx`);

      if (geocodeErrors > 0) {
        alert(`Export done! Note: ${geocodeErrors} location(s) could not be resolved to addresses.`);
      }

      onClose();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
      setProgressMsg('');
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true);
    setProgressMsg('Fetching attendance records…');

    try {
      const { detailRows, geocodeErrors } = await buildExportData();

      setProgressMsg('Building PDF file…');

      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF('landscape', 'mm', 'a4');

      // Title
      doc.setFontSize(16);
      doc.text('Attendance Records Report', 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const formattedStart = new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const formattedEnd = new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.text(`Period: ${formattedStart} — ${formattedEnd}`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 14, 27);
      doc.text(`Employees: ${selectedEmployees.length}`, 14, 32);
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
            if (val === 'Completed') data.cell.styles.textColor = [22, 163, 74];
            else if (val === 'Active') data.cell.styles.textColor = [37, 99, 235];
            else if (val === 'Incomplete') data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      if (includeStats) {
        doc.addPage('landscape');
        doc.setFontSize(14);
        doc.text('Attendance Summary', 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${formattedStart} — ${formattedEnd}`, 14, 22);
        doc.setTextColor(0);

        // Build summary
        const employeeSummary = new Map<string, any>();
        
        detailRows.forEach(row => {
          if (!employeeSummary.has(row.employeeName)) {
            employeeSummary.set(row.employeeName, {
              name: row.employeeName,
              email: row.employeeEmail,
              totalRecords: 0,
              completed: 0,
              active: 0,
            });
          }
          
          const summary = employeeSummary.get(row.employeeName);
          summary.totalRecords++;
          
          if (row.status === 'Completed') summary.completed++;
          else if (row.status === 'Active') summary.active++;
        });

        const summaryHeaders = ['Employee', 'Email', 'Total Records', 'Completed', 'Active'];
        const summaryBody = Array.from(employeeSummary.values()).map(s => [
          s.name, s.email, String(s.totalRecords), String(s.completed), String(s.active)
        ]);

        autoTable(doc, {
          startY: 27,
          head: [summaryHeaders],
          body: summaryBody,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 60 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
          },
        });
      }

      const period = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
      doc.save(`Attendance_Records_${period}.pdf`);

      if (geocodeErrors > 0) {
        alert(`Export done! Note: ${geocodeErrors} location(s) could not be resolved to addresses.`);
      }

      onClose();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
      setProgressMsg('');
    }
  };

  // Handle export
  const handleExport = () => {
    if (selectedEmployees.length === 0) {
      setFormError('Please select at least one employee');
      return;
    }

    if (!startDate || !endDate) {
      setFormError('Please select start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start date must be before end date');
      return;
    }

    setFormError('');
    if (exportFormat === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Attendance Records
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
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Custom Date Range (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs">End Date</Label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4" />
                <span>Select Employees</span>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                name="employeeSearch"
                aria-label="Search employees"
                autoComplete="off"
                placeholder="Search employees by name, email, or role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No employees found matching your search
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-60 overflow-y-auto">
                {filteredEmployees.map((employee) => {
                  const isPreSelected = employee.id === preSelectedEmployeeId;
                  return (
                    <label
                      key={employee.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        isPreSelected
                          ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id!)}
                        onChange={() => handleEmployeeToggle(employee.id!)}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus-visible:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${isPreSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {employee.name}
                          {isPreSelected && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${isPreSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {employee.role} • {employee.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
              {searchQuery && ` • ${filteredEmployees.length} found`}
            </div>
          </div>

          {/* Export Format Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Format</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                aria-pressed={exportFormat === 'excel'}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 rounded-lg transition-colors ${
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
                type="button"
                onClick={() => setExportFormat('pdf')}
                aria-pressed={exportFormat === 'pdf'}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 rounded-lg transition-colors ${
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
            <div role="status" aria-label="Loading…" className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3">
              <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin flex-shrink-0 text-blue-600" />
              <span className="break-words">{progressMsg}</span>
            </div>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600 px-1">{formError}</p>
        )}

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
            disabled={exporting || selectedEmployees.length === 0}
            className={`w-full sm:w-auto order-1 sm:order-2 text-white ${
              exportFormat === 'excel'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {exporting ? (
              <>
                <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Exporting…</span>
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
