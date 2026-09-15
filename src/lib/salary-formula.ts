/**
 * The salary formula's line definitions and its serialisation format.
 *
 * Pure and framework-free on purpose: the editor renders from `FORMULA_LINES`, the
 * calculation service compiles what `generateFormulaString` emits, and
 * scripts/payroll-check.ts verifies the round trip without React in the way.
 */

import { FORMULA_VARIABLES } from '@/lib/payroll-calc';

export interface FormulaLineDef {
  key: string;
  label: string;
  description: string;
  defaultExpression: string;
}

/**
 * The names the calculation service injects as function parameters. They are
 * emitted as `const` to keep the formula body readable; the service strips that
 * keyword before compiling, because redeclaring a parameter is a SyntaxError.
 */
export const SERVER_PARAMETERS = new Set<string>(FORMULA_VARIABLES);

/** Dependency order matters — every line may only reference the ones above it. */
export const FORMULA_LINES: FormulaLineDef[] = [
  { key: 'grossSalary', label: 'Gross Salary', description: 'Monthly gross salary of the employee', defaultExpression: 'grossSalary' },
  { key: 'totalDaysInMonth', label: 'Total Days in Month', description: 'Calendar days in the selected month', defaultExpression: 'totalDaysInMonth' },
  { key: 'basicPercentage', label: 'Basic %', description: 'Basic share of gross, from Payroll Settings', defaultExpression: 'basicPercentage' },
  { key: 'hraPercentage', label: 'HRA %', description: 'HRA share of gross, from Payroll Settings', defaultExpression: 'hraPercentage' },
  { key: 'specialPercentage', label: 'Special %', description: 'Special allowance share of gross', defaultExpression: 'specialPercentage' },
  { key: 'allowedPaidLeaves', label: 'Allowed Paid Leaves', description: 'Free paid leaves per month', defaultExpression: 'allowedPaidLeaves' },
  { key: 'present', label: 'Present Days', description: 'Days the employee clocked in', defaultExpression: 'present' },
  { key: 'wfh', label: 'WFH Days', description: 'Approved work-from-home days', defaultExpression: 'wfh' },
  { key: 'halfDay', label: 'Half Days', description: 'Approved half days', defaultExpression: 'halfDay' },
  { key: 'holidays', label: 'Holidays', description: 'Declared holidays plus Sundays', defaultExpression: 'holidays' },
  { key: 'approvedLeave', label: 'Approved Leave', description: 'Approved full-day leave', defaultExpression: 'approvedLeave' },
  { key: 'totalWorkingDays', label: 'Total Working Days', description: 'Month days minus holidays', defaultExpression: 'totalDaysInMonth - holidays' },
  { key: 'unapprovedLeave', label: 'Unapproved Leave', description: 'Working days with no attendance and no leave', defaultExpression: 'totalWorkingDays - present - wfh - approvedLeave - (halfDay * 0.5)' },
  { key: 'paidLeave', label: 'Paid Leave', description: 'Leave covered by the paid-leave allowance', defaultExpression: 'MIN(approvedLeave + unapprovedLeave, allowedPaidLeaves)' },
  { key: 'leaveTaken', label: 'Leave Taken', description: 'Approved plus unapproved leave', defaultExpression: 'approvedLeave + unapprovedLeave' },
  { key: 'unpaidLeave', label: 'Unpaid Leave', description: 'Leave beyond the paid-leave allowance', defaultExpression: 'MAX(0, approvedLeave + unapprovedLeave - allowedPaidLeaves)' },
  { key: 'paidDays', label: 'Paid Days', description: 'Days paid for this month', defaultExpression: '26 - unpaidLeave - (halfDay * 0.5)' },
  { key: 'proratedGross', label: 'Prorated Gross', description: 'Gross after the unpaid-leave deduction', defaultExpression: 'grossSalary - (grossSalary * unpaidLeave) / 26' },
  { key: 'basic', label: 'Basic Wage', description: 'Basic component of the salary', defaultExpression: 'proratedGross * (basicPercentage / 100)' },
  { key: 'hra', label: 'HRA', description: 'House rent allowance component', defaultExpression: 'proratedGross * (hraPercentage / 100)' },
  { key: 'special', label: 'Special Allowances', description: 'Special allowance component', defaultExpression: 'proratedGross * (specialPercentage / 100)' },
  { key: 'totalDeductions', label: 'Total Deductions', description: 'Sum of every deduction', defaultExpression: '0' },
  { key: 'netSalary', label: 'Net Salary', description: 'Take-home pay for the month', defaultExpression: 'basic + hra + special - totalDeductions' },
];

export const DEFAULT_FORMULA_EXPRESSIONS: Record<string, string> = Object.fromEntries(
  FORMULA_LINES.map((line) => [line.key, line.defaultExpression])
);

export const INPUT_KEYS = FORMULA_LINES.slice(0, 11).map((line) => line.key);
export const COMPONENT_KEYS = FORMULA_LINES.slice(11).map((line) => line.key);

/** Serialises the editor state into the source the calculation service compiles. */
export function generateFormulaString(expressions: Record<string, string>): string {
  const assignments = FORMULA_LINES.map(({ key }) => {
    const prefix = SERVER_PARAMETERS.has(key) ? 'const ' : '';
    return `${prefix}${key} = ${(expressions[key] ?? '').trim()};`;
  });
  return `${assignments.join('\n')}\nreturn { paidDays, basic, hra, special, totalDeductions, netSalary };`;
}

/** Reads back both the `key = expr;` and `const key = expr;` forms. */
export function parseFormulaToExpressions(formula?: string | null): Record<string, string> {
  const expressions: Record<string, string> = { ...DEFAULT_FORMULA_EXPRESSIONS };
  if (!formula) return expressions;

  const regex = /(?:const\s+)?(\w+)\s*=\s*(.+?);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(formula)) !== null) {
    const [, key, expression] = match;
    if (key in expressions) expressions[key] = expression.trim();
  }
  return expressions;
}
