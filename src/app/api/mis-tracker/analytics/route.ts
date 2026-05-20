import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { MISConfigService } from '@/services/mis-config.service';
import { flattenFormFields } from '@/utils/submission-utils';
import type { FormTemplate, FormSubmission, FormField } from '@/types/form.types';
import { Timestamp } from 'firebase-admin/firestore';

type DateFilter = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all-time';
type AnalyticsMode = 'completion' | 'dashboard' | 'branch-report';
type ReportPreset = 'day' | 'yesterday' | 'week' | 'month';

interface CompletionAnalyticsData {
  formId: string;
  formTitle: string;
  dateFilter: DateFilter;
  dateRange: { start: string; end: string } | null;
  totalAssigned: number;
  submittedCount: number;
  notSubmittedCount: number;
  submittedUserIds: string[];
  notSubmittedUserIds: string[];
  submissionsWithTimestamps: Record<string, string>;
  zeroResponseField: {
    fieldId: string;
    fieldLabel: string;
    count: number;
    userIds: string[];
  } | null;
}

interface DashboardChartDatum {
  label: string;
  count: number;
  pct: number;
}

interface DashboardQuestionChart {
  fieldId: string;
  label: string;
  type: string;
  chartType: 'pie' | 'bar';
  data: DashboardChartDatum[];
  totalAnswered: number;
}

interface DashboardAnalyticsData {
  formId: string;
  formTitle: string;
  month: string;
  businessUnit: string;
  businessUnitOptions: string[];
  selectedMonthCount: number;
  visitsByMonth: Array<{ month: string; total: number }>;
  questionCharts: DashboardQuestionChart[];
}

interface BranchReportRow {
  businessUnit: string;
  name: string;
  submissionCount: number;
  submittedUserCount: number;
  groupVisitsTotal: number;
  borrowersCalledTotal: number;
  borrowersVisitedInPersonTotal: number;
  fdObservationYesCount: number;
  fdObservationNoCount: number;
  crbDiscrepancyYesCount: number;
  crbDiscrepancyNoCount: number;
}

interface BranchReportData {
  formId: string;
  formTitle: string;
  dateRange: { start: string; end: string };
  rows: BranchReportRow[];
  totals: BranchReportRow & { businessUnitCount: number };
  daywiseGroupVisits: Array<{ date: string; total: number }>;
  unresolvedLabels: string[];
}

const BUSINESS_UNIT_LABEL = 'name of business unit visited today';
const REPORT_LABELS = {
  businessUnit: 'Name of Business Unit Visited today.',
  name: 'Name',
  groupVisits: 'How many group visits were conducted today?',
  borrowersCalled: 'How many borrowers were called today?',
  borrowersVisited: 'How many borrowers were visited in person today?',
  fdObservation: 'Has any observation related to FD creation been noted?',
  crbDiscrepancy: 'Has any discrepancy been found in the CRB?',
} as const;

function toDate(value: Timestamp | { toDate?: () => Date } | string | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function parseMonthInput(monthInput: string | null): { month: string; start: Date; end: Date } {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const safeMonth = monthInput && /^\d{4}-\d{2}$/.test(monthInput) ? monthInput : defaultMonth;

  const [yearStr, monthStr] = safeMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { month: safeMonth, start, end };
}

function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  const start = new Date();
  const end = new Date();

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this-week': {
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this-month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all-time':
      return null;
    default:
      return null;
  }

  return { start, end };
}

function normalizeValue(raw: any): string[] {
  if (raw === null || raw === undefined || raw === '') return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
      .filter((item) => item.length > 0);
  }

  if (typeof raw === 'object') {
    return [JSON.stringify(raw)];
  }

  const value = String(raw).trim();
  return value ? [value] : [];
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildDateBuckets(start: Date, end: Date): Map<string, number> {
  const buckets = new Map<string, number>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    buckets.set(formatDateInput(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function parseDateInput(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getReportDateRange(startInput: string | null, endInput: string | null, presetInput: string | null): { start: Date; end: Date } {
  const today = new Date();
  let start = parseDateInput(startInput);
  let end = parseDateInput(endInput);

  if (!start || !end) {
    start = new Date(today);
    end = new Date(today);

    if (presetInput === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (presetInput === 'week') {
      start.setDate(start.getDate() - 6);
    } else if (presetInput === 'month') {
      start.setDate(1);
    }
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\*+$/g, '').trim();
}

function findFieldByLabel(fields: FormField[], label: string): FormField | undefined {
  const normalizedLabel = normalizeLabel(label);
  return fields.find((field) => normalizeLabel(field.label) === normalizedLabel);
}

function toNumber(raw: any): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isYes(raw: any): boolean {
  const values = normalizeValue(raw).map((value) => value.toLowerCase());
  return values.some((value) => ['yes', 'y', 'true', '1'].includes(value));
}

function isNo(raw: any): boolean {
  const values = normalizeValue(raw).map((value) => value.toLowerCase());
  return values.some((value) => ['no', 'n', 'false', '0'].includes(value));
}

function findBusinessUnitField(fields: FormField[]): FormField | undefined {
  return fields.find((field) => field.label.trim().toLowerCase() === BUSINESS_UNIT_LABEL);
}

function buildQuestionCharts(fields: FormField[], submissions: FormSubmission[]): DashboardQuestionChart[] {
  const chartableTypes = new Set<FormField['type']>([
    'select',
    'radio',
    'checkbox',
    'multiselect',
    'text',
    'textarea',
    'number',
    'date',
    'time',
    'email',
    'phone',
  ]);

  const charts: DashboardQuestionChart[] = [];

  fields.forEach((field) => {
    if (!chartableTypes.has(field.type)) {
      return;
    }

    const counts = new Map<string, number>();

    submissions.forEach((submission) => {
      const rawValue = submission.data?.[field.id];
      const values = normalizeValue(rawValue);

      values.forEach((value) => {
        counts.set(value, (counts.get(value) || 0) + 1);
      });
    });

    const totalAnswered = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    if (totalAnswered === 0) {
      return;
    }

    const sorted = Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const isPieType =
      field.type === 'select' ||
      field.type === 'radio' ||
      field.type === 'checkbox' ||
      field.type === 'multiselect';

    const limit = isPieType ? 8 : 10;
    const top = sorted.slice(0, limit);
    const rest = sorted.slice(limit);
    const otherCount = rest.reduce((sum, item) => sum + item.count, 0);

    const merged = otherCount > 0 ? [...top, { label: 'Other', count: otherCount }] : top;
    const data: DashboardChartDatum[] = merged.map((item) => ({
      label: item.label,
      count: item.count,
      pct: totalAnswered > 0 ? Number(((item.count / totalAnswered) * 100).toFixed(2)) : 0,
    }));

    charts.push({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      chartType: isPieType ? 'pie' : 'bar',
      data,
      totalAnswered,
    });
  });

  return charts;
}

async function buildDashboardAnalytics(formId: string, businessUnit: string, monthInput: string | null): Promise<DashboardAnalyticsData> {
  const templateDoc = await adminDb.collection('form_templates').doc(formId).get();

  if (!templateDoc.exists) {
    throw new Error('Form template not found');
  }

  const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;
  const fields = flattenFormFields(template.fields || []);
  const businessUnitField = findBusinessUnitField(fields);

  const { month, start, end } = parseMonthInput(monthInput);

  const submissionsSnapshot = await adminDb
    .collection('form_submissions')
    .where('formId', '==', formId)
    .where('submittedAt', '>=', start)
    .where('submittedAt', '<=', end)
    .get();

  const monthSubmissions = submissionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  const businessUnitOptions = new Set<string>();
  monthSubmissions.forEach((submission) => {
    if (!businessUnitField) return;
    const values = normalizeValue(submission.data?.[businessUnitField.id]);
    values.forEach((value) => businessUnitOptions.add(value));
  });

  const filteredSubmissions = monthSubmissions.filter((submission) => {
    if (businessUnit === 'all' || !businessUnitField) return true;
    const values = normalizeValue(submission.data?.[businessUnitField.id]);
    return values.includes(businessUnit);
  });

  const monthKeys: string[] = [];
  const selectedDate = new Date(`${month}-01T00:00:00`);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
    monthKeys.push(getMonthKey(d));
  }

  let trendQuery = adminDb
    .collection('form_submissions')
    .where('formId', '==', formId)
    .where('submittedAt', '>=', new Date(new Date(`${monthKeys[0]}-01T00:00:00`).getFullYear(), new Date(`${monthKeys[0]}-01T00:00:00`).getMonth(), 1, 0, 0, 0, 0))
    .where('submittedAt', '<=', end);

  const trendSnapshot = await trendQuery.get();
  const trendSubmissions = trendSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  const trendCounts = new Map<string, number>(monthKeys.map((key) => [key, 0]));
  trendSubmissions.forEach((submission) => {
    const date = toDate(submission.submittedAt);
    if (!date) return;

    if (businessUnit !== 'all' && businessUnitField) {
      const values = normalizeValue(submission.data?.[businessUnitField.id]);
      if (!values.includes(businessUnit)) return;
    }

    const key = getMonthKey(date);
    if (trendCounts.has(key)) {
      trendCounts.set(key, (trendCounts.get(key) || 0) + 1);
    }
  });

  const visitsByMonth = monthKeys.map((key) => ({
    month: key,
    total: trendCounts.get(key) || 0,
  }));

  const questionCharts = buildQuestionCharts(fields, filteredSubmissions);

  return {
    formId,
    formTitle: template.title,
    month,
    businessUnit,
    businessUnitOptions: Array.from(businessUnitOptions).sort((a, b) => a.localeCompare(b)),
    selectedMonthCount: filteredSubmissions.length,
    visitsByMonth,
    questionCharts,
  };
}

async function buildBranchReportAnalytics(
  formId: string,
  startInput: string | null,
  endInput: string | null,
  presetInput: string | null
): Promise<BranchReportData> {
  const templateDoc = await adminDb.collection('form_templates').doc(formId).get();

  if (!templateDoc.exists) {
    throw new Error('Form template not found');
  }

  const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;
  const fields = flattenFormFields(template.fields || []);
  const fieldMap = {
    businessUnit: findFieldByLabel(fields, REPORT_LABELS.businessUnit),
    name: findFieldByLabel(fields, REPORT_LABELS.name),
    groupVisits: findFieldByLabel(fields, REPORT_LABELS.groupVisits),
    borrowersCalled: findFieldByLabel(fields, REPORT_LABELS.borrowersCalled),
    borrowersVisited: findFieldByLabel(fields, REPORT_LABELS.borrowersVisited),
    fdObservation: findFieldByLabel(fields, REPORT_LABELS.fdObservation),
    crbDiscrepancy: findFieldByLabel(fields, REPORT_LABELS.crbDiscrepancy),
  };

  const unresolvedLabels = Object.entries(fieldMap)
    .filter(([key, field]) => key !== 'name' && !field)
    .map(([key]) => REPORT_LABELS[key as keyof typeof REPORT_LABELS]);
  const { start, end } = getReportDateRange(startInput, endInput, presetInput as ReportPreset | null);

  if (!fieldMap.businessUnit) {
    return {
      formId,
      formTitle: template.title,
      dateRange: { start: formatDateInput(start), end: formatDateInput(end) },
      rows: [],
      totals: {
        businessUnit: 'Total',
        name: '',
        businessUnitCount: 0,
        submissionCount: 0,
        submittedUserCount: 0,
        groupVisitsTotal: 0,
        borrowersCalledTotal: 0,
        borrowersVisitedInPersonTotal: 0,
        fdObservationYesCount: 0,
        fdObservationNoCount: 0,
        crbDiscrepancyYesCount: 0,
        crbDiscrepancyNoCount: 0,
      },
      daywiseGroupVisits: [],
      unresolvedLabels,
    };
  }

  const submissionsSnapshot = await adminDb
    .collection('form_submissions')
    .where('formId', '==', formId)
    .where('submittedAt', '>=', start)
    .where('submittedAt', '<=', end)
    .get();
  const submissions = submissionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];
  const submitterIds = Array.from(new Set(submissions.map((submission) => submission.submittedBy).filter(Boolean))) as string[];
  const submitterNames = new Map<string, string>();

  await Promise.all(
    submitterIds.map(async (uid) => {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const userData = userDoc.data();
      if (userData) {
        submitterNames.set(uid, userData.name || userData.displayName || userData.email || uid);
      }
    })
  );

  const rowMap = new Map<string, BranchReportRow & { names: Set<string>; submittedUsers: Set<string> }>();
  const daywiseGroupVisits = buildDateBuckets(start, end);

  submissions.forEach((submission) => {
    const businessUnit = normalizeValue(submission.data?.[fieldMap.businessUnit!.id])[0] || 'Unknown BU';
    const existing = rowMap.get(businessUnit) || {
      businessUnit,
      name: '',
      submissionCount: 0,
      submittedUserCount: 0,
      groupVisitsTotal: 0,
      borrowersCalledTotal: 0,
      borrowersVisitedInPersonTotal: 0,
      fdObservationYesCount: 0,
      fdObservationNoCount: 0,
      crbDiscrepancyYesCount: 0,
      crbDiscrepancyNoCount: 0,
      names: new Set<string>(),
      submittedUsers: new Set<string>(),
    };

    existing.submissionCount += 1;
    const names = fieldMap.name ? normalizeValue(submission.data?.[fieldMap.name.id]) : [];
    if (names.length > 0) {
      names.forEach((name) => existing.names.add(name));
    } else if (submission.submitterName) {
      existing.names.add(submission.submitterName);
    } else if (submission.submittedBy && submitterNames.has(submission.submittedBy)) {
      existing.names.add(submitterNames.get(submission.submittedBy)!);
    } else if (submission.submitterEmail) {
      existing.names.add(submission.submitterEmail);
    }
    if (submission.submittedBy) {
      existing.submittedUsers.add(submission.submittedBy);
    }
    if (fieldMap.groupVisits) {
      const groupVisits = toNumber(submission.data?.[fieldMap.groupVisits.id]);
      existing.groupVisitsTotal += groupVisits;
      const submittedAtDate = toDate(submission.submittedAt);
      if (submittedAtDate) {
        const dateKey = formatDateInput(submittedAtDate);
        if (daywiseGroupVisits.has(dateKey)) {
          daywiseGroupVisits.set(dateKey, (daywiseGroupVisits.get(dateKey) || 0) + groupVisits);
        }
      }
    }
    if (fieldMap.borrowersCalled) {
      existing.borrowersCalledTotal += toNumber(submission.data?.[fieldMap.borrowersCalled.id]);
    }
    if (fieldMap.borrowersVisited) {
      existing.borrowersVisitedInPersonTotal += toNumber(submission.data?.[fieldMap.borrowersVisited.id]);
    }
    if (fieldMap.fdObservation) {
      const value = submission.data?.[fieldMap.fdObservation.id];
      if (isYes(value)) existing.fdObservationYesCount += 1;
      if (isNo(value)) existing.fdObservationNoCount += 1;
    }
    if (fieldMap.crbDiscrepancy) {
      const value = submission.data?.[fieldMap.crbDiscrepancy.id];
      if (isYes(value)) existing.crbDiscrepancyYesCount += 1;
      if (isNo(value)) existing.crbDiscrepancyNoCount += 1;
    }

    rowMap.set(businessUnit, existing);
  });

  const rows = Array.from(rowMap.values())
    .map(({ names, submittedUsers, ...row }) => ({
      ...row,
      name: Array.from(names).sort((a, b) => a.localeCompare(b)).join(', '),
      submittedUserCount: submittedUsers.size,
    }))
    .sort((a, b) => a.businessUnit.localeCompare(b.businessUnit));
  const submittedUsers = new Set<string>();
  rowMap.forEach((row) => row.submittedUsers.forEach((uid) => submittedUsers.add(uid)));

  return {
    formId,
    formTitle: template.title,
    dateRange: { start: formatDateInput(start), end: formatDateInput(end) },
    rows,
    totals: {
      businessUnit: 'Total',
      name: '',
      businessUnitCount: rows.length,
      submissionCount: rows.reduce((sum, row) => sum + row.submissionCount, 0),
      submittedUserCount: submittedUsers.size,
      groupVisitsTotal: rows.reduce((sum, row) => sum + row.groupVisitsTotal, 0),
      borrowersCalledTotal: rows.reduce((sum, row) => sum + row.borrowersCalledTotal, 0),
      borrowersVisitedInPersonTotal: rows.reduce((sum, row) => sum + row.borrowersVisitedInPersonTotal, 0),
      fdObservationYesCount: rows.reduce((sum, row) => sum + row.fdObservationYesCount, 0),
      fdObservationNoCount: rows.reduce((sum, row) => sum + row.fdObservationNoCount, 0),
      crbDiscrepancyYesCount: rows.reduce((sum, row) => sum + row.crbDiscrepancyYesCount, 0),
      crbDiscrepancyNoCount: rows.reduce((sum, row) => sum + row.crbDiscrepancyNoCount, 0),
    },
    daywiseGroupVisits: Array.from(daywiseGroupVisits.entries()).map(([date, total]) => ({ date, total })),
    unresolvedLabels,
  };
}

async function buildCompletionAnalytics(formId: string, dateFilter: DateFilter): Promise<CompletionAnalyticsData> {
  const misConfigService = new MISConfigService();
  const misConfig = await misConfigService.getMISConfig();

  if (!misConfig) {
    throw new Error('MIS configuration not found');
  }

  const formMapping = misConfig.formToUserMappings?.find((mapping) => mapping.formId === formId);

  if (!formMapping) {
    throw new Error('Form not found in MIS configuration');
  }

  const assignedUserIds = formMapping.assignedUserIds || [];
  const totalAssigned = assignedUserIds.length;

  const templateDoc = await adminDb.collection('form_templates').doc(formId).get();

  if (!templateDoc.exists) {
    throw new Error('Form template not found');
  }

  const template = { id: templateDoc.id, ...templateDoc.data() } as FormTemplate;

  const flattenedFields = flattenFormFields(template.fields);
  const groupVisitField = flattenedFields.find(
    (field) => field.type === 'number' && field.label.toLowerCase().includes('group visit')
  );

  const dateRange = getDateRange(dateFilter);

  let submissionsQuery = adminDb.collection('form_submissions').where('formId', '==', formId);

  if (dateRange) {
    submissionsQuery = submissionsQuery
      .where('submittedAt', '>=', dateRange.start)
      .where('submittedAt', '<=', dateRange.end);
  }

  const submissionsSnapshot = await submissionsQuery.get();
  const submissions = submissionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FormSubmission[];

  const submittedUserIds = new Set<string>();
  const submissionsWithTimestamps: Record<string, string> = {};
  const zeroResponseUserIds = new Set<string>();

  submissions.forEach((submission) => {
    if (!submission.submittedBy) return;

    submittedUserIds.add(submission.submittedBy);

    const submittedAtDate = toDate(submission.submittedAt);
    const submittedAtIso = submittedAtDate ? submittedAtDate.toISOString() : new Date().toISOString();

    if (
      !submissionsWithTimestamps[submission.submittedBy] ||
      submittedAtIso > submissionsWithTimestamps[submission.submittedBy]
    ) {
      submissionsWithTimestamps[submission.submittedBy] = submittedAtIso;
    }

    if (groupVisitField && submission.data) {
      const fieldValue = submission.data[groupVisitField.id];
      if (fieldValue === 0 || fieldValue === '0') {
        zeroResponseUserIds.add(submission.submittedBy);
      }
    }
  });

  const submittedUserIdsArray = Array.from(submittedUserIds);
  const notSubmittedUserIds = assignedUserIds.filter((uid) => !submittedUserIds.has(uid));

  return {
    formId,
    formTitle: template.title,
    dateFilter,
    dateRange: dateRange
      ? {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        }
      : null,
    totalAssigned,
    submittedCount: submittedUserIdsArray.length,
    notSubmittedCount: notSubmittedUserIds.length,
    submittedUserIds: submittedUserIdsArray,
    notSubmittedUserIds,
    submissionsWithTimestamps,
    zeroResponseField:
      groupVisitField && zeroResponseUserIds.size > 0
        ? {
            fieldId: groupVisitField.id,
            fieldLabel: groupVisitField.label,
            count: zeroResponseUserIds.size,
            userIds: Array.from(zeroResponseUserIds),
          }
        : null,
  };
}

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const dateFilter = (searchParams.get('dateFilter') || 'today') as DateFilter;
    const mode = (searchParams.get('mode') || 'completion') as AnalyticsMode;
    const businessUnit = searchParams.get('businessUnit') || 'all';
    const month = searchParams.get('month');
    const reportStartDate = searchParams.get('reportStartDate');
    const reportEndDate = searchParams.get('reportEndDate');
    const reportPreset = searchParams.get('reportPreset');

    if (!formId) {
      return NextResponse.json({ success: false, error: 'formId is required' }, { status: 400 });
    }

    const misConfigService = new MISConfigService();
    const misConfig = await misConfigService.getMISConfig();

    if (!misConfig) {
      return NextResponse.json({ success: false, error: 'MIS configuration not found' }, { status: 404 });
    }

    const userUid = request.user!.uid;
    const hasSheetAccess = misConfig.sheetAssignedUsers?.includes(userUid) || false;

    if (!hasSheetAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (mode === 'dashboard') {
      const dashboardData = await buildDashboardAnalytics(formId, businessUnit, month);
      return NextResponse.json({ success: true, data: dashboardData });
    }

    if (mode === 'branch-report') {
      const branchReportData = await buildBranchReportAnalytics(formId, reportStartDate, reportEndDate, reportPreset);
      return NextResponse.json({ success: true, data: branchReportData });
    }

    const completionData = await buildCompletionAnalytics(formId, dateFilter);
    return NextResponse.json({ success: true, data: completionData });
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics',
      },
      { status: 500 }
    );
  }
});
