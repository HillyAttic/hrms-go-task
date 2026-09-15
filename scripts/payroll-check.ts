#!/usr/bin/env node
/**
 * Runnable self-check for the payroll calculation rules. No test framework.
 *
 *   npm run check:payroll
 *
 * Asserts the pure rules against fixed inputs and exits non-zero on any failure.
 * Nothing here touches Firestore.
 */

import { MONTH_NAMES, type PayrollSettings } from '../src/types/payroll.types';
import {
  buildSlipNumber,
  builtInResult,
  classifyDays,
  computeLeavePolicy,
  type FormulaVariables,
} from '../src/lib/payroll-calc';
import {
  IF,
  MAX,
  MIN,
  ROUND,
  SUM,
  AVERAGE,
  COUNTIF,
  IFS,
} from '../src/lib/formula-functions';
import { payrollAdminService } from '../src/services/payroll-admin.service';
import { DEFAULT_FORMULA_EXPRESSIONS, generateFormulaString } from '../src/lib/salary-formula';

let failures = 0;
let checks = 0;

function check(name: string, actual: unknown, expected: unknown) {
  checks += 1;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function checkClose(name: string, actual: number, expected: number, epsilon = 0.0001) {
  checks += 1;
  const pass = Math.abs(actual - expected) < epsilon;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) console.log(`        expected ${expected}, got ${actual}`);
}

const settings: PayrollSettings = {
  companyName: 'Test Co',
  companyAddress: '1 Test Road',
  logoUrl: null,
  basicPercentage: 40,
  hraPercentage: 30,
  specialPercentage: 30,
  allowedPaidLeaves: 2,
  includePaidLeavesInPaidDays: false,
  footerNote: '',
};

function variables(overrides: Partial<FormulaVariables> = {}): FormulaVariables {
  return {
    grossSalary: 26000,
    totalDaysInMonth: 30,
    totalWorkingDays: 26,
    basicPercentage: 40,
    hraPercentage: 30,
    specialPercentage: 30,
    allowedPaidLeaves: 2,
    includePaidLeavesInPaidDays: 0,
    present: 24,
    wfh: 0,
    halfDay: 0,
    paidLeave: 0,
    leaveTaken: 0,
    unpaidLeave: 0,
    holidays: 4,
    approvedLeave: 0,
    unapprovedLeave: 0,
    ...overrides,
  };
}

console.log('\n— month is 0-indexed end to end —');
check('MONTH_NAMES[0] is January', MONTH_NAMES[0], 'January');
check('MONTH_NAMES[5] is June', MONTH_NAMES[5], 'June');
check('MONTH_NAMES[11] is December', MONTH_NAMES[11], 'December');
check('slip number, month 5', buildSlipNumber(2026, 5, 'EMP001'), 'SAL-202606-EMP001');
check('slip number, month 11', buildSlipNumber(2026, 11, 'EMP001'), 'SAL-202612-EMP001');

console.log('\n— built-in formula: 26-day denominator, NOT totalDaysInMonth —');
{
  const twoDaysUnpaid = variables({ unpaidLeave: 2 });
  const { breakup, paidDays } = builtInResult(twoDaysUnpaid, settings);
  checkClose('leaveDeduction = 26000 * 2 / 26', breakup.leaveDeduction ?? 0, 2000);
  checkClose('netSalary = 26000 - 2000', breakup.netSalary, 24000);
  checkClose('basic = 40% of gross', breakup.basic, 10400);
  checkClose('hra = 30% of gross', breakup.hra, 7800);
  checkClose('special = 30% of gross', breakup.special, 7800);
  // June has 30 days. A 30-day denominator would give 1733.33 — this proves the 26.
  checkClose('paidDays with 2 unpaid days', paidDays, 24);
  // June has 30 days; a 30-day denominator would have produced 1733.33 instead.
  checkClose('a 30-day denominator would have been 1733.33', 26000 * 2 / 30, 1733.3333, 0.001);
}

console.log('\n— paidDays = 26 - unpaidLeave - halfDay * 0.5 —');
checkClose('1 half day => 25.5', builtInResult(variables({ halfDay: 1 }), settings).paidDays, 25.5);
checkClose('2 unpaid + 1 half day => 23.5', builtInResult(variables({ unpaidLeave: 2, halfDay: 1 }), settings).paidDays, 23.5);
checkClose('more unpaid than 26 clamps at 0', builtInResult(variables({ unpaidLeave: 30 }), settings).paidDays, 0);

console.log('\n— leave policy: allowedPaidLeaves are consumed first —');
check('leaveTaken 3, allowed 2', computeLeavePolicy(2, 1, 2), { leaveTaken: 3, paidLeave: 2, unpaidLeave: 1 });
check('leaveTaken 5, allowed 2', computeLeavePolicy(3, 2, 2), { leaveTaken: 5, paidLeave: 2, unpaidLeave: 3 });
check('leaveTaken 1, allowed 2', computeLeavePolicy(1, 0, 2), { leaveTaken: 1, paidLeave: 1, unpaidLeave: 0 });
check('allowed 0', computeLeavePolicy(0, 2, 0), { leaveTaken: 2, paidLeave: 0, unpaidLeave: 2 });

console.log('\n— day classification priority —');
{
  // June 2026 starts on a Monday; Sundays are the 7th, 14th, 21st, 28th.
  const breakdown = classifyDays({
    year: 2026,
    month: 5,
    totalDaysInMonth: 30,
    presentDays: new Set(['2026-06-01']),
    holidayDates: new Set(['2026-06-02']),
    leaveDates: new Set(['2026-06-03', '2026-06-04']),
    halfDayDates: new Set(['2026-06-05']),
    wfhDates: new Set(['2026-06-06']),
    today: new Date(2026, 5, 30),
  });
  check('present', breakdown.present, 1);
  check('wfh', breakdown.wfh, 1);
  check('half day', breakdown.halfDay, 1);
  check('approved leave', breakdown.approvedLeave, 2);
  check('holidays (1 declared + 4 Sundays)', breakdown.holiday, 5);
  check('unapproved (everything left over)', breakdown.unapprovedLeave, 20);
  check(
    'every day accounted for exactly once',
    breakdown.present + breakdown.wfh + breakdown.halfDay + breakdown.approvedLeave +
      breakdown.holiday + breakdown.unapprovedLeave,
    30
  );
}
{
  // Attendance beats a declared holiday: 1st is both present and a holiday.
  const breakdown = classifyDays({
    year: 2026,
    month: 5,
    totalDaysInMonth: 30,
    presentDays: new Set(['2026-06-01', '2026-06-02']),
    holidayDates: new Set(['2026-06-02']),
    leaveDates: new Set(),
    halfDayDates: new Set(),
    wfhDates: new Set(),
    today: new Date(2026, 5, 30),
  });
  check('clocking in beats a holiday', breakdown.present, 2);
  check('and the holiday is not double counted', breakdown.holiday, 4);
}
{
  // Future days of the current month must not be deducted.
  const breakdown = classifyDays({
    year: 2026,
    month: 5,
    totalDaysInMonth: 30,
    presentDays: new Set(),
    holidayDates: new Set(),
    leaveDates: new Set(),
    halfDayDates: new Set(),
    wfhDates: new Set(),
    today: new Date(2026, 5, 10),
  });
  check('days 11..30 are skipped, not unapproved', breakdown.unapprovedLeave, 9);
  // Future Sundays still register as holidays — they are not unapproved days either way.
  check('Sundays, past and future, all count as holidays', breakdown.holiday, 4);
}

console.log('\n— formula function library —');
check('SUM varargs', SUM(1, 2, 3), 6);
check('SUM array', SUM([1, 2, 3]), 6);
check('SUM empty', SUM(), 0);
check('MAX', MAX(1, 5, 3), 5);
check('MIN', MIN(1, 5, 3), 1);
check('ROUND to 2dp', ROUND(1234.5678, 2), 1234.57);
check('ROUND halves away from zero', ROUND(2.5), 3);
check('IF true branch', IF(true, 'a', 'b'), 'a');
check('IF false branch', IF(false, 'a', 'b'), 'b');
check('AVERAGE', AVERAGE(2, 4, 6), 4);
check('COUNTIF ">=2"', COUNTIF([1, 2, 3, 4], '>=2'), 3);
let ifsThrew = false;
try { IFS(false, 1, false, 2); } catch { ifsThrew = true; }
check('IFS throws when nothing matches', ifsThrew, true);

console.log('\n— formula engine —');
{
  const fallback = builtInResult(variables({ unpaidLeave: 2 }), settings);
  const result = payrollAdminService.evaluateSalaryFormula('this is not javascript', variables({ unpaidLeave: 2 }), settings);
  checkClose('a nonsense formula falls back instead of throwing', result.breakup.netSalary, fallback.breakup.netSalary);
  checkClose('and the fallback agrees on paidDays', result.paidDays, fallback.paidDays);
}
{
  // Legacy formulas declared variables as `const`; they must still compile.
  const legacy = [
    'const grossSalary = grossSalary;',
    'const present = present;',
    'const unpaidLeave = unpaidLeave;',
    'return { basic: grossSalary, hra: 0, special: 0, totalDeductions: 0, netSalary: grossSalary, paidDays: 26 };',
  ].join('\n');
  const result = payrollAdminService.evaluateSalaryFormula(legacy, variables(), settings);
  checkClose('a legacy `const` formula still runs', result.breakup.basic, 26000);
}
{
  const formula = [
    'return {',
    '  basic: ROUND(grossSalary * 0.5, 2),',
    '  hra: 0,',
    '  special: 0,',
    '  totalDeductions: 100,',
    '  netSalary: MAX(0, grossSalary - 100),',
    '  paidDays: 26 - unpaidLeave,',
    '};',
  ].join('\n');
  const result = payrollAdminService.evaluateSalaryFormula(formula, variables(), settings);
  checkClose('a real formula is honoured', result.breakup.basic, 13000);
  checkClose('its netSalary is used', result.breakup.netSalary, 25900);
}

console.log('\n— the editor default round-trips through the engine —');
{
  // The default formula DERIVES unpaidLeave from approved+unapproved-allowed, so the
  // explicit unpaidLeave has to agree with it or the two sides compute different things.
  // allowedPaidLeaves 0 makes the derivation an identity.
  const vars = variables({
    unpaidLeave: 2,
    allowedPaidLeaves: 0,
    unapprovedLeave: 2,
    approvedLeave: 0,
  });
  const serialised = generateFormulaString(DEFAULT_FORMULA_EXPRESSIONS);
  const engine = payrollAdminService.evaluateSalaryFormula(serialised, vars, settings);
  const builtIn = builtInResult(vars, settings);

  checkClose('netSalary matches the built-in formula', engine.breakup.netSalary, builtIn.breakup.netSalary);
  checkClose('paidDays matches the built-in formula', engine.paidDays, builtIn.paidDays);
  check('the serialised default ends in the return statement', serialised.includes('return {'), true);
  check('inputs serialise as const', serialised.includes('const grossSalary = grossSalary;'), true);

  // KNOWN DIVERGENCE — left as the spec defines it, but assert it so it cannot go
  // unnoticed: the default formula prorates the components and reports
  // totalDeductions 0, while the built-in splits the FULL gross and reports the
  // leave deduction. Net pay agrees; the component split and the deduction total
  // do not whenever unpaidLeave > 0.
  checkClose('default formula prorates basic', engine.breakup.basic, 9600);
  checkClose('built-in splits the full gross', builtIn.breakup.basic, 10400);
  checkClose('built-in reports the leave deduction', builtIn.breakup.totalDeductions, 2000);
  checkClose('default formula reports none', engine.breakup.totalDeductions, 0);
}

console.log(`\n${failures === 0 ? '✅' : '❌'}  ${checks - failures}/${checks} checks passed\n`);
process.exit(failures === 0 ? 0 : 1);
