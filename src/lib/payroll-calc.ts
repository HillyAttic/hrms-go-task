/**
 * Pure payroll arithmetic — no Firestore, no Admin SDK, no I/O.
 *
 * Kept separate from payroll-admin.service.ts so the rules that decide what an
 * employee is paid can be verified directly (scripts/payroll-check.ts) instead of
 * only through a database round trip.
 */

import type { AttendanceBreakdown, PayrollSettings, SalaryBreakup } from '@/types/payroll.types';

/** The 17 variables the formula sandbox exposes as named parameters, in order. */
export const FORMULA_VARIABLES = [
  'grossSalary', 'totalDaysInMonth', 'totalWorkingDays', 'basicPercentage',
  'hraPercentage', 'specialPercentage', 'allowedPaidLeaves', 'includePaidLeavesInPaidDays',
  'present', 'wfh', 'halfDay', 'paidLeave', 'leaveTaken', 'unpaidLeave',
  'holidays', 'approvedLeave', 'unapprovedLeave',
] as const;

export type FormulaVariables = Record<(typeof FORMULA_VARIABLES)[number], number>;

/** `YYYY-MM-DD`, the only date shape the day-classification Sets use. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function numeric(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function emptyBreakdown(): AttendanceBreakdown {
  return {
    present: 0, wfh: 0, approvedLeave: 0, unapprovedLeave: 0, halfDay: 0,
    holiday: 0, paidLeave: 0, leaveTaken: 0, unpaidLeave: 0, paidDays: 0,
  };
}

/** Slip numbers are `SAL-YYYYMM-EMPCODE` with a 1-based, zero-padded month. */
export function buildSlipNumber(year: number, month: number, employeeCode: string): string {
  return `SAL-${year}${String(month + 1).padStart(2, '0')}-${employeeCode}`;
}

export interface DayClassificationInput {
  year: number;
  /** 0-indexed */
  month: number;
  totalDaysInMonth: number;
  presentDays: Set<string>;
  wfhDates: Set<string>;
  halfDayDates: Set<string>;
  leaveDates: Set<string>;
  holidayDates: Set<string>;
  /** Injectable so the classification can be verified against a fixed date. */
  today?: Date;
}

/**
 * Classify every day of the month; the FIRST matching rule wins, so clocking in
 * beats a holiday or a Sunday, and a future day is skipped rather than counted as
 * unapproved (counting it would over-deduct anyone whose slip is generated mid-month).
 */
export function classifyDays(input: DayClassificationInput): AttendanceBreakdown {
  const breakdown = emptyBreakdown();
  const today = input.today ?? new Date();
  const todayKey = dayKey(today);
  const monthNotPast =
    input.year > today.getFullYear() ||
    (input.year === today.getFullYear() && input.month >= today.getMonth());

  for (let day = 1; day <= input.totalDaysInMonth; day++) {
    const date = new Date(input.year, input.month, day);
    const key = dayKey(date);

    if (input.presentDays.has(key)) { breakdown.present++; continue; }
    if (input.wfhDates.has(key)) { breakdown.wfh++; continue; }
    if (input.halfDayDates.has(key)) { breakdown.halfDay++; continue; }
    if (input.leaveDates.has(key)) { breakdown.approvedLeave++; continue; }
    if (input.holidayDates.has(key)) { breakdown.holiday++; continue; }
    if (date.getDay() === 0) { breakdown.holiday++; continue; }
    if (monthNotPast && key > todayKey) continue;

    breakdown.unapprovedLeave++;
  }

  return breakdown;
}

/** Free paid leaves are consumed first; only the excess is unpaid. */
export function computeLeavePolicy(
  approvedLeave: number,
  unapprovedLeave: number,
  allowedPaidLeaves: number
) {
  const leaveTaken = approvedLeave + unapprovedLeave;
  const paidLeave = Math.min(leaveTaken, Math.max(0, numeric(allowedPaidLeaves)));
  const unpaidLeave = Math.max(0, leaveTaken - paidLeave);
  return { leaveTaken, paidLeave, unpaidLeave };
}

/**
 * The whiteboard formula — used when no custom formula is configured, and as the
 * fallback when a custom one throws.
 *
 * NOTE the hard-coded 26-day denominator. It is deliberately NOT totalDaysInMonth:
 * a month's length must not change what a day of unpaid leave costs.
 */
export function builtInResult(
  vars: FormulaVariables,
  settings: PayrollSettings
): { breakup: SalaryBreakup; paidDays: number } {
  const { grossSalary, unpaidLeave, halfDay } = vars;
  const paidDays = Math.max(0, 26 - unpaidLeave - halfDay * 0.5);
  const leaveDeduction = (grossSalary * unpaidLeave) / 26;
  const netSalary = grossSalary - leaveDeduction;

  return {
    breakup: {
      basic: (grossSalary * numeric(settings.basicPercentage)) / 100,
      hra: (grossSalary * numeric(settings.hraPercentage)) / 100,
      special: (grossSalary * numeric(settings.specialPercentage)) / 100,
      totalDeductions: leaveDeduction,
      netSalary,
      leaveDeduction,
    },
    paidDays,
  };
}
