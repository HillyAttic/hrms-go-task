import { z } from 'zod';

// Geolocation Coordinates Schema
export const geolocationCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Break Record Schema
export const breakRecordSchema = z.object({
  id: z.string().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().min(0).optional(),
});

// Clock In Data Schema
export const clockInDataSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  timestamp: z.date(),
  location: geolocationCoordinatesSchema.optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

// Clock Out Data Schema
export const clockOutDataSchema = z.object({
  recordId: z.string().min(1, 'Record ID is required'),
  timestamp: z.date(),
  location: geolocationCoordinatesSchema.optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

// Attendance Record Schema
export const attendanceRecordSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  clockIn: z.date(),
  clockOut: z.date().optional(),
  breaks: z.array(breakRecordSchema).default([]),
  location: z.object({
    clockIn: geolocationCoordinatesSchema.optional(),
    clockOut: geolocationCoordinatesSchema.optional(),
  }).optional(),
  notes: z.object({
    clockIn: z.string().max(500).optional(),
    clockOut: z.string().max(500).optional(),
  }).optional(),
  shiftId: z.string().optional(),
}).refine(
  (data) => !data.clockOut || data.clockOut > data.clockIn,
  { 
    message: 'Clock out time must be after clock in time', 
    path: ['clockOut'] 
  }
);

// Leave Request Schema
export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be 1000 characters or less'),
  halfDay: z.boolean().optional(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

// WFH Request Schema (no half-day, no leave type selector)
export const wfhRequestSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be 1000 characters or less'),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

// Shift Schema
export const shiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required').max(100, 'Shift name must be 100 characters or less'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)'),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, 'Select at least one day'),
  breakDuration: z.number().min(0, 'Break duration cannot be negative').max(480, 'Break duration cannot exceed 8 hours'),
  overtimeThreshold: z.number().min(0, 'Overtime threshold cannot be negative'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)'),
});

// Leave Type Schema
export const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Leave type name is required').max(100, 'Leave type name must be 100 characters or less'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be 10 characters or less').toUpperCase(),
  isPaid: z.boolean(),
  requiresApproval: z.boolean(),
  maxDaysPerYear: z.number().min(0, 'Max days cannot be negative').max(365, 'Max days cannot exceed 365'),
  accrualRate: z.number().min(0, 'Accrual rate cannot be negative'),
  carryOverAllowed: z.boolean(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)'),
});

// Attendance Policy Schema
export const attendancePolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(100, 'Policy name must be 100 characters or less'),
  graceMinutes: z.number().min(0, 'Grace period cannot be negative').max(60, 'Grace period cannot exceed 60 minutes'),
  maxBreakMinutes: z.number().min(0, 'Max break duration cannot be negative').max(480, 'Max break duration cannot exceed 8 hours'),
  autoClockOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)'),
  geolocationRequired: z.boolean(),
  geolocationRadius: z.number().min(0, 'Radius cannot be negative').max(10000, 'Radius cannot exceed 10km'),
  overtimeMultiplier: z.number().min(1, 'Overtime multiplier must be at least 1').max(3, 'Overtime multiplier cannot exceed 3'),
  minDailyHours: z.number().min(0, 'Min daily hours cannot be negative').max(24, 'Min daily hours cannot exceed 24'),
  maxDailyHours: z.number().min(0, 'Max daily hours cannot be negative').max(24, 'Max daily hours cannot exceed 24'),
}).refine(
  (data) => data.maxDailyHours >= data.minDailyHours,
  {
    message: 'Max daily hours must be greater than or equal to min daily hours',
    path: ['maxDailyHours']
  }
);

// Attendance Filters Schema
export const attendanceFiltersSchema = z.object({
  employeeId: z.string().optional(),
  teamId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['active', 'completed', 'incomplete', 'edited']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

// Leave Filters Schema
export const leaveFiltersSchema = z.object({
  employeeId: z.string().optional(),
  managerId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  leaveTypeId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

// Report Config Schema
export const reportConfigSchema = z.object({
  reportType: z.enum(['daily', 'weekly', 'monthly', 'custom', 'leave-summary']),
  startDate: z.date(),
  endDate: z.date(),
  filters: z.object({
    employeeIds: z.array(z.string()).optional(),
    departmentIds: z.array(z.string()).optional(),
    teamIds: z.array(z.string()).optional(),
  }),
  format: z.enum(['pdf', 'csv', 'excel']),
  includeCharts: z.boolean(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

// Type exports for use in components
export type ClockInDataInput = z.infer<typeof clockInDataSchema>;
export type ClockOutDataInput = z.infer<typeof clockOutDataSchema>;
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type WfhRequestInput = z.infer<typeof wfhRequestSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;
export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;
export type AttendancePolicyInput = z.infer<typeof attendancePolicySchema>;
export type AttendanceFiltersInput = z.infer<typeof attendanceFiltersSchema>;
export type LeaveFiltersInput = z.infer<typeof leaveFiltersSchema>;
export type ReportConfigInput = z.infer<typeof reportConfigSchema>;
