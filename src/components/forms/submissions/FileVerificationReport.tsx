'use client';

import React, { useState, useMemo } from 'react';
import type { FormSubmission, FormTemplate, FormField } from '@/types/form.types';
import { flattenFormFields, groupSubmissionsByDay } from '@/utils/submission-utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SpreadsheetExportModal } from './SpreadsheetExportModal';

interface FileVerificationReportProps {
  submissions: FormSubmission[];
  template: FormTemplate;
  onRefresh: () => void;
  onDelete?: (id: string) => void;
}

interface CategoryField {
  key: string;
  fieldId: string;
  label: string;
  shortLabel: string;
}

interface CategoryTotals {
  [key: string]: number;
}

/**
 * Detect if a form is a file verification form by checking for fields
 * matching common verification categories (LAP, UBL, SCF, CF, CIF).
 */
export function isFileVerificationForm(template: FormTemplate | null): boolean {
  if (!template) return false;
  const flatFields = flattenFormFields(template.fields);
  return flatFields.some(
    (f) => /LAP|UBL|SCF|CIF/i.test(f.label) && f.type === 'number'
  );
}

/**
 * Extract category fields from a form template.
 * Looks for number-type fields with labels containing LAP, UBL, SCF, CF, CIF,
 * and any other field labeled "Remark" (case-insensitive).
 */
function extractCategoryFields(fields: FormField[]): {
  categories: CategoryField[];
  remarkField: CategoryField | null;
} {
  const categories: CategoryField[] = [];
  let remarkField: CategoryField | null = null;

  // Define the category patterns we care about
  const categoryPatterns: Array<{ pattern: RegExp; shortLabel: string }> = [
    { pattern: /LAP/i, shortLabel: 'LAP' },
    { pattern: /UBL/i, shortLabel: 'UBL' },
    { pattern: /SCF/i, shortLabel: 'SCF' },
    { pattern: /(?<!S)CF(?![I])/i, shortLabel: 'CF' }, // CF but not SCF or CIF
    { pattern: /CIF/i, shortLabel: 'CIF' },
  ];

  const matchedPatterns = new Set<string>();

  fields.forEach((field) => {
    if (field.type !== 'number') return;

    const label = field.label;

    // Check if this is a remark field
    if (/remark/i.test(label) && !remarkField) {
      remarkField = {
        key: 'remark',
        fieldId: field.id,
        label,
        shortLabel: 'Remark',
      };
      return;
    }

    // Check each category pattern
    for (const { pattern, shortLabel } of categoryPatterns) {
      if (pattern.test(label) && !matchedPatterns.has(shortLabel)) {
        categories.push({
          key: shortLabel.toLowerCase(),
          fieldId: field.id,
          label,
          shortLabel,
        });
        matchedPatterns.add(shortLabel);
        break;
      }
    }
  });

  // Sort categories in a fixed order
  const order = ['LAP', 'UBL', 'SCF', 'CF', 'CIF'];
  categories.sort(
    (a, b) => order.indexOf(a.shortLabel) - order.indexOf(b.shortLabel)
  );

  return { categories, remarkField };
}

/**
 * Parse a numeric value from submission data.
 */
function toNumber(raw: any): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function FileVerificationReport({
  submissions,
  template,
  onRefresh,
  onDelete,
}: FileVerificationReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Flatten form fields
  const flattenedFields = useMemo(
    () => flattenFormFields(template.fields),
    [template.fields]
  );

  // Extract category fields from the template
  const { categories, remarkField } = useMemo(
    () => extractCategoryFields(flattenedFields),
    [flattenedFields]
  );

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName =
          submission.submitterName?.toLowerCase().includes(searchLower);
        const matchesEmail =
          submission.submitterEmail?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesEmail) return false;
      }

      const submittedDate =
        submission.submittedAt &&
        typeof submission.submittedAt === 'object' &&
        'toDate' in submission.submittedAt
          ? submission.submittedAt.toDate()
          : new Date(submission.submittedAt);

      if (startDate && submittedDate < new Date(startDate)) return false;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (submittedDate > endDateTime) return false;
      }

      return true;
    });
  }, [submissions, searchTerm, startDate, endDate]);

  // Group by day
  const groupedSubmissions = useMemo(
    () => groupSubmissionsByDay(filteredSubmissions),
    [filteredSubmissions]
  );

  // Calculate per-day totals
  const dayTotals = useMemo(() => {
    const totals = new Map<string, CategoryTotals>();
    groupedSubmissions.forEach((daySubs, dayLabel) => {
      const dayTotal: CategoryTotals = {};
      categories.forEach((cat) => {
        dayTotal[cat.key] = daySubs.reduce(
          (sum, sub) => sum + toNumber(sub.data?.[cat.fieldId]),
          0
        );
      });
      totals.set(dayLabel, dayTotal);
    });
    return totals;
  }, [groupedSubmissions, categories]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const totals: CategoryTotals = {};
    categories.forEach((cat) => {
      totals[cat.key] = filteredSubmissions.reduce(
        (sum, sub) => sum + toNumber(sub.data?.[cat.fieldId]),
        0
      );
    });
    return totals;
  }, [filteredSubmissions, categories]);

  const toggleDay = (dayLabel: string) => {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(dayLabel)) next.delete(dayLabel);
      else next.add(dayLabel);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    if (onDelete) onDelete(id);
  };

  const formatSubmittedAt = (submittedAt: Timestamp | string): string => {
    const date =
      typeof submittedAt === 'string'
        ? new Date(submittedAt)
        : submittedAt.toDate();
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const getValue = (submission: FormSubmission, fieldId: string): string => {
    const raw = submission.data?.[fieldId];
    if (raw === null || raw === undefined || raw === '') return '-';
    const num = toNumber(raw);
    return num.toString();
  };

  const getRemarkValue = (submission: FormSubmission): string => {
    if (!remarkField) return '-';
    const raw = submission.data?.[remarkField.fieldId];
    if (raw === null || raw === undefined || raw === '') return '-';
    return String(raw);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            File Verification Report ({filteredSubmissions.length} submissions)
          </h2>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={submissions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Export to Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            placeholder="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            placeholder="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Active filter pills */}
        {(searchTerm || startDate || endDate) && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-blue-600 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                From: {startDate}
                <button
                  onClick={() => setStartDate('')}
                  className="ml-2 text-green-600 hover:text-green-900"
                >
                  ×
                </button>
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                To: {endDate}
                <button
                  onClick={() => setEndDate('')}
                  className="ml-2 text-green-600 hover:text-green-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No submissions found</p>
            {(searchTerm || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {Array.from(groupedSubmissions.entries()).map(
              ([dayLabel, daySubs]) => {
                const isExpanded = expandedDays.has(dayLabel);
                const totals = dayTotals.get(dayLabel) || {};

                return (
                  <div key={dayLabel} className="space-y-3">
                    {/* Day Header */}
                    <div className="bg-blue-100 border border-blue-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-blue-900">
                            {dayLabel}
                          </h3>
                          <p className="text-xs sm:text-sm text-blue-700">
                            {daySubs.length} submission(s)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Daily category totals */}
                          <div className="flex flex-wrap justify-end gap-2 text-xs sm:text-sm font-semibold text-blue-900">
                            {categories.map((cat) => (
                              <span
                                key={cat.key}
                                className="rounded bg-white/70 px-2 py-1"
                              >
                                {cat.shortLabel}: {totals[cat.key] ?? 0}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleDay(dayLabel)}
                            className="rounded p-1 text-blue-900 hover:bg-blue-200"
                            aria-label={
                              isExpanded
                                ? `Hide submissions for ${dayLabel}`
                                : `Show submissions for ${dayLabel}`
                            }
                            aria-expanded={isExpanded}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`lucide lucide-chevron-up size-4 transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`}
                              aria-hidden="true"
                            >
                              <path d="m18 15-6-6-6 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="sticky left-0 z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[120px]">
                                    Name
                                  </th>
                                  <th className="sticky left-[120px] z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]">
                                    Email
                                  </th>
                                  <th className="sticky left-[300px] z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[160px]">
                                    Date &amp; Time
                                  </th>
                                  {categories.map((cat) => (
                                    <th
                                      key={cat.key}
                                      className="bg-gray-100 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]"
                                    >
                                      {cat.shortLabel}
                                    </th>
                                  ))}
                                  {remarkField && (
                                    <th className="bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[200px]">
                                      Remark
                                    </th>
                                  )}
                                  {onDelete && (
                                    <th className="bg-gray-100 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
                                      Actions
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {daySubs.map((submission, rowIndex) => (
                                  <tr
                                    key={submission.id}
                                    className={
                                      rowIndex % 2 === 0
                                        ? 'bg-white'
                                        : 'bg-gray-50'
                                    }
                                  >
                                    <td className="sticky left-0 z-10 px-4 py-3 text-sm text-gray-900 border-r border-gray-200 bg-inherit">
                                      <div
                                        className="font-medium truncate"
                                        title={
                                          submission.submitterName ||
                                          'Anonymous'
                                        }
                                      >
                                        {submission.submitterName || 'Anonymous'}
                                      </div>
                                    </td>
                                    <td className="sticky left-[120px] z-10 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 bg-inherit">
                                      <div
                                        className="truncate"
                                        title={submission.submitterEmail || '-'}
                                      >
                                        {submission.submitterEmail || '-'}
                                      </div>
                                    </td>
                                    <td className="sticky left-[300px] z-10 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 bg-inherit whitespace-nowrap">
                                      {formatSubmittedAt(
                                        submission.submittedAt
                                      )}
                                    </td>
                                    {categories.map((cat) => (
                                      <td
                                        key={cat.key}
                                        className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-200"
                                      >
                                        {getValue(submission, cat.fieldId)}
                                      </td>
                                    ))}
                                    {remarkField && (
                                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                                        <div
                                          className="truncate max-w-xs"
                                          title={getRemarkValue(submission)}
                                        >
                                          {getRemarkValue(submission)}
                                        </div>
                                      </td>
                                    )}
                                    {onDelete && (
                                      <td className="px-4 py-3 text-center text-sm">
                                        <button
                                          onClick={() =>
                                            handleDelete(submission.id)
                                          }
                                          className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              {/* Daily totals footer */}
                              <tfoot>
                                <tr className="bg-blue-50 font-semibold">
                                  <td
                                    colSpan={3}
                                    className="px-4 py-2 text-sm text-blue-900 border-r border-gray-200"
                                  >
                                    Daily Total
                                  </td>
                                  {categories.map((cat) => (
                                    <td
                                      key={cat.key}
                                      className="px-4 py-2 text-sm text-blue-900 text-center border-r border-gray-200"
                                    >
                                      {totals[cat.key] ?? 0}
                                    </td>
                                  ))}
                                  {remarkField && (
                                    <td className="px-4 py-2 text-sm text-blue-900 border-r border-gray-200">
                                      —
                                    </td>
                                  )}
                                  {onDelete && (
                                    <td className="px-4 py-2 text-sm text-blue-900">
                                      —
                                    </td>
                                  )}
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-4">
                          {daySubs.map((submission) => (
                            <div
                              key={submission.id}
                              className="border border-gray-200 rounded-lg p-4 bg-white"
                            >
                              {/* Submitter Info */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="text-sm font-semibold text-gray-900">
                                  {submission.submitterName || 'Anonymous'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {submission.submitterEmail || 'No email'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {formatSubmittedAt(submission.submittedAt)}
                                </div>
                              </div>

                              {/* Category values */}
                              <div className="space-y-3">
                                {categories.map((cat) => (
                                  <div key={cat.key} className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">
                                      {cat.label}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 bg-gray-100 rounded px-2 py-0.5">
                                      {getValue(submission, cat.fieldId)}
                                    </span>
                                  </div>
                                ))}
                                {remarkField && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">
                                      {remarkField.label}
                                    </div>
                                    <div className="text-sm text-gray-900 bg-gray-50 rounded p-2">
                                      {getRemarkValue(submission)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              {onDelete && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <button
                                    onClick={() =>
                                      handleDelete(submission.id)
                                    }
                                    className="w-full px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                                  >
                                    Delete Submission
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              }
            )}

            {/* Grand Totals */}
            {filteredSubmissions.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6 text-white">
                <h3 className="text-base sm:text-lg font-bold mb-3">
                  Grand Totals
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat.key}
                      className="bg-white/10 rounded-lg p-3 text-center"
                    >
                      <div className="text-xs text-gray-300 mb-1">
                        {cat.shortLabel}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {grandTotals[cat.key] ?? 0}
                      </div>
                    </div>
                  ))}
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-300 mb-1">
                      Submissions
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      {filteredSubmissions.length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll hint for desktop */}
      <div className="hidden lg:block px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-blue-800">
            Scroll horizontally to see all columns
          </span>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <SpreadsheetExportModal
          formId={template.id}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
