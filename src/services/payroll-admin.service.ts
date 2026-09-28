import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as FormulaFunctions from '@/lib/formula-functions';
import {
  FORMULA_VARIABLES,
  buildSlipNumber,
  builtInResult,
  classifyDays,
  computeLeavePolicy,
  dayKey,
  numeric,
  toDate,
  type FormulaVariables,
} from '@/lib/payroll-calc';
import {
  DEFAULT_SALARY_SLIP_TEMPLATE,
  MONTH_NAMES,
  type EmployeeSalary,
  type PayrollSettings,
  type SalaryBreakup,
  type SalaryCalculationResult,
  type SalarySlipTemplate,
} from '@/types/payroll.types';

/** Firestore hard limit is 500 ops per batch; leave one slot of headroom. */
const BATCH_LIMIT = 499;

const SETTINGS = 'payroll-settings';
const SLIPS = 'salary-slips';
const TEMPLATES = 'salary-slip-templates';

export const payrollAdminService = {
  /* ------------------------------------------------------------- settings */

  async getSettings(): Promise<PayrollSettings | null> {
    const snapshot = await adminDb.collection(SETTINGS).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<PayrollSettings, 'id'>) };
  },

  async saveSettings(settings: Partial<PayrollSettings>): Promise<PayrollSettings> {
    const payload = { ...settings, updatedAt: Timestamp.now() };
    delete payload.id;

    const existing = await adminDb.collection(SETTINGS).limit(1).get();
    if (existing.empty) {
      const created = await adminDb.collection(SETTINGS).add(payload);
      return { id: created.id, ...payload } as PayrollSettings;
    }

    const id = existing.docs[0].id;
    await adminDb.collection(SETTINGS).doc(id).update(payload);
    return { id, ...payload } as PayrollSettings;
  },

  /* -------------------------------------------------------------- formula */

  /**
   * Runs an admin-authored salary formula. Never throws: a broken formula (or a
   * thrown IFS) degrades to the built-in calculation so payroll never dead-ends.
   */
  evaluateSalaryFormula(
    formula: string,
    variables: FormulaVariables,
    settings: PayrollSettings
  ): { breakup: SalaryBreakup; paidDays: number } {
    try {
      // Legacy formulas saved by an older version declared these as `const`, which
      // now collides with the function parameters. Rewrite them to plain assignment.
      let source = formula;
      for (const name of FORMULA_VARIABLES) {
        source = source.replace(new RegExp(`\\bconst\\s+${name}\\s*=`, 'g'), `${name} =`);
      }

      const functionNames = Object.keys(FormulaFunctions.FORMULA_FUNCTIONS);
      const functionValues = functionNames.map(
        (name) => FormulaFunctions.FORMULA_FUNCTIONS[name]
      );

      // eslint-disable-next-line no-new-func
      const compiled = new Function(
        ...FORMULA_VARIABLES,
        ...functionNames,
        source
      );

      const raw =
        compiled(
          ...FORMULA_VARIABLES.map((name) => variables[name] ?? 0),
          ...functionValues
        ) || {};

      const paidDays =
        numeric(raw.paidDays, 0) ||
        Math.max(0, 26 - variables.unpaidLeave - variables.halfDay * 0.5);

      return {
        breakup: {
          basic: numeric(raw.basic),
          hra: numeric(raw.hra),
          special: numeric(raw.special),
          totalDeductions: numeric(raw.totalDeductions),
          netSalary: numeric(raw.netSalary),
          leaveDeduction: numeric(raw.leaveDeduction),
        },
        paidDays,
      };
    } catch (error) {
      console.error('[PayrollAdminService] Error evaluating formula', error);
      return builtInResult(variables, settings);
    }
  },

  /* ---------------------------------------------------------- calculation */

  async calculateSalary(
    employeeId: string,
    month: number,
    year: number
  ): Promise<SalaryCalculationResult> {
    if (!Number.isInteger(month) || month < 0 || month > 11) {
      throw new Error('Month must be 0-indexed (0 = January)');
    }

    // 1. Settings
    const settings = await this.getSettings();
    if (!settings) throw new Error('Payroll settings not configured');

    // 2. Employee
    const employeeDoc = await adminDb.collection('users').doc(employeeId).get();
    if (!employeeDoc.exists) throw new Error('Employee not found');
    const employee = employeeDoc.data() || {};
    // `grossSalary`/`doj` are the payroll fields; `salary`/`dateOfJoining` are the
    // pre-payroll profile fields, still present on accounts created before the migration.
    const grossSalary = numeric(employee.grossSalary ?? employee.salary);

    // 3. Period bounds
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, totalDaysInMonth, 23, 59, 59);

    // 4. Attendance for the month
    const attendanceSnapshot = await adminDb
      .collection('attendance-records')
      .where('employeeId', '==', employeeId)
      .where('clockIn', '>=', monthStart)
      .where('clockIn', '<=', monthEnd)
      .get();
    const presentDays = new Set<string>();
    attendanceSnapshot.forEach((doc) => {
      const clockIn = toDate(doc.data().clockIn);
      if (clockIn) presentDays.add(dayKey(clockIn));
    });

    // 5. Approved leaves overlapping the month. Firestore allows exactly ONE range
    //    inequality per query, so we constrain only `startDate <= monthEnd` here and
    //    let the per-day expansion below drop the days that fall outside the month.
    const leaveSnapshot = await adminDb
      .collection('leave-requests')
      .where('employeeId', '==', employeeId)
      .where('status', '==', 'approved')
      .where('startDate', '<=', monthEnd)
      .get();

    const wfhDates = new Set<string>();
    const halfDayDates = new Set<string>();
    const leaveDates = new Set<string>();

    leaveSnapshot.forEach((doc) => {
      const leave = doc.data();
      const start = toDate(leave.startDate);
      if (!start) return;
      const end = toDate(leave.endDate) || start;
      const isWfh = leave.leaveType === 'wfh';
      const isHalfDay = leave.halfDay === true || leave.leaveType === 'half-day';

      for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        // Only days inside the target month survive; the query could not filter them.
        if (cursor.getFullYear() !== year || cursor.getMonth() !== month) continue;
        const key = dayKey(cursor);
        if (isWfh) wfhDates.add(key);
        else if (isHalfDay) halfDayDates.add(key);
        else leaveDates.add(key);
      }
    });

    // 6. Holidays — read once, whole collection.
    const holidaySnapshot = await adminDb.collection('holidays').get();
    const holidayDates = new Set<string>();
    holidaySnapshot.forEach((doc) => {
      const data = doc.data();
      const value = toDate(data.date) || toDate(data.startDate) || toDate(data.holidayDate);
      if (value) holidayDates.add(dayKey(value));
    });

    // 7–9. Classify every day, first match wins.
    const breakdown = classifyDays({
      year,
      month,
      totalDaysInMonth,
      presentDays,
      wfhDates,
      halfDayDates,
      leaveDates,
      holidayDates,
    });

    // 10. Leave policy
    Object.assign(
      breakdown,
      computeLeavePolicy(breakdown.approvedLeave, breakdown.unapprovedLeave, settings.allowedPaidLeaves)
    );
    const totalWorkingDays = totalDaysInMonth - breakdown.holiday;

    // 11. Formula or whiteboard default
    const variables: FormulaVariables = {
      grossSalary,
      totalDaysInMonth,
      totalWorkingDays,
      basicPercentage: numeric(settings.basicPercentage),
      hraPercentage: numeric(settings.hraPercentage),
      specialPercentage: numeric(settings.specialPercentage),
      allowedPaidLeaves: numeric(settings.allowedPaidLeaves),
      includePaidLeavesInPaidDays: settings.includePaidLeavesInPaidDays ? 1 : 0,
      present: breakdown.present,
      wfh: breakdown.wfh,
      halfDay: breakdown.halfDay,
      paidLeave: breakdown.paidLeave,
      leaveTaken: breakdown.leaveTaken,
      unpaidLeave: breakdown.unpaidLeave,
      holidays: breakdown.holiday,
      approvedLeave: breakdown.approvedLeave,
      unapprovedLeave: breakdown.unapprovedLeave,
    };

    const { breakup, paidDays } = settings.salaryFormula
      ? this.evaluateSalaryFormula(settings.salaryFormula, variables, settings)
      : builtInResult(variables, settings);

    breakdown.paidDays = paidDays;

    return { attendanceBreakdown: breakdown, salaryBreakup: breakup, totalDaysInMonth, paidDays };
  },

  /* ------------------------------------------------------------ generation */

  async generateSlips(
    employeeIds: string[],
    month: number,
    year: number,
    generatedBy: string,
    accessMap?: Record<string, boolean>
  ): Promise<EmployeeSalary[]> {
    const generated: EmployeeSalary[] = [];
    const skipped: string[] = [];

    let batch = adminDb.batch();
    let pending = 0;
    const slipsCollection = adminDb.collection(SLIPS);

    const flushIfFull = async () => {
      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        batch = adminDb.batch();
        pending = 0;
      }
    };

    for (const employeeId of employeeIds) {
      // Never overwrite: one slip per employee per period.
      const existing = await slipsCollection
        .where('employeeId', '==', employeeId)
        .where('month', '==', month)
        .where('year', '==', year)
        .limit(1)
        .get();
      if (!existing.empty) {
        skipped.push(`${employeeId} (slip exists)`);
        continue;
      }

      const employeeDoc = await adminDb.collection('users').doc(employeeId).get();
      if (!employeeDoc.exists) {
        skipped.push(`${employeeId} (employee not found)`);
        continue;
      }
      const employee = employeeDoc.data() || {};

      const calculation = await this.calculateSalary(employeeId, month, year);
      const employeeCode = employee.employeeId || employeeId;

      const slip: Omit<EmployeeSalary, 'id'> = {
        employeeId,
        name: employee.name || employee.displayName || 'Unknown',
        employeeCode,
        designation: employee.designation || '',
        department: employee.department || '',
        doj: employee.doj || employee.dateOfJoining || null,
        pan: employee.pan || null,
        grossSalary: numeric(employee.grossSalary ?? employee.salary),
        month,
        year,
        totalDaysInMonth: calculation.totalDaysInMonth,
        paidDays: calculation.paidDays,
        attendanceBreakdown: calculation.attendanceBreakdown,
        salaryBreakup: calculation.salaryBreakup,
        slipNumber: buildSlipNumber(year, month, employeeCode),
        generatedAt: Timestamp.now(),
        generatedBy,
        accessGranted: accessMap?.[employeeId] ?? true,
      };

      const ref = slipsCollection.doc();
      batch.set(ref, slip);
      pending += 1;
      await flushIfFull();

      generated.push({ id: ref.id, ...slip });
    }

    if (pending > 0) await batch.commit();

    // Notifications are best-effort: a messaging failure must never fail the request.
    await Promise.all(
      generated
        .filter((slip) => slip.accessGranted)
        .map((slip) => this.notifySlipAvailable(slip, 'salary-slip-generated'))
    );

    console.log(
      `[PayrollAdminService] generateSlips month=${month} year=${year} generated=${generated.length} skipped=${skipped.length}` +
        (skipped.length ? ` :: ${skipped.join(', ')}` : '')
    );

    return generated;
  },

  /** Push + in-app notification for a newly available slip. Swallows every error. */
  async notifySlipAvailable(
    slip: Pick<EmployeeSalary, 'id' | 'employeeId' | 'month' | 'year'>,
    type: 'salary-slip-generated' | 'salary-slip-access'
  ): Promise<boolean> {
    const periodLabel = `${MONTH_NAMES[slip.month]} ${slip.year}`;
    const message =
      type === 'salary-slip-generated'
        ? `Your salary slip for ${periodLabel} has been generated. Visit the Salary Slip page to view and download it.`
        : `Your salary slip for ${periodLabel} is now available. Visit the Salary Slip page to view and download it.`;

    await Promise.all([
      (async () => {
        try {
          const userDoc = await adminDb.collection('users').doc(slip.employeeId).get();
          // The users doc is the primary token store; fcmTokens/{uid} is the legacy one.
          const token =
            (userDoc.data()?.fcmToken as string | undefined) ||
            (
              await adminDb.collection('fcmTokens').doc(slip.employeeId).get()
            ).data()?.token;
          if (!token) return;

          await adminMessaging.send({
            token,
            notification: { title: 'Salary Slip Available', body: message },
            data: {
              type: 'salary-slip',
              slipId: slip.id || '',
              month: String(slip.month),
              year: String(slip.year),
              url: '/salary-slip',
            },
          });
        } catch (error) {
          console.error('[PayrollAdminService] Failed to send push notification', error);
        }
      })(),
      (async () => {
        try {
          await adminDb.collection('notifications').add({
            userId: slip.employeeId,
            type,
            title: 'Salary Slip Available',
            message,
            body: message,
            read: false,
            createdAt: Timestamp.now(),
            metadata: { slipId: slip.id, month: slip.month, year: slip.year },
            actionUrl: '/salary-slip',
            data: {
              url: '/salary-slip',
              type,
              slipId: slip.id,
              month: slip.month,
              year: slip.year,
            },
          });
        } catch (error) {
          console.error('[PayrollAdminService] Failed to write in-app notification', error);
        }
      })(),
    ]);

    return true;
  },

  /* ----------------------------------------------------------------- slips */

  async getSlips(filters: {
    employeeId?: string;
    month?: number;
    year?: number;
    accessGranted?: boolean;
  }): Promise<EmployeeSalary[]> {
    let query: any = adminDb.collection(SLIPS);
    if (filters.employeeId) query = query.where('employeeId', '==', filters.employeeId);
    if (filters.month !== undefined) query = query.where('month', '==', filters.month);
    if (filters.year !== undefined) query = query.where('year', '==', filters.year);
    if (filters.accessGranted !== undefined) {
      query = query.where('accessGranted', '==', filters.accessGranted);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as EmployeeSalary[];
  },

  async getSlipById(slipId: string): Promise<EmployeeSalary | null> {
    const doc = await adminDb.collection(SLIPS).doc(slipId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<EmployeeSalary, 'id'>) };
  },

  async deleteSlips(ids: string[]): Promise<number> {
    let deleted = 0;
    for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
      const batch = adminDb.batch();
      for (const id of ids.slice(i, i + BATCH_LIMIT)) {
        batch.delete(adminDb.collection(SLIPS).doc(id));
        deleted += 1;
      }
      await batch.commit();
    }
    return deleted;
  },

  async updateSlip(
    slipId: string,
    data: Partial<
      Omit<EmployeeSalary, 'id' | 'employeeId' | 'month' | 'year' | 'generatedAt' | 'generatedBy' | 'slipNumber' | 'employeeCode'>
    >
  ): Promise<void> {
    await adminDb.collection(SLIPS).doc(slipId).update(data as Record<string, unknown>);
  },

  /**
   * Writes the one slip an employee may have for a period, creating it if it does
   * not exist yet — `generateSlips` refuses to overwrite, so without this an edit of
   * a calculated-but-unsaved row would have nothing to persist to.
   *
   * It deliberately does not notify: an admin correcting a figure is not the
   * publication event that `generateSlips` is.
   */
  async upsertSlip(
    slip: Omit<
      EmployeeSalary,
      'id' | 'slipNumber' | 'generatedAt' | 'generatedBy' | 'accessGranted'
    >,
    options: { accessGranted: boolean; generatedBy: string }
  ): Promise<EmployeeSalary> {
    const matches = await adminDb
      .collection(SLIPS)
      .where('employeeId', '==', slip.employeeId)
      .where('month', '==', slip.month)
      .where('year', '==', slip.year)
      .limit(1)
      .get();

    // An existing slip keeps its number, generator and access grant: only the
    // values the editor owns are written.
    if (!matches.empty) {
      const existing = matches.docs[0];
      await adminDb.collection(SLIPS).doc(existing.id).update(slip as Record<string, unknown>);
      return { ...(existing.data() as Omit<EmployeeSalary, 'id'>), ...slip, id: existing.id };
    }

    const created: EmployeeSalary = {
      ...slip,
      slipNumber: buildSlipNumber(slip.year, slip.month, slip.employeeCode),
      generatedAt: Timestamp.now(),
      generatedBy: options.generatedBy,
      accessGranted: options.accessGranted,
    };
    const ref = adminDb.collection(SLIPS).doc();
    await ref.set(created);
    return { ...created, id: ref.id };
  },

  /* ------------------------------------------------------------- templates */

  async getTemplates(): Promise<SalarySlipTemplate[]> {
    const snapshot = await adminDb.collection(TEMPLATES).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SalarySlipTemplate[];
  },

  async getTemplateById(id: string): Promise<SalarySlipTemplate | null> {
    const doc = await adminDb.collection(TEMPLATES).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Omit<SalarySlipTemplate, 'id'>) };
  },

  async createTemplate(template: Omit<SalarySlipTemplate, 'id' | 'updatedAt'>): Promise<SalarySlipTemplate> {
    const payload = { ...template, updatedAt: Timestamp.now() };
    const created = await adminDb.collection(TEMPLATES).add(payload);
    return { id: created.id, ...payload };
  },

  async updateTemplate(id: string, template: Partial<SalarySlipTemplate>): Promise<void> {
    const payload = { ...template, updatedAt: Timestamp.now() };
    delete payload.id;
    await adminDb.collection(TEMPLATES).doc(id).update(payload as Record<string, unknown>);
  },

  async deleteTemplate(id: string): Promise<void> {
    await adminDb.collection(TEMPLATES).doc(id).delete();
  },

  async getActiveTemplate(): Promise<SalarySlipTemplate> {
    const snapshot = await adminDb
      .collection(TEMPLATES)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...(doc.data() as Omit<SalarySlipTemplate, 'id'>) };
    }

    return this.createTemplate(DEFAULT_SALARY_SLIP_TEMPLATE);
  },
};
