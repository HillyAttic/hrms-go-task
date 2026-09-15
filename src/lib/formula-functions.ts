/**
 * Excel-compatible spreadsheet function library for the salary formula engine.
 *
 * Pure TypeScript, zero dependencies. Injected by name into the `new Function`
 * sandbox built in payroll-admin.service.ts, so the admin can write formulas like
 * `ROUND(grossSalary * 0.4, 2)` and get Excel's answers.
 *
 * Conventions:
 *  - Every function guards undefined/empty input and returns 0 rather than NaN.
 *  - Aggregate functions accept either varargs (`SUM(1, 2, 3)`) or a single array
 *    (`SUM([1, 2, 3])`), which is what array-valued expressions produce.
 *  - Dates are real JS `Date` objects, not Excel serials, so `DATE(...) > TODAY()`
 *    behaves the way an author expects and `SUM` never silently adds a date.
 */

/* ------------------------------------------------------------------ helpers */

function isArrayLike(value: unknown): value is any[] {
  return Array.isArray(value);
}

/** Coerce anything to a finite number. Booleans -> 1/0, blank -> 0. */
function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  if (isArrayLike(value)) return num(value[0]);
  const parsed = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Flatten varargs-or-single-array into a plain number array. */
function flat(args: unknown[]): number[] {
  if (args.length === 1 && isArrayLike(args[0])) return flattenNested(args[0]).map(num);
  return flattenNested(args).map(num);
}

function flattenNested(value: unknown): unknown[] {
  if (!isArrayLike(value)) return [value];
  const out: unknown[] = [];
  for (const item of value) out.push(...flattenNested(item));
  return out;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'number') return new Date(value);
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function roundTo(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  // Guard the classic float artefacts (1.005 -> 1.00) with a small epsilon nudge.
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

/* ------------------------------------------------------------------ logical */

export function IF(condition: unknown, valueIfTrue: unknown, valueIfFalse: unknown = '') {
  return condition ? valueIfTrue : valueIfFalse;
}

/** Excel returns #N/A when nothing matches. Throwing lets evaluateSalaryFormula fall back. */
export function IFS(...args: unknown[]) {
  for (let i = 0; i + 1 < args.length; i += 2) {
    if (args[i]) return args[i + 1];
  }
  throw new Error('IFS: no matching condition');
}

export function AND(...args: unknown[]) {
  const values = flat(args);
  return values.length > 0 && values.every((v) => v !== 0);
}

export function OR(...args: unknown[]) {
  return flat(args).some((v) => v !== 0);
}

export function NOT(value: unknown) {
  return !value;
}

/**
 * NOTE: JS evaluates arguments eagerly, so an expression that throws is already
 * thrown by the time IFERROR runs. It still catches non-throwing falsy/error
 * results (NaN, blank), which covers the realistic cases in a salary formula.
 */
export function IFERROR(value: unknown, valueIfError: unknown) {
  if (value === undefined || value === null || value === '') return valueIfError;
  if (typeof value === 'number' && !Number.isFinite(value)) return valueIfError;
  return value;
}

/* --------------------------------------------------------------------- math */

export function SUM(...args: unknown[]) {
  return flat(args).reduce((acc, n) => acc + n, 0);
}

export function AVERAGE(...args: unknown[]) {
  const values = flat(args).filter((n) => Number.isFinite(n));
  if (values.length === 0) return 0;
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

export function MIN(...args: unknown[]) {
  const values = flat(args);
  return values.length === 0 ? 0 : Math.min(...values);
}

export function MAX(...args: unknown[]) {
  const values = flat(args);
  return values.length === 0 ? 0 : Math.max(...values);
}

export function COUNT(...args: unknown[]) {
  return flat(args).filter((n) => Number.isFinite(n)).length;
}

export function COUNTA(...args: unknown[]) {
  return flattenNested(args).filter((v) => v !== null && v !== undefined && v !== '').length;
}

export function COUNTBLANK(...args: unknown[]) {
  return flattenNested(args).filter((v) => v === null || v === undefined || v === '').length;
}

export function PRODUCT(...args: unknown[]) {
  const values = flat(args);
  if (values.length === 0) return 0;
  return values.reduce((acc, n) => acc * n, 1);
}

export function ABS(value: unknown) {
  return Math.abs(num(value));
}

export function ROUND(value: unknown, digits: unknown = 0) {
  return roundTo(num(value), num(digits));
}

/** Excel rounds away from zero. */
export function ROUNDUP(value: unknown, digits: unknown = 0) {
  const factor = Math.pow(10, num(digits));
  const n = num(value);
  return (n < 0 ? -Math.ceil(-n * factor) : Math.ceil(n * factor)) / factor;
}

export function ROUNDDOWN(value: unknown, digits: unknown = 0) {
  const factor = Math.pow(10, num(digits));
  const n = num(value);
  return (n < 0 ? -Math.floor(-n * factor) : Math.floor(n * factor)) / factor;
}

export function CEILING(value: unknown, significance: unknown = 1) {
  const n = num(value);
  const sig = num(significance) || 1;
  return Math.ceil(n / sig) * sig;
}

export function FLOOR(value: unknown, significance: unknown = 1) {
  const n = num(value);
  const sig = num(significance) || 1;
  return Math.floor(n / sig) * sig;
}

export function MOD(value: unknown, divisor: unknown) {
  const d = num(divisor);
  if (d === 0) return 0;
  const n = num(value);
  return n - d * Math.floor(n / d);
}

export function INT(value: unknown) {
  return Math.floor(num(value));
}

export function SQRT(value: unknown) {
  const n = num(value);
  return n < 0 ? 0 : Math.sqrt(n);
}

export function POWER(value: unknown, exponent: unknown) {
  return Math.pow(num(value), num(exponent));
}

export function RAND() {
  return Math.random();
}

export function RANDBETWEEN(low: unknown, high: unknown) {
  const lo = Math.ceil(num(low));
  const hi = Math.floor(num(high));
  if (hi < lo) return lo;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/* --------------------------------------------------------------------- text */

export function CONCAT(...args: unknown[]) {
  return flattenNested(args).map((v) => (v === null || v === undefined ? '' : String(v))).join('');
}

export function TEXTJOIN(delimiter: unknown, ignoreEmpty: unknown, ...args: unknown[]) {
  const parts = flattenNested(args).map((v) => (v === null || v === undefined ? '' : String(v)));
  const kept = ignoreEmpty ? parts.filter((p) => p !== '') : parts;
  return kept.join(delimiter === null || delimiter === undefined ? '' : String(delimiter));
}

export function LEFT(text: unknown, count: unknown = 1) {
  return String(text ?? '').slice(0, Math.max(0, num(count)));
}

export function RIGHT(text: unknown, count: unknown = 1) {
  const s = String(text ?? '');
  const n = Math.max(0, num(count));
  return n === 0 ? '' : s.slice(-n);
}

export function MID(text: unknown, start: unknown, count: unknown) {
  const s = String(text ?? '');
  const from = Math.max(1, num(start)) - 1;
  return s.substr(from, Math.max(0, num(count)));
}

export function LEN(text: unknown) {
  return String(text ?? '').length;
}

export function TRIM(text: unknown) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function UPPER(text: unknown) {
  return String(text ?? '').toUpperCase();
}

export function LOWER(text: unknown) {
  return String(text ?? '').toLowerCase();
}

export function PROPER(text: unknown) {
  return String(text ?? '').replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** 1-indexed, like Excel. */
export function REPLACE(oldText: unknown, start: unknown, count: unknown, newText: unknown) {
  const s = String(oldText ?? '');
  const from = Math.max(1, num(start)) - 1;
  const len = Math.max(0, num(count));
  return s.slice(0, from) + String(newText ?? '') + s.slice(from + len);
}

export function SUBSTITUTE(
  text: unknown,
  oldText: unknown,
  newText: unknown,
  instance?: unknown
) {
  const s = String(text ?? '');
  const find = String(oldText ?? '');
  const repl = String(newText ?? '');
  if (find === '') return s;
  if (instance === undefined || instance === null || instance === '') {
    return s.split(find).join(repl);
  }
  const target = num(instance);
  let seen = 0;
  let index = s.indexOf(find);
  while (index !== -1) {
    seen += 1;
    if (seen === target) return s.slice(0, index) + repl + s.slice(index + find.length);
    index = s.indexOf(find, index + find.length);
  }
  return s;
}

/** Case-sensitive, 1-indexed. Returns 0 when not found (Excel: #VALUE!). */
export function FIND(findText: unknown, withinText: unknown, start: unknown = 1) {
  const index = String(withinText ?? '').indexOf(String(findText ?? ''), Math.max(0, num(start) - 1));
  return index === -1 ? 0 : index + 1;
}

/** Case-insensitive, 1-indexed. */
export function SEARCH(findText: unknown, withinText: unknown, start: unknown = 1) {
  const find = String(findText ?? '').toLowerCase();
  const haystack = String(withinText ?? '').toLowerCase();
  const index = haystack.indexOf(find, Math.max(0, num(start) - 1));
  return index === -1 ? 0 : index + 1;
}

/** Supports the Excel number/date tokens salary slips actually use. */
export function TEXT(value: unknown, format: unknown) {
  const fmt = String(format ?? '');
  if (fmt === '') return String(value ?? '');

  if (value instanceof Date || (!isNaN(new Date(String(value)).getTime()) && /[ymd]/i.test(fmt))) {
    const d = toDate(value);
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const map: Record<string, string> = {
      yyyy: String(d.getFullYear()),
      yy: String(d.getFullYear()).slice(-2),
      mmmm: months[d.getMonth()],
      mmm: months[d.getMonth()].slice(0, 3),
      mm: pad(d.getMonth() + 1),
      m: String(d.getMonth() + 1),
      dd: pad(d.getDate()),
      d: String(d.getDate()),
    };
    return fmt.replace(/yyyy|yy|mmmm|mmm|mm|m|dd|d/g, (token) => map[token] ?? token);
  }

  const n = num(value);
  const decimals = fmt.includes('.') ? (fmt.split('.')[1].match(/[0#]/g) || []).length : 0;
  const useThousands = fmt.includes('#,##') || fmt.includes(',');
  const body = useThousands
    ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : n.toFixed(decimals);
  return fmt.includes('%') ? `${(n * 100).toFixed(decimals)}%` : body;
}

/* --------------------------------------------------------------------- date */

export function TODAY() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function NOW() {
  return new Date();
}

/** JS months are 0-indexed; Excel's DATE() month argument is 1-indexed. */
export function DATE(year: unknown, month: unknown, day: unknown) {
  const y = num(year);
  const m = num(month);
  const d = num(day);
  const result = new Date(y, m - 1, d);
  // Roll overflow the way Excel does: month 13 -> January of the next year.
  if (m > 12 || m < 1) result.setFullYear(y + Math.floor((m - 1) / 12));
  return result;
}

export function YEAR(value: unknown) {
  return toDate(value).getFullYear();
}

export function MONTH(value: unknown) {
  return toDate(value).getMonth() + 1;
}

export function DAY(value: unknown) {
  return toDate(value).getDate();
}

/** 1 = Sunday … 7 = Saturday. */
export function WEEKDAY(value: unknown, returnType: unknown = 1) {
  const day = toDate(value).getDay();
  const type = num(returnType);
  if (type === 2) return day === 0 ? 7 : day;
  if (type === 3) return day === 0 ? 6 : day - 1;
  return day + 1;
}

export function EDATE(startDate: unknown, months: unknown) {
  const d = toDate(startDate);
  const target = new Date(d.getTime());
  const originalDay = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + num(months));
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, daysInTarget));
  return target;
}

export function DATEDIF(startDate: unknown, endDate: unknown, unit: unknown) {
  const start = toDate(startDate);
  const end = toDate(endDate);
  const u = String(unit ?? 'd').toLowerCase();
  if (end < start) return 0;

  if (u === 'y' || u === 'm' || u === 'ym' || u === 'md') {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (u === 'y') return years;
    if (u === 'm') return years * 12 + months;
    if (u === 'ym') return months;
    return days;
  }
  if (u === 'd') return Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (u === 'yd') {
    const anchor = new Date(end.getFullYear(), start.getMonth(), start.getDate());
    if (anchor > end) anchor.setFullYear(end.getFullYear() - 1);
    return Math.floor((end.getTime() - anchor.getTime()) / 86400000);
  }
  return 0;
}

function toHolidaySet(holidays: unknown): Set<string> {
  const out = new Set<string>();
  for (const value of flattenNested(holidays)) {
    const d = value instanceof Date ? value : new Date(String(value));
    if (!isNaN(d.getTime())) out.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return out;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function NETWORKDAYS(startDate: unknown, endDate: unknown, holidays?: unknown) {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (end < start) return 0;
  const skip = toHolidaySet(holidays);
  let count = 0;
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6 && !skip.has(dayKey(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function WORKDAY(startDate: unknown, days: unknown, holidays?: unknown) {
  const skip = toHolidaySet(holidays);
  const cursor = toDate(startDate);
  let remaining = num(days);
  const step = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + step);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6 && !skip.has(dayKey(cursor))) remaining -= 1;
  }
  return cursor;
}

/* -------------------------------------------------------------- statistical */

export function MEDIAN(...args: unknown[]) {
  const values = flat(args).sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}

export function MODE(...args: unknown[]) {
  const values = flat(args);
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const next = (counts.get(v) ?? 0) + 1;
    counts.set(v, next);
    if (next > bestCount) {
      bestCount = next;
      best = v;
    }
  }
  return bestCount > 1 ? best : 0;
}

export function LARGE(array: unknown, k: unknown) {
  const values = flat([array]).sort((a, b) => b - a);
  const index = num(k) - 1;
  return values[index] ?? 0;
}

export function SMALL(array: unknown, k: unknown) {
  const values = flat([array]).sort((a, b) => a - b);
  const index = num(k) - 1;
  return values[index] ?? 0;
}

/** 1 = largest. */
export function RANK(value: unknown, array: unknown, order: unknown = 0) {
  const values = flat([array]);
  if (values.length === 0) return 0;
  const target = num(value);
  const ascending = num(order) !== 0;
  const sorted = [...values].sort((a, b) => (ascending ? a - b : b - a));
  const index = sorted.indexOf(target);
  return index === -1 ? 0 : index + 1;
}

/** Excel PERCENTILE.INC — linear interpolation between ranks. */
export function PERCENTILE(array: unknown, k: unknown) {
  const values = flat([array]).sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const p = Math.min(1, Math.max(0, num(k)));
  const position = (values.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];
  return values[lower] + (position - lower) * (values[upper] - values[lower]);
}

export function STDEV(...args: unknown[]) {
  const values = flat(args);
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function VAR(...args: unknown[]) {
  const values = flat(args);
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
}

/* -------------------------------------------------------------- conditional */

type Criteria = { op: string; value: number | string };

/** Parses ">=100", "<>0", "=50", "50" and bare text; text compares case-insensitively. */
function parseCriteria(criteria: unknown): Criteria {
  const raw = criteria === null || criteria === undefined ? '' : String(criteria).trim();
  const match = raw.match(/^(>=|<=|<>|!=|>|<|=)/);
  const op = match ? match[1] : '=';
  const rest = match ? raw.slice(match[1].length).trim() : raw;
  const asNumber = Number(rest);
  const value = rest !== '' && Number.isFinite(asNumber) ? asNumber : rest.toLowerCase();
  return { op, value };
}

function matches(cell: unknown, criteria: Criteria): boolean {
  const numericCell = typeof criteria.value === 'number' ? num(cell) : null;
  const textCell = String(cell ?? '').toLowerCase();

  switch (criteria.op) {
    case '>':
      return numericCell !== null ? numericCell > (criteria.value as number) : textCell > (criteria.value as string);
    case '<':
      return numericCell !== null ? numericCell < (criteria.value as number) : textCell < (criteria.value as string);
    case '>=':
      return numericCell !== null ? numericCell >= (criteria.value as number) : textCell >= (criteria.value as string);
    case '<=':
      return numericCell !== null ? numericCell <= (criteria.value as number) : textCell <= (criteria.value as string);
    case '<>':
    case '!=':
      return numericCell !== null ? numericCell !== (criteria.value as number) : textCell !== (criteria.value as string);
    default:
      return numericCell !== null ? numericCell === (criteria.value as number) : textCell === (criteria.value as string);
  }
}

/** SUMIF(range, criteria, [sumRange]) — sumRange defaults to range, aligned by index. */
export function SUMIF(range: unknown, criteria: unknown, sumRange?: unknown) {
  const cells = flattenNested(range);
  const sums = sumRange === undefined ? cells : flattenNested(sumRange);
  const test = parseCriteria(criteria);
  let total = 0;
  cells.forEach((cell, index) => {
    if (matches(cell, test)) total += num(sums[index]);
  });
  return total;
}

export function SUMIFS(sumRange: unknown, ...criteriaPairs: unknown[]) {
  const sums = flattenNested(sumRange);
  const pairs: Array<{ cells: unknown[]; test: Criteria }> = [];
  for (let i = 0; i + 1 < criteriaPairs.length; i += 2) {
    pairs.push({ cells: flattenNested(criteriaPairs[i]), test: parseCriteria(criteriaPairs[i + 1]) });
  }
  let total = 0;
  sums.forEach((value, index) => {
    if (pairs.every((pair) => matches(pair.cells[index], pair.test))) total += num(value);
  });
  return total;
}

export function COUNTIF(range: unknown, criteria: unknown) {
  const cells = flattenNested(range);
  const test = parseCriteria(criteria);
  return cells.filter((cell) => matches(cell, test)).length;
}

export function COUNTIFS(...criteriaPairs: unknown[]) {
  const pairs: Array<{ cells: unknown[]; test: Criteria }> = [];
  for (let i = 0; i + 1 < criteriaPairs.length; i += 2) {
    pairs.push({ cells: flattenNested(criteriaPairs[i]), test: parseCriteria(criteriaPairs[i + 1]) });
  }
  if (pairs.length === 0) return 0;
  return pairs[0].cells.filter((_, index) =>
    pairs.every((pair) => matches(pair.cells[index], pair.test))
  ).length;
}

export function AVERAGEIF(range: unknown, criteria: unknown, averageRange?: unknown) {
  const cells = flattenNested(range);
  const values = averageRange === undefined ? cells : flattenNested(averageRange);
  const test = parseCriteria(criteria);
  const matched: number[] = [];
  cells.forEach((cell, index) => {
    if (matches(cell, test)) matched.push(num(values[index]));
  });
  if (matched.length === 0) return 0;
  return matched.reduce((a, b) => a + b, 0) / matched.length;
}

export function AVERAGEIFS(averageRange: unknown, ...criteriaPairs: unknown[]) {
  const values = flat([averageRange]);
  const pairs: Array<{ cells: unknown[]; test: Criteria }> = [];
  for (let i = 0; i + 1 < criteriaPairs.length; i += 2) {
    pairs.push({ cells: flattenNested(criteriaPairs[i]), test: parseCriteria(criteriaPairs[i + 1]) });
  }
  const matched = values.filter((_, index) =>
    pairs.every((pair) => matches(pair.cells[index], pair.test))
  );
  if (matched.length === 0) return 0;
  return matched.reduce((a, b) => a + b, 0) / matched.length;
}

/* ------------------------------------------------------------- name registry */

/**
 * Every export above, ready to be spread into the `new Function` parameter list.
 * Kept here so the engine and the editor's autocomplete cannot drift apart.
 */
export const FORMULA_FUNCTIONS: Record<string, (...args: any[]) => any> = {
  IF, IFS, AND, OR, NOT, IFERROR,
  SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTBLANK, PRODUCT, ABS, ROUND, ROUNDUP,
  ROUNDDOWN, CEILING, FLOOR, MOD, INT, SQRT, POWER, RAND, RANDBETWEEN,
  CONCAT, TEXTJOIN, LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER, PROPER, REPLACE,
  SUBSTITUTE, FIND, SEARCH, TEXT,
  TODAY, NOW, DATE, YEAR, MONTH, DAY, WEEKDAY, EDATE, DATEDIF, NETWORKDAYS, WORKDAY,
  MEDIAN, MODE, LARGE, SMALL, RANK, PERCENTILE, STDEV, VAR,
  SUMIF, SUMIFS, COUNTIF, COUNTIFS, AVERAGEIF, AVERAGEIFS,
};
