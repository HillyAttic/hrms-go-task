import { z } from 'zod';

/**
 * The two nested shapes of a salary slip, shared by every route that persists one.
 *
 * They mirror `AttendanceBreakdown` and `SalaryBreakup` in `@/types/payroll.types`
 * field for field, and must be kept in step: zod strips what it does not know, so a
 * field missing here is silently dropped from a write rather than rejected.
 */
export const attendanceBreakdownSchema = z.object({
  present: z.number(),
  wfh: z.number(),
  approvedLeave: z.number(),
  unapprovedLeave: z.number(),
  halfDay: z.number(),
  holiday: z.number(),
  paidLeave: z.number(),
  leaveTaken: z.number(),
  unpaidLeave: z.number(),
  paidDays: z.number(),
});

export const salaryBreakupSchema = z.object({
  basic: z.number(),
  hra: z.number(),
  special: z.number(),
  totalDeductions: z.number(),
  netSalary: z.number(),
  epf: z.number().optional(),
  esi: z.number().optional(),
  professionalTax: z.number().optional(),
  tds: z.number().optional(),
  loanRecovery: z.number().optional(),
  otherDeduction: z.number().optional(),
  leaveDeduction: z.number().optional(),
});
