// Attendance System Type Definitions

export type AttendanceStatus = 'active' | 'completed' | 'incomplete' | 'edited';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TeamAttendanceStatus = 'clocked-in' | 'clocked-out' | 'on-break' | 'on-leave' | 'absent';
export type CalendarDayStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'weekend';
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'leave-summary';
export type ReportFormat = 'pdf' | 'csv' | 'excel';
export type AlertType = 'late' | 'early-departure' | 'missing-clockout' | 'excessive-break' | 'overtime';
export type AlertSeverity = 'low' | 'medium' | 'high';

// Geolocation
export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Break Record
export interface BreakRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
}

// Attendance Record
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  breaks: BreakRecord[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  location?: {
    clockIn?: GeolocationCoordinates;
    clockOut?: GeolocationCoordinates;
  };
  notes?: {
    clockIn?: string;
    clockOut?: string;
  };
  shiftId?: string;
  createdAt: Date;
  updatedAt: Date;
  editedBy?: string;
  editReason?: string;
}

// Clock In/Out Data
export interface ClockInData {
  timestamp: Date;
  location?: GeolocationCoordinates;
  notes?: string;
}

export interface ClockOutData {
  timestamp: Date;
  location?: GeolocationCoordinates;
  notes?: string;
}

// Current Attendance Status
export interface CurrentAttendanceStatus {
  isClockedIn: boolean;
  clockInTime?: Date;
  isOnBreak: boolean;
  breakStartTime?: Date;
  elapsedTime: number; // in seconds
  breakDuration: number; // in seconds
  currentRecordId?: string;
  currentBreakId?: string;
}

// Leave Types
export interface LeaveType {
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
  requiresApproval: boolean;
  maxDaysPerYear: number;
  accrualRate: number;
  carryOverAllowed: boolean;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Leave Balance
export interface LeaveBalance {
  id?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  accrualRate: number;
  lastAccrualDate?: Date;
  updatedAt: Date;
}

// Leave Request
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  halfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  approvalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Shift
export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
  breakDuration: number; // in minutes
  overtimeThreshold: number; // in minutes
  color: string;
  isActive: boolean;
  assignedEmployees: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Policy
export interface AttendancePolicy {
  id: string;
  name: string;
  graceMinutes: number;
  maxBreakMinutes: number;
  autoClockOutTime: string; // HH:mm format
  geolocationRequired: boolean;
  geolocationRadius: number; // in meters
  overtimeMultiplier: number;
  minDailyHours: number;
  maxDailyHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Team Attendance Status
export interface TeamMemberAttendanceStatus {
  employeeId: string;
  employeeName: string;
  avatar?: string;
  status: TeamAttendanceStatus;
  clockInTime?: Date;
  expectedClockIn?: Date;
  isLate: boolean;
  isEarlyDeparture: boolean;
  currentHours: number;
}

// Attendance Alert
export interface AttendanceAlert {
  id: string;
  type: AlertType;
  employeeId: string;
  employeeName: string;
  message: string;
  timestamp: Date;
  severity: AlertSeverity;
}

// Calendar Day
export interface CalendarDay {
  date: Date;
  status: CalendarDayStatus;
  hours?: number;
  leaveType?: string;
  isIncomplete?: boolean;
}

// Attendance Statistics
export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalHours: number;
  averageHours: number;
  overtimeHours: number;
  attendanceRate: number;
  punctualityRate: number;
}

// Report Configuration
export interface ReportConfig {
  reportType: ReportType;
  startDate: Date;
  endDate: Date;
  filters: {
    employeeIds?: string[];
    departmentIds?: string[];
    teamIds?: string[];
  };
  format: ReportFormat;
  includeCharts: boolean;
}

// Attendance Report
export interface AttendanceReport {
  id: string;
  reportType: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEmployees: number;
    averageHours: number;
    totalHours: number;
    overtimeHours: number;
    attendanceRate: number;
    absenceRate: number;
  };
  records: AttendanceRecord[];
  generatedAt: Date;
  generatedBy: string;
}

// Filters
export interface AttendanceFilters {
  employeeId?: string;
  teamId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface LeaveFilters {
  employeeId?: string;
  managerId?: string;
  status?: LeaveStatus;
  leaveTypeId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Date Range
export interface DateRange {
  start: Date;
  end: Date;
}

// Form Data Types
export interface LeaveRequestFormData {
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  halfDay?: boolean;
}

export interface ShiftFormData {
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
  breakDuration: number; // in minutes
  overtimeThreshold: number; // in minutes
  color: string; // for calendar display
}

export interface LeaveTypeFormData {
  name: string;
  code: string;
  isPaid: boolean;
  requiresApproval: boolean;
  maxDaysPerYear: number;
  accrualRate: number;
  carryOverAllowed: boolean;
  color: string;
}

export interface AttendancePolicyFormData {
  name: string;
  graceMinutes: number;
  maxBreakMinutes: number;
  autoClockOutTime: string;
  geolocationRequired: boolean;
  geolocationRadius: number;
  overtimeMultiplier: number;
  minDailyHours: number;
  maxDailyHours: number;
}
