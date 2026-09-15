# Payroll Panel — Paste-Ready Implementation Prompts

Copy the **SHARED CONTEXT** block + **one prompt at a time** into your other Next.js app's AI.
Run them in order and let each one build/verify before moving on. Do not paste all five at once.

---

## SHARED CONTEXT (paste this first, and again at the top of every prompt)

```
PROJECT CONTEXT — read before doing anything.

Stack: Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS, Firebase v11
(Firestore + Firebase Auth client SDK, Firebase Admin SDK server-side), zod,
react-hook-form, react-toastify, lucide-react, jspdf.

NON-NEGOTIABLE CONVENTIONS OF THIS CODEBASE:
1. Client components ('use client') never touch Firestore for payroll. They call our API
   through `authenticatedFetch(url, init)` from '@/lib/api-client' which injects
   `Authorization: Bearer <firebase id token>`.
2. API routes (`src/app/api/**/route.ts`) verify the token server-side via
   `verifyAuthToken(request)` from '@/lib/server-auth', then check the role inline.
   The verified result is `{ user: { uid, email, claims: { role, isAdmin, permissions } } }`.
   Roles are exactly: 'admin' | 'manager' | 'employee'.
3. All Firestore reads/writes happen in the service layer using the Admin SDK
   (`adminDb`, `adminMessaging` from '@/lib/firebase-admin'). Never use the client SDK
   for payroll data.
4. Next.js 16 dynamic route params are async:
   `export async function GET(req: Request, { params }: { params: Promise<{ id: string }> })`
   then `const { id } = await params;`
5. Firestore batches are chunked at 499 ops (limit is 500) everywhere we write in bulk.
6. Errors: use the helpers from '@/lib/api-error-handler' (`ErrorResponses.notFound()`,
   `.forbidden()`, `.badRequest()`, `.unauthorized()`, `handleApiError(error)`).
   Error JSON shape is `{ error, message, statusCode, details? }`.
   Server: `console.error('[Scope] message', error)`. Client: `toast.success/error`.
7. Every UI surface must work in light AND dark mode. Tailwind dark: variants on every
   surface, border, and text class. No exceptions.

DESIGN TOKENS — reuse these exact class strings so the panel matches the rest of the app:
- Page header: icon tile `flex items-center justify-center w-12 h-12 rounded-xl
  bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/30`
  with a lucide icon `h-6 w-6 text-white`; then `h1.text-2xl.font-bold.text-gray-900.dark:text-white`
  and `p.text-sm.text-gray-500.dark:text-gray-400.mt-0.5`.
- Card: `bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`
- Card header block: `p-5 border-b border-gray-200 dark:border-gray-700`
- Section title: `text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2`
- Table: wrapper `overflow-x-auto`; `table.w-full`; head `bg-gray-50 dark:bg-gray-700/50`;
  th `px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider`;
  body `divide-y divide-gray-200 dark:divide-gray-600`; row `hover:bg-gray-50 dark:hover:bg-gray-700/50`.
- Selected row: `bg-blue-50 dark:bg-blue-900/20`. Primary accent: blue-600.
- Form input: `w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white
  dark:bg-gray-700 px-3 py-2 text-sm`
- Buttons (from '@/components/ui/button'): variants default|destructive|outline|ghost,
  sizes sm|default|lg|icon, `loading` prop shows a spinner and disables.
- Warning banner: `flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border
  border-amber-200 dark:border-amber-800 rounded-lg` with an AlertTriangle icon.
- Currency: `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR',
  maximumFractionDigits: 0 })`. Dates: `toLocaleDateString('en-IN')`.

FIRESTORE COLLECTIONS (exact names — reuse them):
- `salary-slips`             one doc per employee per period
- `payroll-settings`         SINGLETON (first doc via `.limit(1)`)
- `salary-slip-templates`    presentation templates
- `users`                    employees (holds doj, pan, designation, department, grossSalary, fcmToken)
- `attendance-records`       { employeeId, clockIn: Timestamp, ... }
- `leave-requests`           { employeeId, status, startDate, endDate, leaveType, halfDay }
- `holidays`                 { date: Timestamp }
- `notifications`            { userId, type, title, message, read, createdAt, metadata, actionUrl, data }
- `manager-hierarchies`      { managerId, employeeIds: string[] }

CRITICAL DATA CONVENTION: **month is 0-indexed everywhere** in the DB and API
(0 = January … 11 = December). Year is a plain 4-digit number.
Display names use `MONTH_NAMES[month]`. Slip numbers zero-pad `month + 1`:
`SAL-${year}${String(month + 1).padStart(2, '0')}-${employeeCode}` → e.g. `SAL-202606-EMP001`.

If your app already has differently-named collections or a different role field, tell me
your names once and then use theirs — but keep the shapes and the 0-indexed month rule.

Do not summarise this back to me. Just confirm in one line that you've read it and wait
for the next prompt.
```

---

## PROMPT 1 — Foundation: types, Excel formula engine, calculation service, migration

```
Using the project context above, implement the payroll foundation. Create these files.
Write complete, compiling TypeScript. No placeholders, no TODOs.

FILE 1 — src/types/payroll.types.ts

export interface PayrollSettings {
  id?: string;
  companyName: string;
  companyAddress: string;
  logoUrl: string | null;
  basicPercentage: number;        // 0-100
  hraPercentage: number;          // 0-100
  specialPercentage: number;      // 0-100  (the three MUST sum to 100)
  allowedPaidLeaves: number;      // free paid leaves per month
  includePaidLeavesInPaidDays: boolean;
  footerNote: string;
  salaryFormula?: string;         // optional user-editable formula (see FILE 3)
  accessConfig?: Record<string, Record<string, boolean>>; // "2026-6" -> employeeId -> granted
  updatedAt?: Timestamp;          // from 'firebase/firestore'
}

export interface AttendanceBreakdown {
  present: number; wfh: number; approvedLeave: number; unapprovedLeave: number;
  halfDay: number; holiday: number; paidLeave: number; leaveTaken: number;
  unpaidLeave: number; paidDays: number;
}

export interface SalaryBreakup {
  basic: number; hra: number; special: number;
  totalDeductions: number; netSalary: number;
  epf?: number; esi?: number; professionalTax?: number; tds?: number;
  loanRecovery?: number; otherDeduction?: number; leaveDeduction?: number;
}

export interface EmployeeSalary {
  id?: string;
  employeeId: string; name: string; employeeCode: string;
  designation: string; department: string;
  doj: string | null; pan: string | null;
  grossSalary: number;
  month: number; year: number;            // month 0-indexed
  totalDaysInMonth: number; paidDays: number;
  attendanceBreakdown: AttendanceBreakdown;
  salaryBreakup: SalaryBreakup;
  slipNumber: string;
  generatedAt?: Timestamp;
  generatedBy: string;                    // uid of admin/manager
  accessGranted: boolean;
}

export interface SalaryCalculationResult {
  attendanceBreakdown: AttendanceBreakdown;
  salaryBreakup: SalaryBreakup;
  totalDaysInMonth: number;
  paidDays: number;
}

// Template types
export interface SalarySlipTemplateField { key: string; label: string; visible: boolean; }
export interface SalarySlipTemplateSection {
  key: string;            // 'employeeDetails' | 'attendance' | 'earnings' | 'deductions'
  title: string; visible: boolean; fields: SalarySlipTemplateField[];
}
export interface SalarySlipTemplate {
  id?: string; title: string;
  sections: SalarySlipTemplateSection[];
  showFooterNote: boolean; showSlipNumber: boolean;
  footerNote?: string; updatedAt?: Timestamp;
}

Also export `DEFAULT_SALARY_SLIP_TEMPLATE: Omit<SalarySlipTemplate,'id'|'updatedAt'>` with
title 'Default Template', showFooterNote true, showSlipNumber true, and exactly these four
sections/fields (key + label as written):
- employeeDetails "Employee Details": name "Name of the Employee", pan "PAN",
  employeeId "Employee ID", department "Department", designation "Designation",
  doj "Date of Joining" — all visible.
- attendance "Attendance Details": totalDaysInMonth "Total Days in Month", paidDays "Paid Days",
  present "Present", wfh "WFH", holiday "Holidays", leaveTaken "Leave Taken",
  paidLeave "Paid Leave", unpaidLeave "Unpaid Leave", approvedLeave "Approved Leave",
  unapprovedLeave "Unapproved Leave", halfDay "Half Day" — all visible.
- earnings "Earnings": basic "Basic Wage", hra "HRA", special "Special Allowances".
- deductions "Deductions": epf "EPF", esi "ESI/Health Insurance",
  professionalTax "Professional Tax", tds "TDS / Income Tax", loanRecovery "Loan Recovery",
  otherDeduction "Other Deduction", leaveDeduction "Leave Deduction".

FILE 2 — src/lib/formula-functions.ts

A pure-TypeScript module exporting ~60 Excel-compatible spreadsheet functions so the salary
formula editor feels like Excel. No dependencies. Export exactly these, all as named
`export function`s:
Logical: IF, IFS, AND, OR, NOT, IFERROR
Math: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTBLANK, PRODUCT, ABS, ROUND, ROUNDUP,
      ROUNDDOWN, CEILING, FLOOR, MOD, INT, SQRT, POWER, RAND, RANDBETWEEN
Text: CONCAT, TEXTJOIN, LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER, PROPER, REPLACE,
      SUBSTITUTE, FIND, SEARCH, TEXT
Date: TODAY, NOW, DATE, YEAR, MONTH, DAY, WEEKDAY, EDATE, DATEDIF, NETWORKDAYS, WORKDAY
Statistical: MEDIAN, MODE, LARGE, SMALL, RANK, PERCENTILE, STDEV, VAR
Conditional: SUMIF, SUMIFS, COUNTIF, COUNTIFS, AVERAGEIF, AVERAGEIFS

Rules: SUM/AVERAGE/MIN/MAX/PRODUCT accept either varargs or a single array; the *IF/*IFS
family takes a range plus a `criteria` string supporting ">=100", "<>0", "=50", "50", and
text equality; RANK/LARGE/SMALL/PERCENTILE take an array; IFS throws on no-match like Excel.
Guard every function against empty/undefined input and return 0 rather than NaN.

FILE 3 — src/services/payroll-admin.service.ts  ('server-only', Admin SDK)

Import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as FormulaFunctions from '@/lib/formula-functions';

Export `payrollAdminService` with these methods exactly:

a) getSettings(): reads `payroll-settings` `.limit(1)`, returns `{ id, ...data } | null`.
b) saveSettings(settings): upsert the singleton (update by id if it exists, else `add`),
   always stamping `updatedAt: Timestamp.now()`.

c) evaluateSalaryFormula(formula, variables) -> { breakup: SalaryBreakup; paidDays: number }
   - Build the function with `new Function(...)` (add an eslint-disable
     no-new-func comment). Inject, in this exact order, as named parameters:
     grossSalary, totalDaysInMonth, totalWorkingDays, basicPercentage, hraPercentage,
     specialPercentage, allowedPaidLeaves, includePaidLeavesInPaidDays, present, wfh,
     halfDay, paidLeave, leaveTaken, unpaidLeave, holidays, approvedLeave, unapprovedLeave,
     then every function from FILE 2, then the formula source as the last argument.
   - BEFORE compiling, strip legacy `const` declarations for any of the 17 variable names
     (regex `\bconst\s+<name>\s*=` → `<name> =`) so formulas saved by an older version
     still run. This backward compatibility is required.
   - The formula must `return` an object. Read `basic, hra, special, totalDeductions,
     netSalary, paidDays, leaveDeduction` with numeric coercion and 0 defaults.
   - `computedPaidDays = paidDays || Math.max(0, 26 - unpaidLeave - (halfDay * 0.5))`.
   - On ANY thrown error: console.error '[PayrollAdminService] Error evaluating formula'
     and fall back to the built-in calculation (see below) instead of failing the request.

d) calculateSalary(employeeId, month, year): Promise<SalaryCalculationResult>
   THE CALCULATION ALGORITHM — implement exactly, order matters:
   1. Load settings; throw 'Payroll settings not configured' if absent.
   2. Load `users/{employeeId}`; throw 'Employee not found' if absent.
      `grossSalary = employee.grossSalary || 0`.
   3. `totalDaysInMonth = new Date(year, month + 1, 0).getDate()`.
      monthStart = new Date(year, month, 1); monthEnd = new Date(year, month,
      totalDaysInMonth, 23, 59, 59).
   4. attendance-records: `.where('employeeId','==',id).where('clockIn','>=',monthStart)
      .where('clockIn','<=',monthEnd)`.
   5. leave-requests: `.where('employeeId','==',id).where('status','==','approved')
      .where('startDate','<=',monthEnd)` — exactly ONE range inequality at the query level
      (Firestore allows only one); the per-day loop below restricts to the target month.
      Document this in a comment.
   6. holidays: read the WHOLE collection once, build a Set of `YYYY-MM-DD` strings
      (handle both Firestore Timestamp and plain date values).
   7. From attendance, build a Set of present `YYYY-MM-DD` strings from `clockIn`.
   8. From approved leaves, expand startDate→endDate day by day, keeping only days whose
      year/month match the target month, into three Sets: wfh (leaveType === 'wfh'),
      halfDayLeaveDates (leave.halfDay === true || leaveType === 'half-day'),
      leaveDates (everything else).
   9. Classify EVERY day 1..totalDaysInMonth in this exact priority and `continue` after
      the first match:
        a. present in attendance        -> present++
        b. in wfh set                   -> wfh++
        c. in halfDay set               -> halfDay++
        d. in approved-leave set        -> approvedLeave++
        e. in holidays set              -> holiday++
        f. dayOfWeek === 0 (Sunday)     -> holiday++
        g. future day of the CURRENT month (year/month === today's) -> skip, count nothing
        h. otherwise                    -> unapprovedLeave++
      Attendance beats holidays and weekends: if the employee clocked in, it's present.
      Future days must not be counted as unapproved (it would over-deduct mid-month).
   10. leaveTaken = approvedLeave + unapprovedLeave
       paidLeave  = Math.min(leaveTaken, settings.allowedPaidLeaves)
       unpaidLeave = Math.max(0, leaveTaken - paidLeave)
       totalWorkingDays = totalDaysInMonth - holiday
   11. If `settings.salaryFormula` is set, use (c) with all 17 variables.
       Otherwise apply the built-in whiteboard formula:
         paidDays = Math.max(0, 26 - unpaidLeave - (halfDay * 0.5))
         leaveDeduction = (grossSalary * unpaidLeave) / 26
         netSalary = grossSalary - leaveDeduction
         basic = grossSalary * basicPercentage / 100   (same for hra, special)
         breakup = { basic, hra, special, totalDeductions: leaveDeduction, netSalary, leaveDeduction }
       NOTE the denominator is a hard-coded 26, NOT totalDaysInMonth. Keep it.
   12. Return { attendanceBreakdown, salaryBreakup, totalDaysInMonth, paidDays }.
       attendanceBreakdown carries all ten fields including paidDays.

e) generateSlips(employeeIds, month, year, generatedBy, accessMap?) -> EmployeeSalary[]
   - For each employeeId, FIRST dedupe: query `salary-slips` with employeeId+month+year
     `.limit(1)`; if a doc exists, skip it (never overwrite) and record the skip.
   - Load `users/{id}`; if missing, skip and record the skip.
   - calculateSalary(...); employeeCode = employee.employeeId || employeeId;
     slipNumber = `SAL-${year}${String(month + 1).padStart(2,'0')}-${employeeCode}`;
     accessGranted = accessMap?.[employeeId] ?? true.
   - Write with ONE shared batch: `batch.set(adminDb.collection('salary-slips').doc(), slip)`
     accumulating, and `await batch.commit()` whenever the count hits 499, then a fresh
     batch; commit the remainder at the end.
   - AFTER committing, for each generated slip whose accessGranted is true, send
     notifications (a failure here must never fail the request — wrap each in try/catch):
       * push: if `users/{id}.fcmToken` exists, `adminMessaging.send({ token, notification:
         { title: 'Salary Slip Available', body: `Your salary slip for ${MONTH_NAMES[month]} ${year}
         has been generated. Check your dashboard to view and download it.` }, data: {
         type: 'salary-slip', slipId, month: String(month), year: String(year), url: '/salary-slip' } })`
       * always add an in-app doc to `notifications`:
         { userId, type: 'salary-slip-generated', title: 'Salary Slip Available',
           message: '...Visit the Salary Slip page to view and download it.',
           read: false, createdAt: Timestamp.now(), metadata: { slipId, month, year },
           actionUrl: '/salary-slip', data: { url: '/salary-slip',
           type: 'salary-slip-generated', slipId, month, year } }
   - Return the generated slips. Log a summary line.

f) getSlips(filters: { employeeId?, month?, year?, accessGranted? }) — chain `.where(...)`
   conditionally, NO orderBy and NO limit, map docs to `{ id, ...data }`.
g) getSlipById(slipId) — doc get, `{ id, ...data } | null`.
h) deleteSlips(ids: string[]) — batch.delete in chunks of 499 (same pattern).
i) updateSlip(slipId, data) — `.update(data)`; the type must OMIT
   'id' | 'employeeId' | 'month' | 'year' | 'generatedAt' | 'generatedBy' | 'slipNumber' | 'employeeCode'.

j) Template CRUD on `salary-slip-templates`: getTemplates() (full collection),
   getTemplateById(id), createTemplate(t) (add + `updatedAt: Timestamp.now()`, return with id),
   updateTemplate(id, partial), deleteTemplate(id).
k) getActiveTemplate() — `.orderBy('updatedAt','desc').limit(1)`; if the collection is empty,
   seed it from DEFAULT_SALARY_SLIP_TEMPLATE via createTemplate and return that.

FILE 4 — src/services/payroll.service.ts  (CLIENT-side thin wrapper)

`export const payrollService = { ... }` — every method calls `authenticatedFetch` from
'@/lib/api-client' and returns null / [] / false on `!response.ok` rather than throwing
(a client-side helper must never throw). Methods:
  getSettings() -> GET  /api/payroll/settings
  saveSettings(settings) -> PUT   /api/payroll/settings                     (bool)
  calculateSalary(employeeId, month, year) -> POST /api/payroll/calculate   (SalaryCalculationResult)
  generateSlips(employeeIds, month, year) -> POST /api/payroll/generate     (returns json.slips)
  getSlips({ employeeId?, month?, year?, includeAll? }) -> GET /api/payroll/slips?<querystring>
  getSlipById(id) -> GET  /api/payroll/slips/{id}
  deleteSlip(id)  -> DELETE /api/payroll/slips/{id}
  updateSlip(id, data) -> PUT /api/payroll/slips/{id}
  updateSlipPan(slipId, pan) -> POST /api/payroll/slips/{id}/pan
  getTemplates() / getTemplateById(id) / createTemplate(t) / updateTemplate(id, t) / deleteTemplate(id)
      -> /api/payroll/templates and /api/payroll/templates/{id}
  saveAccessConfig(accessConfig) -> PATCH /api/payroll/settings   body { accessConfig }
  updateSlipAccess(slipId, accessGranted) -> PATCH /api/payroll/slips/{id} body { accessGranted }
  batchUpdateSlipAccess(updates: {slipId, accessGranted}[]) -> PATCH /api/payroll/slips/batch-access
Set `Content-Type: application/json` on every body-carrying request.

FILE 5 — src/lib/manager-access.ts

export async function getAccessibleEmployeeIds(userId: string, role: string): Promise<string[]>
  - role === 'admin'  -> all `users` where role in ['employee','manager'] -> doc ids
  - role === 'manager' -> `manager-hierarchies` where managerId == userId `.limit(1)`,
                          return `data.employeeIds ?? []` (empty array if no hierarchy doc)
  - otherwise -> []
export async function hasAccessToEmployee(userId, role, targetEmployeeId): Promise<boolean>
  - admin -> true; manager -> getAccessibleEmployeeIds(...).includes(target); else false

FILE 6 — scripts/migrate-employee-payroll-fields.ts

A runnable ts-node script that backfills missing payroll fields on EVERY `users` doc:
  doj -> null, pan -> null, designation -> '', grossSalary -> 0
Skip a doc only if ALL FOUR are already !== undefined. Batch `update` in chunks of 499,
stamp `updatedAt: new Date()`, and log processed / updated / skipped counts at the end.

ACCEPTANCE: `npx tsc --noEmit` must pass. Then show me a short summary table of the files
created. Do not build any UI yet.
```

---

## PROMPT 2 — API routes (12 endpoints)

```
Continuing the payroll module. Now create every API route. Same conventions as before:
`verifyAuthToken` + inline role check, service layer for all Firestore access, zod for
validation, ErrorResponses/handleApiError for errors.

Role rules are IDENTICAL across these routes — read them carefully:
- admin   : everything
- manager : read + write, but ONLY for employees in their `manager-hierarchies` doc.
            Guard every employee-scoped read/write with `hasAccessToEmployee(uid, role, target)`
            and return 403 'You can only view slips for your assigned employees' (adjust the
            verb per route) when it fails.
- employee: only their own data, and only slips with `accessGranted === true`.

1) src/app/api/payroll/settings/route.ts
   GET   — any authenticated user (employees need company settings to render their slip PDF).
           Returns the settings object raw (not wrapped) or `null`.
   PUT   — admin only, 403 'Only admins can update payroll settings'.
           zod: companyName min1, companyAddress min1, logoUrl string|null,
                basicPercentage/hraPercentage/specialPercentage number 0-100,
                allowedPaidLeaves int >=0, includePaidLeavesInPaidDays boolean default false,
                footerNote string, salaryFormula string optional.
           After parsing, enforce `basic + hra + special === 100`, else 400
           { error: 'Percentages must sum to 100' }. -> { success: true }
   PATCH — admin only. Body { accessConfig }. 400 'No valid fields to update' when undefined.
           Writes only accessConfig + updatedAt. -> { success: true }

2) src/app/api/payroll/calculate/route.ts
   POST — admin | manager, else 403 'Only admins and managers can calculate salary'.
   zod body: { employeeId: string min1, month: number int 0-11, year: number int 2020-2099 }.
   Calls payrollAdminService.calculateSalary. Returns SalaryCalculationResult RAW.
   Wrap in try/catch -> handleApiError.

3) src/app/api/payroll/generate/route.ts
   POST — admin | manager.
   zod body: { employeeIds: string[] min1, month 0-11 int, year 2020-2099,
               accessMap?: Record<string, boolean> }.
   Calls payrollAdminService.generateSlips(employeeIds, month, year, uid, accessMap).
   Returns { success: true, slips }.

4) src/app/api/payroll/slips/route.ts   — GET, the access-control hub. Read carefully.
   Query params: employeeId?, month?, year?, includeAll=true.
   Parse month/year with parseInt only when non-null AND non-empty.
   Branch on role:
   a. role === 'employee'
        -> force filters.employeeId = uid AND filters.accessGranted = true.
   b. role !== 'employee' AND `employeeId` param present
        -> if role === 'manager' && employeeId !== uid, require hasAccessToEmployee else 403.
           set filters.employeeId = employeeId;
           set accessGranted = true ONLY when includeAll is falsy.
   c. role === 'admin' AND includeAll === 'true'
        -> no employeeId filter, no accessGranted filter (all slips for the period).
   d. role === 'manager' AND includeAll === 'true'
        -> getAccessibleEmployeeIds(uid, role); fetch all slips for the period; filter IN MEMORY
           by accessibleIds.includes(s.employeeId) and by accessGranted when the caller asked
           for it. Return early. (Firestore `in` queries cap at 30 values — hence in-memory.
           Put that reason in a comment.)
   e. otherwise (admin/manager without employeeId)
        -> force filters.employeeId = uid and filters.accessGranted = true (self-service).
   DEFENSE IN DEPTH: after fetching, if filters.employeeId was set, re-filter the array by
   employeeId and (when accessGranted was required) by accessGranted === true. If that drops
   anything, `console.error('[Payroll] SECURITY VIOLATION — dropped N slip(s)...')`.
   Response: a RAW array of EmployeeSalary (no wrapper, no success flag).

5) src/app/api/payroll/slips/[id]/route.ts   — params is a Promise; await it.
   GET    — any authenticated user, then per-document checks:
            employee -> 403 unless slip.employeeId === uid AND slip.accessGranted === true.
            manager  -> if slip.employeeId !== uid, require hasAccessToEmployee else 403.
            404 'Salary slip not found'.
   DELETE — admin | manager. Returns { success: true }.
   PUT    — admin | manager. zod (all optional): grossSalary number, paidDays number,
            designation string, department string, pan string|null, doj string|null,
            salaryBreakup object { basic, hra, special, totalDeductions, netSalary all required;
            epf, esi, professionalTax, tds, loanRecovery, otherDeduction, leaveDeduction optional },
            attendanceBreakdown object with all ten attendance fields REQUIRED.
            Verify the slip exists first (404), then update. -> { success: true }
   PATCH  — admin | manager. zod { accessGranted: boolean } (required).
            Read the EXISTING doc first to get accessGranted, employeeId, month, year.
            Update accessGranted. Then notify the employee ONLY on a false -> true transition
            (`validatedData.accessGranted && !previousAccessGranted`):
              periodLabel = `${MONTH_NAMES[month]} ${year}`
              push if the user has an fcmToken: notification { title: 'Salary Slip Available',
                body: `Your salary slip for ${periodLabel} is now available. ...` }
                data { type: 'salary-slip', slipId: id, month: String(month), year: String(year),
                       url: '/salary-slip' }
              always add a `notifications` doc with type 'salary-slip-access',
                metadata { slipId, month, year }, actionUrl '/salary-slip'.
            FCM failures are caught and logged, never returned.
            -> { success: true, notificationSent: boolean }

6) src/app/api/payroll/slips/[id]/pan/route.ts   — POST
   The ONLY route in this module that uses the `withAuth(...)` wrapper; no role check,
   ownership is enforced in-handler: 403 'You can only update your own salary slip' when
   slip.employeeId !== the caller's uid; 404 when the slip is missing.
   zod body { pan: string regex /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i }.
   Writes the uppercased PAN to BOTH `salary-slips/{id}` and `users/{uid}` so future slips
   auto-populate. -> { success: true, pan: formattedPan }

7) src/app/api/payroll/slips/batch-access/route.ts   — PATCH, admin | manager.
   zod body { updates: { slipId: string; accessGranted: boolean }[] , min 1, max 500 }.
   Managers: fetch each targeted slip with Promise.all, skip missing docs, and 403
   'You can only update slips for your assigned employees' if ANY slip's employeeId is not
   in their accessible set. Then ONE `adminDb.batch()` of `batch.update(doc, { accessGranted })`
   and a single commit. NO notifications here (unlike the single-slip PATCH).
   -> { success: true, updatedCount }

8) src/app/api/payroll/templates/route.ts
   GET  — any authenticated user (employees render their slip from a template). Raw array.
   POST — admin only. zod { title min1, sections: [{ key min1, title min1, visible boolean,
          fields: [{ key min1, label min1, visible boolean }] }] min1,
          showFooterNote boolean, showSlipNumber boolean, footerNote? }.
          -> 201 with the created template.

9) src/app/api/payroll/templates/[id]/route.ts   — params awaited.
   GET    — any authenticated user; 404 { error: 'Template not found' }.
   PUT    — admin only; zod all-optional version of the POST schema; stamps updatedAt.
   DELETE — admin only. -> { success: true }

10) src/app/api/payroll/my-calculation/route.ts   — POST, any authenticated user.
    zod body { month 0-11, year 2020-2099 }. The employeeId is ALWAYS the caller's uid —
    never accept it from the body (comment this). Returns SalaryCalculationResult RAW.
    Purpose: the self-service page merges live attendance over a possibly stale slip snapshot.

11) src/app/api/payroll/verify-access/route.ts   — POST, deliberately NOT auth-gated.
    Raw handler (no verifyAuthToken): it is a pre-login gate for the payroll console.
    Body { password }. Compare against `process.env.PAYROLL_ACCESS_PASSWORD` with a
    constant-time comparison (crypto.timingSafeEqual on equal-length buffers).
    Fail secure: if the env var is unset -> 403 { success: false, error: 'Access not
    configured. Contact administrator.' } and console.warn. Missing password -> 400.
    Wrong -> 401 { success: false, error: 'Incorrect password' }. Right -> { success: true }.
    ADD (this is an improvement over the reference implementation): a simple in-memory
    per-IP attempt throttle — max 10 attempts per 5 minutes -> 429 'Too many attempts.
    Try again later.'

12) src/app/api/payroll/cleanup-slips/route.ts   — POST, admin | manager.
    zod body { month 0-11, year 2020-2099 }.
    Fetch all slips for the period; managers keep only slips whose employeeId is in
    getAccessibleEmployeeIds. Delete via deleteSlips (499-chunked batching).
    -> { success: true, deletedCount, message: `Successfully deleted ${n} salary slip(s)` }
    When nothing matched -> deletedCount 0 and message 'No salary slips found for this period'.
    Log uid, role, month, year, deletedCount. Note in a comment: silent and irreversible —
    no soft delete, no undo, no employee notification, and it does NOT touch
    settings/accessConfig/templates/formulas.

ACCEPTANCE: `npx tsc --noEmit` passes and `npm run lint` is clean. Then list every route
with its method, required role, and response shape in a table. Still no UI.
```

---

## PROMPT 3 — Admin Payroll Panel UI (5 tabs)

```
Now build the admin payroll console — the main UI. Route: src/app/admin/salary-config/page.tsx
(client component). Wrap the whole page in <PayrollAccessGate> (PROMPT 5; stub it for now
with a passthrough that you will replace) and render:

PAGE HEADER — icon tile with IndianRupee, h1 "Salary Configuration",
subtitle "Configure payroll settings, employee salaries, and generate salary slips".

FIVE TABS (use the existing Tabs/TabsList/TabsTrigger/TabsContent from '@/components/ui/tabs').
Each trigger shows a lucide icon + label:
  1. 'employees'  Users          "Employee Salaries"
  2. 'generate'   FileText       "Generate Slips"
  3. 'templates'  LayoutTemplate "Slip Templates"
  4. 'settings'   Settings       "Payroll Settings"
  5. 'formula'    FunctionSquare "Logic"
State: settings, employees, loading, selectedEmployee, modalOpen, modalLoading, activeTab.
On mount: fetch settings + fetch active employees in parallel.
fetchEmployees uses authenticatedFetch('/api/employees'), reads `json.data ?? json`, keeps
only status === 'active', sorts by name (localeCompare).

TAB 1 — EMPLOYEE SALARIES
Card with header "Configure Employee Salaries" + "Set DOJ, PAN, Designation, and Gross
Salary for each employee", then a `table-fixed` table:
  columns # | Name (15%) | Emp ID (10%) | Department (12%) | Designation (12%) | DOJ (10%) |
  PAN (12%) | Gross Salary (12%) | Actions (10%, right-aligned, `sticky right-0` with
  `shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]` so it stays visible while scrolling horizontally)
  Name is a blue underline-on-hover button that opens the AttendanceCalendarModal for that
  employee (lazy `dynamic(() => import(...), { ssr: false })`, spinner fallback).
  DOJ rendered via toLocaleDateString('en-IN'); PAN in `font-mono`; gross salary as
  ₹ with `toLocaleString('en-IN', { maximumFractionDigits: 0 })`; '-' when empty.
  Actions = outline sm "Configure" button -> opens SalaryConfigModal.
  Saving PUTs /api/employees/{id} with { doj, pan, department, designation, grossSalary }
  then refreshes the list.

COMPONENTS TO CREATE (src/components/payroll/):

a) SalaryConfigModal.tsx — Dialog, `sm:max-w-[500px] max-h-[80vh] overflow-y-auto`, title
   "Configure Salary - {name}". react-hook-form + zodResolver. Fields in order: Date of
   Joining (type date), PAN Number (placeholder ABCDE1234F, regex
   /^[A-Z]{5}[0-9]{4}[A-Z]$/, helper text "Format: 5 letters, 4 digits, 1 letter"),
   Department, Designation (required), Gross Salary (number, min 0).
   Reset the form from `employee` when it opens. Footer: outline "Cancel" +
   submit "Save" (loading prop when isLoading).

b) PayrollSettingsForm.tsx — `max-w-2xl space-y-6` with four h3 sections:
   1. "Company Information": Company Name, Company Address (Textarea rows 3), Logo URL optional.
   2. "Salary Breakup Percentages": `grid grid-cols-3 gap-4` Basic % / HRA % / Special %.
      Below it a live badge showing the total: `bg-green-100 text-green-800` when the three
      sum to exactly 100, otherwise `bg-yellow-100 text-yellow-800` with "(Must equal 100%)".
      Block submit and toast an error when the total is not 100.
   3. "Leave Policy": Allowed Paid Leaves per Month (int >= 0) and a checkbox row
      `flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border
      border-gray-200 dark:border-gray-700` labelled "Include Allowed Paid Leaves in Paid
      Days count", plus a `text-xs text-gray-500` helper line.
   4. "Footer Note": Textarea rows 2.
   Load current settings on mount; submit via payrollService.saveSettings (normalise an
   undefined logoUrl to null). Success toast, then call onSaveSuccess.

c) GenerateSlipsPanel.tsx — THE BIG ONE. Props { settings, onGenerationComplete?,
   onNavigateToSettings? }. Layout top to bottom:
   1. If `!settings`: amber warning banner "Payroll settings not configured" + outline sm
      button "Go to Payroll Settings" -> onNavigateToSettings().
   2. Card "Select Period": flex row `gap-4 items-end` with a Month <select> (12 names,
      value = 0-indexed month, default `new Date().getMonth()`) and a Year <select>
      ([2024, 2025, 2026, 2027], default current year), plus a "Calculate All" button
      (loading={calculating}, disabled when !settings).
   3. While calculating: a progress card — spinner, "Calculating salaries…", `{current} / {total}`,
      a rounded progress bar whose fill uses
      `background: 'linear-gradient(90deg, #3b82f6, #2563eb)'` with a % label, and a stats row
      `✓ N success` (text-xs gray) / `✗ N failed` (text-xs red).
   4. Card "Employees (N)" with an "Enable All" / "Disable All" outline sm button, and a
      table: # | Access | Name | Employee ID | Department | Gross Salary | Net Salary |
      Paid Days | Actions.
      - Access = a custom green toggle: `<button className="w-10 h-6 rounded-full">`
        `bg-green-500` when on / `bg-gray-300 dark:bg-gray-600` when off, with a white knob
        `absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow` translated
        `translate-x-4` when on. Toggling updates local state, persists with
        payrollService.updateSlipAccess(slipId, value) when a slip exists, and always saves
        the whole map via payrollService.saveAccessConfig under the key
        `${year}-${month}` (NOT zero-padded).
      - Name is a link-button opening AttendanceCalendarModal (same lazy import as tab 1).
      - Row highlight `bg-blue-50 dark:bg-blue-900/20` when selected.
      - Actions: outline sm "Calculate" (per-employee payrollService.calculateSalary, stores
        the result and shows a spinner in that row), outline sm "Edit" (opens
        EditSalarySlipModal), outline sm "Preview" (disabled until calculated, opens the
        preview dialog), and "Clean Up" — destructive-styled red when a slip exists, greyed
        (`text-gray-400 border-gray-200`) when not; it deletes that single slip after a
        window.confirm.
      - Net Salary / Paid Days cells stay '-' until that row is calculated (or a slip exists).
   5. Bottom row `flex justify-between items-center gap-4`:
      "Clean Up Slips" (size lg, red, deletes the whole period after a double confirm via
      POST /api/payroll/cleanup-slips) and
      "Generate & Save (N slips)" (size lg, blue, disabled when nothing is selected) —
      POST /api/payroll/generate with { employeeIds, month, year, accessMap } where
      accessMap comes from the toggles. On success: toast, refresh slips, onGenerationComplete().
   6. Preview dialog `max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto`, title
      "Salary Slip Preview", containing a "Slip Template:" <select> listing the templates
      and a `overflow-x-auto` wrapper around <SalarySlipPreview>.
   Data loading: on month/year change, load slips for the period with
   payrollService.getSlips({ month, year, includeAll: true }) and map slipId per employee;
   seed the toggles from payroll-settings.accessConfig[`${year}-${month}`] when present.
   Also fetch templates once for the preview dropdown.
   Use a `useRef` guard so the saved access config is applied only once per period.

d) EditSalarySlipModal.tsx — Dialog `sm:max-w-[950px] max-h-[90vh] overflow-y-auto`, title
   "Edit Salary Slip — {name} (Month Year)". Template-driven: read the passed
   `template?: SalarySlipTemplate | null` and honour section.visible and field.visible,
   falling back to showing everything when no template is given. Sections:
   1. "Employee Details" — read-only Employee ID + Name, then editable Gross Salary,
      Designation, Department, PAN, DOJ in `grid grid-cols-3 gap-3`.
   2. "Attendance" — `grid grid-cols-4 gap-3` number inputs: Present, WFH, Half Day, Holiday,
      Paid Leave, Leave Taken, Unpaid Leave, Paid Days (step 0.5, highlighted
      `bg-blue-50 dark:bg-blue-900/20`).
      WATCH present/wfh/halfDay/paidLeave and auto-set
      `paidDays = present + wfh + paidLeave + halfDay * 0.5` in a useEffect.
   3. "Earnings" and "Deductions" side by side in `grid grid-cols-2 gap-4` — Basic/HRA/Special
      Allowance, and EPF, ESI / Health Insurance, Professional Tax, TDS / Income Tax,
      Loan Recovery, Other Deduction, Leave Deduction. All numbers >= 0.
   4. Live totals bar `bg-gray-50 dark:bg-gray-800 border rounded-lg p-4`,
      `grid grid-cols-3 gap-4 text-sm`: Total Earnings (green, bold), Total Deductions
      (red), Net Salary (`text-blue-600 dark:text-blue-400 text-lg`, bold) where
      netSalary = totalEarnings - totalDeductions.
   Footer: outline "Cancel" + submit "Save Changes". Saving PUTs /api/payroll/slips/{id}.

e) TemplateManager.tsx — header row with title "Salary Slip Templates" + description and a
   sm "New Template" button (Plus icon). List card `bg-white dark:bg-gray-800 rounded-lg
   shadow`: loading state "Loading templates…"; empty state with an outline "Create Template"
   button; otherwise a `divide-y` list where each row shows the template title (bold, truncate)
   and a `text-xs text-gray-500` meta line like
   `3/4 sections visible · 12 fields shown · footer note on · slip number shown`.
   Row actions: ghost "Preview", icon buttons for edit (Pencil), duplicate (Copy),
   delete (Trash2, `text-red-600 hover:bg-red-50`) — delete uses window.confirm.
   EDITOR — a right-side Radix drawer (do NOT use the shared Dialog wrapper):
   Overlay `fixed inset-0 bg-black/50 z-40`; Content `fixed inset-y-0 right-0 w-full
   max-w-2xl bg-white dark:bg-gray-800 z-50 overflow-y-auto shadow-xl`, with
   onPointerDownOutside/onInteractOutside prevented so a stray click doesn't lose work.
   Sticky header, then body `p-4 space-y-6`: Template Name input; one card per section
   `border rounded-lg` with a header row (`bg-gray-50 dark:bg-gray-900/40`) holding the
   section visibility checkbox, the section title (add `text-gray-400 line-through` when the
   section is hidden) and an `N/M fields` counter; then one row per field with a checkbox
   (disabled while the section is hidden), the field key in `text-xs font-mono`, and an
   editable label input (`h-8 text-sm`) laid out `grid grid-cols-[120px_1fr] gap-2`.
   Bottom block: checkboxes "Show footer note" and "Show slip number", plus a footer-note
   override Textarea shown only when the footer note is on. Sticky footer with "Cancel"
   (outline) and "Save Changes"/"Create Template".
   PREVIEW dialog rendering a static mock slip (Amit Sharma / EMP001 / Engineering) that
   respects the section + field visibility, so admins can see the effect before saving.
   Services: payrollService.getTemplates/createTemplate/updateTemplate/deleteTemplate.

f) FormulaEditor.tsx — the salary formula editor. Title "Salary Calculation Logic" with a
   FunctionSquare icon, subtitle "Define how each component is calculated".
   Line keys, in this EXACT order (dependencies first):
     INPUTS (self-referencing — the system supplies them):
       grossSalary, totalDaysInMonth, basicPercentage, hraPercentage, specialPercentage,
       allowedPaidLeaves, present, wfh, halfDay, holidays, approvedLeave
     CALCULATED:
       totalWorkingDays, unapprovedLeave, paidLeave, leaveTaken, unpaidLeave, paidDays,
       proratedGross, basic, hra, special, totalDeductions, netSalary
   Default expressions:
       grossSalary:'grossSalary'  totalDaysInMonth:'totalDaysInMonth'
       basicPercentage:'basicPercentage'  hraPercentage:'hraPercentage'
       specialPercentage:'specialPercentage'  allowedPaidLeaves:'allowedPaidLeaves'
       present:'present'  wfh:'wfh'  halfDay:'halfDay'  holidays:'holidays'
       approvedLeave:'approvedLeave'
       paidLeave: 'MIN(approvedLeave + unapprovedLeave, allowedPaidLeaves)'
       leaveTaken: 'approvedLeave + unapprovedLeave'
       unpaidLeave: 'MAX(0, approvedLeave + unapprovedLeave - allowedPaidLeaves)'
       unapprovedLeave: 'totalWorkingDays - present - wfh - approvedLeave - (halfDay * 0.5)'
       totalWorkingDays: 'totalDaysInMonth - holidays'
       paidDays: '26 - unpaidLeave - (halfDay * 0.5)'
       proratedGross: 'grossSalary - (grossSalary * unpaidLeave) / 26'
       basic: 'proratedGross * (basicPercentage / 100)'
       hra: 'proratedGross * (hraPercentage / 100)'
       special: 'proratedGross * (specialPercentage / 100)'
       totalDeductions: '0'
       netSalary: 'basic + hra + special - totalDeductions'
   SERIALISATION — must round-trip with the server:
     generateFormulaString() emits, for each key, `key = expression;` EXCEPT for the 15
     input variables, which are emitted as `const key = expression;` (they're function
     parameters), then ends with
     `return { paidDays, basic, hra, special, totalDeductions, netSalary };`
     parseFormulaToExpressions() uses the regex `/(?:const\s+)?(\w+)\s*=\s*(.+?);/g` so it
     reads BOTH formats.
   UI: a collapsible "Quick-Insert Reference" panel (Plus / ChevronUp-Down toggle) with
   colour-coded chip groups that insert text at the cursor:
     Variables (indigo chips), Components (emerald), Operators & Brackets (amber squares
     `w-9 h-9 rounded-lg font-bold` for + − × ÷, violet for parentheses, plus slate "100"
     and "0"), and Functions (purple `font-mono` chips grouped as Logical / Math / Text /
     Date / Statistical / Conditional, inserting `FN(`).
   Then the formula table: `table-fixed min-w-[700px]` with a colgroup of 180px / 70% / 80px
   and columns Field | Expression | Actions. The Field cell shows the label (semibold) and
   the description (`text-xs text-gray-500`). The Expression cell shows a `font-mono`
   `key =` prefix followed by a borderless input (`bg-transparent border-0 focus:ring-0`);
   Tab / ArrowRight / Enter accept the ghost-text autocomplete suggestion, Escape dismisses
   it, ArrowUp/ArrowDown move through the suggestion dropdown (show it only when >1 match).
   The Actions cell has a ghost X button (`text-gray-400 hover:text-red-500`) to clear a line.
   Focused row gets `bg-blue-50 dark:bg-blue-900/20`.
   Footer buttons: "Save Formula" (default, Save icon, lg) — serialises and calls
   payrollService.saveSettings({ ...settings, salaryFormula }) (strip id/updatedAt);
   "Reset to Default" (outline, RotateCcw); "Clear All" (destructive, Trash2).
   Toast on save / reset / an incomplete formula.
   Also create src/components/payroll/FormulaAutocomplete.tsx exporting
   `FormulaAutocomplete` (a positioned dropdown of matches, keyboard-navigable) and
   `SUGGESTION_LIBRARY` (the list of variable names + function signatures used for matching).

TABS 3 and 4 are thin wrappers: the Templates tab renders <TemplateManager/> inside a card
with `p-6`; the Logic tab renders <FormulaEditor settings={settings}
onSaveSuccess={fetchSettings}/>.

ACCEPTANCE: `npx tsc --noEmit` and `npm run lint` clean; `npm run build` succeeds.
Then screenshot-free summary: list each component with its props and the services it calls.
```

---

## PROMPT 4 — Employee side: salary slip page, PDF, PAN capture

```
Now the employee-facing half. Route: src/app/salary-slip/page.tsx (client component).

PURPOSE: a user sees ONLY their own slips, and only the ones an admin has granted.
Enforce that three times: at the API (already built), in this page's filter, and via the
Firestore rule in PROMPT 5.

DATA
- payrollService.getSlips({ employeeId: user.uid }) then CLIENT-SIDE re-filter to
  `slip.employeeId === user.uid && slip.accessGranted === true`. If the re-filter drops
  anything, console.error('[SalarySlipPage] SECURITY VIOLATION — dropped N slip(s)').
  Keep the raw list in `allSlips` and the filtered one in `slips`.
- payrollService.getSettings() and payrollService.getTemplates() (for rendering).
- Sort slips by year desc, then month desc.
- Non-admin/non-manager users with ZERO accessible slips get redirected to /dashboard with
  an error toast.
- Period filters initialise from `sessionStorage.getItem('salarySlipMonth' | 'salarySlipYear')`
  and those keys are REMOVED after reading (so notification deep-links land on the right
  period but don't stick). Listen for a window event named 'salarySlipFilterChange' that
  carries the same month/year, so a notification click can retarget the page without a remount.

LAYOUT
- Header: h1 "Salary Slips" (`text-2xl font-bold`), subtitle "View and download your salary slips".
- Loading state: card with a blue spinner (`animate-spin rounded-full h-8 w-8 border-b-2
  border-blue-600 mx-auto mb-4`) and "Loading your information...".
- Filters card: flex `gap-4 items-end flex-wrap` with Month <select> ("All Months" + the 12
  names, value = 0-indexed index), Year <select> ("All Years" + 2024..2027), a "Refresh"
  button (`mt-5`), and a "Clear Filters" outline button (only when a filter is active) that
  resets both to undefined.
- Slips table card. Columns: Slip Number | Employee | Month/Year | Paid Days | Net Salary | Actions.
  Three empty/loading states:
    * "Loading..." (`p-8 text-center text-gray-500`)
    * no slips at all -> centred document SVG `w-16 h-16 text-gray-400 dark:text-gray-600`,
      heading "No Salary Slips Available" `text-lg font-semibold`, copy explaining slips appear
      "once they are generated and access is granted by your administrator"
    * no slips for the filtered period -> "No salary slips for the selected period"
  Row actions: outline sm "View" and primary sm "Download".
- Preview dialog `max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto`, title
  "Salary Slip Preview", rendering <SalarySlipPreview slip={...} settings={...}
  template={selected} hideBreakdown /> inside an `overflow-x-auto` wrapper, footer
  `flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4` with outline "Close" and a
  "Download PDF" button. If settings haven't loaded yet, show a short fallback message.
- A template <select> so the employee can preview how each template renders.

PAN CAPTURE FLOW (required — Indian payslips need a PAN)
- Before a View or Download, check `slip.pan`. If it is empty, open a dialog `max-w-md`,
  title "Enter PAN Number", explaining why it's needed, with an input that uppercases input
  and has maxLength={10}, placeholder ABCDE1234F, an inline red error `text-xs mt-1`, and
  footer buttons outline "Cancel" + "Save & Continue" (disabled until length is 10).
- Validate against /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i. On save: PUT /api/auth/profile AND
  payrollService.updateSlipPan(slip.id, pan), store the pending action as
  'view' | 'download', then RESUME that action automatically once the save succeeds.

FRESHNESS (do this before rendering the preview or the PDF)
- Merge the live profile: GET /api/auth/profile (PAN/designation may have changed since
  generation).
- Merge live attendance: POST /api/payroll/my-calculation with { month, year } and replace
  the slip's attendanceBreakdown / salaryBreakup / paidDays with the fresh values, so a slip
  generated mid-month doesn't display stale numbers.

FILE — src/components/payroll/SalarySlipPreview.tsx
Props: { slip: EmployeeSalary; settings: PayrollSettings; template?: SalarySlipTemplate | null;
forPDF?: boolean; hideBreakdown?: boolean }.
Root element MUST be `<div id="salary-slip-preview" className="text-black">` with an inline
A4 style: `width: '210mm'`, `minHeight: '297mm'`, `fontFamily: 'Arial, sans-serif'`, and a
company letterhead background — `backgroundImage: url('/images/letter-head.jpeg')` with
`backgroundSize: '100% 100%'` — plus print-safe padding (about 180px top, 120px bottom,
60px sides) so content sits inside the letterhead. If the other app has no letterhead image,
make the background path a prop or drop it and use a plain white sheet with a border.
Sections, in order, each gated by the template's section.visible and using the template's
field LABELS:
 1. Title `border-b-2 border-gray-800 pb-2 mb-6`: centred "SALARY SLIP" (`text-xl font-bold`)
    and "Pay Slip for {MONTH_NAMES[month]}, {year}".
 2. Employee Details `grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm`; each row is
    `flex justify-between` with the label `text-gray-700` and the value `font-semibold`.
 3. Attendance Details `border-t border-gray-300 pt-4 mb-6`, bold h3, fields in
    `grid grid-cols-3 gap-x-4 gap-y-1.5 text-sm`.
 4. Earnings and Deductions side by side `grid grid-cols-2 gap-8`; each column has a centred
    bold h3 with `border-b border-gray-400 pb-2`, then `space-y-2 text-sm` rows
    (`flex justify-between`), and a bold total `border-t border-gray-400 pt-2 mt-2`.
 5. Net Salary box `bg-gray-200 p-4 rounded mb-6`, `flex justify-between items-center`,
    label `text-lg font-bold`, amount `text-xl font-bold`.
 6. Footer `text-xs text-gray-600 italic mt-8 pt-4 border-t border-gray-300` using
    `template.footerNote || settings.footerNote || '<default>'>`; then the slip number
    `text-xs text-gray-500 mt-4` — both only when the template enables them.
 CALCULATION BREAKDOWN (screen only, hidden when forPDF or hideBreakdown): a chevron toggle
 that reveals the worked arithmetic in a blue card `bg-blue-50 border border-blue-200
 rounded-lg p-4` (label `text-xs font-semibold text-blue-700 uppercase`, formula in
 `font-mono text-xs text-blue-900 font-bold`) plus gray `bg-gray-50 rounded-lg p-4 text-xs`
 cards for Given / Calculation / Breakdown, showing
 leaveDeduction = grossSalary * unpaidLeave / 26 and netSalary = grossSalary - leaveDeduction.
 Helpers: formatCurrency via Intl en-IN INR with 0 decimals; formatDate via
 toLocaleDateString('en-IN').

FILE — src/components/payroll/SalarySlipPDF.tsx
Export `async function generateSalarySlipPDF(slip, settings, template?)`. NOT a component.
Implementation:
 1. Dynamic `import('react')`, `import('react-dom/client')`, `import('html2canvas')`,
    `import('jspdf')` so none of them land in the initial bundle.
 2. Create an offscreen container `position: fixed; left: -9999px; width: 210mm`, mount
    <SalarySlipPreview forPDF /> into it with createRoot, and wait ~500ms for fonts/images.
 3. `html2canvas(node, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null })`.
 4. new jsPDF portrait / mm / a4. If the image fits one page (`pdfWidth - 20` wide with 10mm
    margins) draw it; otherwise slice the canvas into page-height chunks via temporary
    canvases and add a page per chunk.
 5. Save as `SalarySlip_{employeeCode}_{MONTH_NAMES[month]}_{year}.pdf`.
 6. ALWAYS unmount the root and remove the container in a `finally` block — leaking a hidden
    DOM tree per download is a real bug, not a nicety.

ACCEPTANCE: `npx tsc --noEmit`, `npm run build` clean. Then describe the exact click path
an employee takes from a push notification to a downloaded PDF.
```

---

## PROMPT 5 — Password gate, sidebar, security rules, notifications, verification

```
Final part. Wire the module into the app shell.

1) src/components/ui/PasswordAccessGate.tsx — a reusable client-side page lock.
   Config: { title, subtitle, icon: LucideIcon, apiEndpoint, storageKeyPrefix, gradient? }
   (gradient defaults to 'from-violet-600 via-purple-600 to-indigo-700').
   Props: { config, children }.
   State: unlocked, password, verifying (starts true), showPassword, rememberMe.
   Behaviour:
   - localStorage keys EXACTLY `${storageKeyPrefix}_access_password` (stores the password)
     and `${storageKeyPrefix}_access_remember` ('true'). For payroll: `payroll_access_password`
     / `payroll_access_remember`.
   - On mount ONCE (guard with a useRef): if a saved password exists AND was remembered,
     auto-verify it silently (no toasts on failure); otherwise set verifying false and show
     the prompt. On a failed auto-verify, clear both keys and reset rememberMe.
   - handleSubmit: empty -> toast "Please enter a password". POST to config.apiEndpoint with
     authenticatedFetch and JSON body { password: pw.trim() }; success is `data.success === true`.
     On success: persist or clear the keys per rememberMe, set unlocked, toast "Access granted".
     On failure: toast `data.error || 'Incorrect password'` (or "Failed to verify password"
     on a network error) and clear the input.
   Rendering:
   - Unlocked: a floating pill `fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full
     bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2.5 text-xs shadow-lg`
     with a LogOut icon and the label "Lock Panel"; clicking clears the keys, re-locks, and
     toasts "{title} locked". Then render {children}.
   - Verifying on mount: full-screen centred `bg-gray-50 dark:bg-gray-900` with a violet
     spinner and "Verifying saved credentials...".
   - Locked: full-screen centred `max-w-md` card `bg-white dark:bg-gray-800 rounded-2xl
     shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden`:
       * gradient header with two or three decorative blurred blobs (`bg-white/5 blur-xl`,
         `bg-pink-400/10 blur-2xl`, `bg-amber-300/10 blur-lg`), a circular icon badge
         `w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm ring-2 ring-white/20` holding
         the config icon, an h1 title `text-2xl font-extrabold text-white`, and the subtitle
         in `text-purple-200 text-sm` prefixed with a lock emoji;
       * an amber security notice `flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20
         border border-amber-200 dark:border-amber-800 rounded-lg` with a ShieldAlert icon;
       * a password input with a left Lock icon and a right Eye/EyeOff visibility toggle;
       * a custom "Remember me" checkbox (`w-5 h-5 rounded border-2`, violet when checked,
         inline SVG check, role="checkbox" and keyboard-operable);
       * a full-width gradient submit button `bg-gradient-to-r from-violet-600 to-indigo-600
         hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-400
         text-white font-semibold py-2.5` showing a spinner + "Verifying..." while busy,
         otherwise a Lock icon + "Unlock {title}"; disabled when verifying or the field is empty.
   Add a code comment stating the honest security posture: this is a UX speed bump over an
   already-authenticated session, the password is stored in plaintext in localStorage, and
   there is NO server session or expiry — the real authorization is the role check on the API
   routes. Don't imply it is more than that.

2) src/components/payroll/PayrollAccessGate.tsx — a thin wrapper:
   config = { title: 'Payroll Panel', subtitle: 'Password required to access this page',
   icon: IndianRupee, apiEndpoint: '/api/payroll/verify-access', storageKeyPrefix: 'payroll' }
   then `return <PasswordAccessGate config={config}>{children}</PasswordAccessGate>`.
   The admin page renders <PayrollAccessGate> around everything.

3) Sidebar — add two entries to the nav data array (match the existing item shape
   `{ title, url, icon, items, requiresRole?, hideOnMobile?, dynamicVisibility? }`):
   In the everyday/management section:
     { title: 'Salary Slip', url: '/salary-slip', icon: Icons.SalarySlipIcon, items: [],
       dynamicVisibility: true }              // a wallet-style lucide icon
   In the ADMIN section:
     { title: 'Payroll Panel', url: '/admin/salary-config', icon: Icons.SalaryConfigIcon,
       items: [], requiresRole: ['admin', 'manager'] }   // a DollarSign-style icon
   Then resolve dynamicVisibility for '/salary-slip' inside the sidebar component: show the
   item only after a Firestore onSnapshot on
   `query(collection(db,'salary-slips'), where('employeeId','==',user.uid),
   where('accessGranted','==',true))` returns at least one document
   (`slipCheckDone && hasAccessibleSlips === true`), unsubscribing on unmount. This is the
   one place the client SDK reads payroll data directly — it is safe ONLY because of the rule
   in the next step. Add a comment saying so.

4) firestore.rules — add exactly these blocks (keep your existing helper functions):
   match /payroll-settings/{settingsId} {
     allow read: if isManager();          // managers/admins preview slips
     allow write: if isAdmin();
   }
   match /salary-slips/{slipId} {
     // self-service realtime listener + own slip; note accessGranted is enforced in the API
     allow read: if isAuthenticated() && resource.data.employeeId == request.auth.uid;
     allow read, write: if isAdmin();
   }
   match /salary-slip-templates/{templateId} {
     allow read: if isAuthenticated();    // employees render their slip from a template
     allow write: if isAdmin();
   }
   IMPORTANT: the reference implementation forgot the templates rule entirely, so it fell
   through to the catch-all `allow read, write: if false` and only worked because the Admin
   SDK bypasses rules. Don't repeat that.
   Managers reach other employees' slips ONLY through API routes (Admin SDK), never through
   these rules — keep it that way.
   Also note in your summary: the salary-slips employee read rule does NOT check
   accessGranted (the sidebar listener needs to read it to decide), so an employee who
   already knows their own slip doc id could read an ungranted slip directly. If that matters
   to you, tighten the rule to `&& resource.data.accessGranted == true` and move the sidebar
   check to an API call instead.

5) Migration script docs — add an npm script that runs
   `ts-node scripts/migrate-employee-payroll-fields.ts` (name it per the repo's existing
   script convention, e.g. "migrate:employee-payroll"). Mention it must be run once before
   generating slips, or every employee's grossSalary will be 0 and every slip will be ₹0.

6) Notifications — confirm both writers exist and are wired:
   - generate -> type 'salary-slip-generated'
   - PATCH /slips/[id] false->true -> type 'salary-slip-access' (never on revoke)
   Both must set `actionUrl: '/salary-slip'` and `data.url: '/salary-slip'`, and the
   notification click handler must set sessionStorage salarySlipMonth/salarySlipYear and
   dispatch the 'salarySlipFilterChange' window event before navigating.

7) FINAL VERIFICATION — do all of it and report honestly what passed and what didn't:
   - `npx tsc --noEmit` clean
   - `npm run lint` clean
   - `npm run build` succeeds
   - Write ONE runnable check with no test framework: `scripts/payroll-check.ts`, run with
     ts-node, that asserts the pure calculation rules against fixed inputs:
       * month is 0-indexed end to end (month 5 => "June", slip number SAL-202606-EMP001)
       * a month with 2 unpaid leave days and gross 26000 produces leaveDeduction 2000 and
         netSalary 24000 (26-day denominator, NOT totalDaysInMonth)
       * paidDays = 26 - unpaidLeave - halfDay * 0.5 (1 half day => 25.5)
       * with allowedPaidLeaves = 2 and leaveTaken = 3, paidLeave = 2 and unpaidLeave = 1
       * the DEFAULT formula from FormulaEditor round-trips: generateFormulaString ->
         evaluateSalaryFormula -> same numbers as the built-in whiteboard formula
       * SUM/IF/ROUND/MAX/MIN from the formula library return the Excel-expected values,
         and an intentional nonsense formula falls back to the built-in result instead of
         throwing
     Print PASS/FAIL per assertion and exit non-zero on any failure.
   - Then give me a final report: files created, the two routes a human uses, and any
     deviation you had to make from this spec (and why). Do not claim something works if the
     command didn't actually pass — paste the real output.

8) KNOWN GAPS in the reference implementation — carry them into your summary as follow-ups,
   do not silently "fix" them unless I ask:
   - No pagination anywhere; getSlips/getTemplates/getAccessibleEmployeeIds have no limit.
   - Auth style is inconsistent (`verifyAuthToken` + inline role checks everywhere except the
     PAN route which uses a wrapper). Pick ONE style and use it consistently in your app.
   - The batch-access endpoint uses a single unchunked batch capped at 500 — exactly the
     Firestore limit, so it has zero headroom. Chunk it at 499 like the others.
   - Cleanup is irreversible: no soft delete, no undo, no backup, no employee notice.
   - accessConfig toggles are keyed `${year}-${month}` (unpadded) client-side while the API
     stores separate month/year numbers — easy place to introduce an off-by-one. Keep the
     client key format consistent or drop the client-side cache entirely.
```

---

## Run order

1. SHARED CONTEXT (always first)
2. PROMPT 1 → confirm `tsc` passes
3. PROMPT 2 → confirm routes compile
4. PROMPT 3 → confirm the console renders (needs PROMPT 5's gate; the stub is fine)
5. PROMPT 4 → employee side
6. PROMPT 5 → gate, sidebar, rules, migration script, verification

If the AI starts drifting or truncating, re-paste the SHARED CONTEXT block before continuing.
Ask for one file at a time if it keeps producing partial output.
