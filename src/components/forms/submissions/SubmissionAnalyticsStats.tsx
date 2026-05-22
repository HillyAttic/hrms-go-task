'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { SimpleStatCard } from '@/components/dashboard/SimpleStatCard';
import { AnalyticsDateFilter, DateFilterValue } from './AnalyticsDateFilter';
import { SubmissionUsersModal } from './SubmissionUsersModal';
import { BranchReportFullscreenModal } from './FormAnalyticsFullscreenModal';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

interface SubmissionAnalyticsStatsProps {
  formId: string;
  template: FormTemplate;
  onRefresh?: () => void;
}

interface AnalyticsData {
  formId: string;
  formTitle: string;
  dateFilter: string;
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

export interface BranchReportData {
  formId: string;
  formTitle: string;
  dateRange: { start: string; end: string };
  rows: BranchReportRow[];
  totals: BranchReportRow & { businessUnitCount: number };
  daywiseGroupVisits: Array<{ date: string; total: number }>;
  unresolvedLabels: string[];
}

interface ModalState {
  isOpen: boolean;
  category: 'submitted' | 'not-submitted' | 'zero-response';
  userIds: string[];
  fieldLabel?: string;
  submissionsWithTimestamps?: Record<string, string>;
}

function getDateInputValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getPresetDateRange(preset: 'day' | 'yesterday' | 'week' | 'month'): { start: string; end: string } {
  const start = new Date();
  const end = new Date();

  if (preset === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (preset === 'month') {
    start.setDate(1);
  }

  return { start: getDateInputValue(start), end: getDateInputValue(end) };
}

export function SubmissionAnalyticsStats({
  formId,
  template,
  onRefresh,
}: SubmissionAnalyticsStatsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('today');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [branchReportData, setBranchReportData] = useState<BranchReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchReportLoading, setBranchReportLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [reportStartDate, setReportStartDate] = useState<string>(getDateInputValue());
  const [reportEndDate, setReportEndDate] = useState<string>(getDateInputValue());
  const [reportPreset, setReportPreset] = useState<'day' | 'week' | 'month'>('day');
  const [reportChartPreset, setReportChartPreset] = useState<'week' | 'month'>('week');
  const [isBranchReportFullscreenOpen, setIsBranchReportFullscreenOpen] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [formId, dateFilter]);

  useEffect(() => {
    fetchBranchReport();
  }, [formId]);

  useEffect(() => {
    setReportStartDate(getDateInputValue());
    setReportEndDate(getDateInputValue());
    setReportPreset('day');
    setReportChartPreset('week');
  }, [formId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(
        `/api/mis-tracker/analytics?formId=${formId}&dateFilter=${dateFilter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchReport = async (startDate = reportStartDate, endDate = reportEndDate, preset: 'day' | 'yesterday' | 'week' | 'month' = reportPreset) => {
    if (startDate > endDate) {
      toast.error('From date cannot be after To date');
      return;
    }

    try {
      setBranchReportLoading(true);

      const params = new URLSearchParams({
        mode: 'branch-report',
        formId,
        reportStartDate: startDate,
        reportEndDate: endDate,
        reportPreset: preset,
      });

      const response = await authenticatedFetch(`/api/mis-tracker/analytics?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch branch report');
      }

      const result = await response.json();

      if (result.success) {
        setBranchReportData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch branch report');
      }
    } catch (err) {
      console.error('Error fetching branch report:', err);
      toast.error('Failed to load branch report');
    } finally {
      setBranchReportLoading(false);
    }
  };

  const applyReportPreset = (preset: 'day' | 'week' | 'month') => {
    const range = getPresetDateRange(preset);
    setReportPreset(preset);
    setReportStartDate(range.start);
    setReportEndDate(range.end);
    fetchBranchReport(range.start, range.end, preset);
  };

  const applyReportChartPreset = (preset: 'week' | 'month') => {
    const range = getPresetDateRange(preset);
    setReportChartPreset(preset);
    setReportStartDate(range.start);
    setReportEndDate(range.end);
    setReportPreset(preset);
    fetchBranchReport(range.start, range.end, preset);
  };

  const handleCardClick = (
    category: 'submitted' | 'not-submitted' | 'zero-response',
    userIds: string[],
    fieldLabel?: string
  ) => {
    setModalState({
      isOpen: true,
      category,
      userIds,
      fieldLabel,
      submissionsWithTimestamps:
        category === 'submitted' ? analyticsData?.submissionsWithTimestamps : undefined,
    });
  };

  const closeModal = () => {
    setModalState(null);
  };

  if (loading && !analyticsData) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 sm:h-10 w-16 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 sm:h-28 lg:h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-900 dark:text-red-100 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const {
    totalAssigned,
    submittedCount,
    notSubmittedCount,
    submittedUserIds,
    notSubmittedUserIds,
    zeroResponseField,
  } = analyticsData;

  if (totalAssigned === 0) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
        <p className="text-blue-900 dark:text-blue-100">
          No users assigned to this form. Configure assignments in MIS settings.
        </p>
      </div>
    );
  }

  const isFullyCompleted = notSubmittedCount === 0 && submittedCount > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-2 sm:gap-3">
        <AnalyticsDateFilter value={dateFilter} onChange={setDateFilter} />

        {isFullyCompleted && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs sm:text-sm font-medium">All users have submitted!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SimpleStatCard
          title="Total Assigned"
          value={totalAssigned}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          color="blue"
          subtitle="Users assigned to form"
        />

        <SimpleStatCard
          title="Submitted"
          value={submittedCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="green"
          subtitle="Click to view users"
          onClick={() => handleCardClick('submitted', submittedUserIds)}
        />

        <SimpleStatCard
          title="Not Submitted"
          value={notSubmittedCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="orange"
          subtitle="Click to view users"
          onClick={() => handleCardClick('not-submitted', notSubmittedUserIds)}
        />

        {zeroResponseField && (
          <SimpleStatCard
            title="Zero Responses"
            mobileTitle="Zero"
            value={zeroResponseField.count}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="purple"
            subtitle={zeroResponseField.fieldLabel}
            onClick={() =>
              handleCardClick('zero-response', zeroResponseField.userIds, zeroResponseField.fieldLabel)
            }
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">BU-wise Collective Report</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Report filters apply to this table only.</p>
          </div>

          <div className="flex flex-col gap-1.5 xl:ml-auto">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => {
                setReportStartDate(e.target.value);
                setReportPreset('day');
              }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => {
                setReportEndDate(e.target.value);
                setReportPreset('day');
              }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyReportPreset(preset)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  reportPreset === preset
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setIsBranchReportFullscreenOpen(true);
              applyReportChartPreset('week');
            }}
            disabled={branchReportLoading || !branchReportData}
            className="w-full xl:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Open Full-Screen Reports
          </button>

          <button
            onClick={() => fetchBranchReport()}
            disabled={branchReportLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>

        {branchReportData?.unresolvedLabels.length ? (
          <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
            Missing questions: {branchReportData.unresolvedLabels.join(', ')}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">S.No</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Name of Business Unit Visited today.</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">How many group visits were conducted today?</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">How many borrowers were called today?</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">How many borrowers were visited in person today?</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Has any observation related to FD creation been noted?</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Has any discrepancy been found in the CRB?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {branchReportLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">Loading report...</td>
                </tr>
              ) : branchReportData && branchReportData.rows.length > 0 ? (
                branchReportData.rows.map((row, index) => (
                  <tr key={row.businessUnit} className="hover:bg-gray-50 dark:hover:bg-gray-900/60">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.businessUnit}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{row.name || '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{row.groupVisitsTotal}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{row.borrowersCalledTotal}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{row.borrowersVisitedInPersonTotal}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">Yes: {row.fdObservationYesCount} / No: {row.fdObservationNoCount}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">Yes: {row.crbDiscrepancyYesCount} / No: {row.crbDiscrepancyNoCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">No submissions for selected date range.</td>
                </tr>
              )}
            </tbody>
            {branchReportData && branchReportData.rows.length > 0 && !branchReportLoading && (
              <tfoot className="bg-gray-100 dark:bg-gray-900 font-semibold text-gray-900 dark:text-white">
                <tr>
                  <td colSpan={3} className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{branchReportData.totals.groupVisitsTotal}</td>
                  <td className="px-3 py-2 text-right">{branchReportData.totals.borrowersCalledTotal}</td>
                  <td className="px-3 py-2 text-right">{branchReportData.totals.borrowersVisitedInPersonTotal}</td>
                  <td className="px-3 py-2 text-right">Yes: {branchReportData.totals.fdObservationYesCount} / No: {branchReportData.totals.fdObservationNoCount}</td>
                  <td className="px-3 py-2 text-right">Yes: {branchReportData.totals.crbDiscrepancyYesCount} / No: {branchReportData.totals.crbDiscrepancyNoCount}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {modalState && (
        <SubmissionUsersModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          userIds={modalState.userIds}
          category={modalState.category}
          formTitle={template.title}
          dateFilter={dateFilter}
          fieldLabel={modalState.fieldLabel}
          submissionsWithTimestamps={modalState.submissionsWithTimestamps}
        />
      )}

      <BranchReportFullscreenModal
        isOpen={isBranchReportFullscreenOpen}
        onClose={() => setIsBranchReportFullscreenOpen(false)}
        formTitle={template.title}
        data={branchReportData}
        loading={branchReportLoading}
        preset={reportChartPreset}
        onPresetChange={applyReportChartPreset}
      />
    </div>
  );
}
