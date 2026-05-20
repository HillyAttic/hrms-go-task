'use client';

import React, { useState, useMemo } from 'react';
import type { FormSubmission, FormTemplate, FormField } from '@/types/form.types';
import { flattenFormFields, getDailySubmissionSummary, groupSubmissionsByDay, formatCellValue } from '@/utils/submission-utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SpreadsheetExportModal } from './SpreadsheetExportModal';

interface NumericFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equal' |
            'less_than' | 'less_than_or_equal' | 'between';
  value: number | null;
  valueTo?: number | null;
}

interface SubmissionsSpreadsheetViewProps {
  submissions: FormSubmission[];
  template: FormTemplate;
  onRefresh: () => void;
  onDelete?: (id: string) => void;
}

export function SubmissionsSpreadsheetView({
  submissions,
  template,
  onRefresh,
  onDelete,
}: SubmissionsSpreadsheetViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [numericFilters, setNumericFilters] = useState<NumericFilter[]>([]);
  const [showNumericFilters, setShowNumericFilters] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Flatten form fields (extract nested fields from sections)
  const flattenedFields = useMemo(() => {
    return flattenFormFields(template.fields);
  }, [template.fields]);

  // Get numeric fields from template
  const numericFields = useMemo(() => {
    return flattenedFields.filter(field => field.type === 'number');
  }, [flattenedFields]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = submission.submitterName?.toLowerCase().includes(searchLower);
        const matchesEmail = submission.submitterEmail?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesEmail) return false;
      }

      // Date range filter
      const submittedDate =
        submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
          ? submission.submittedAt.toDate()
          : new Date(submission.submittedAt);

      if (startDate) {
        if (submittedDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (submittedDate > endDateTime) return false;
      }

      // Numeric filters
      for (const filter of numericFilters) {
        // Skip incomplete filters
        if (!filter.fieldId || !filter.operator || filter.value === null) {
          continue;
        }

        const fieldValue = submission.data[filter.fieldId];

        // Handle missing/empty values - exclude submissions without the field value
        if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
          return false;
        }

        // Convert to number (handle string numbers)
        const numValue = typeof fieldValue === 'number'
          ? fieldValue
          : parseFloat(String(fieldValue));

        // Skip if not a valid number
        if (isNaN(numValue)) {
          return false;
        }

        // Apply operator logic
        const filterValue = filter.value!;
        let matches = false;

        switch (filter.operator) {
          case 'equals':
            matches = numValue === filterValue;
            break;
          case 'not_equals':
            matches = numValue !== filterValue;
            break;
          case 'greater_than':
            matches = numValue > filterValue;
            break;
          case 'greater_than_or_equal':
            matches = numValue >= filterValue;
            break;
          case 'less_than':
            matches = numValue < filterValue;
            break;
          case 'less_than_or_equal':
            matches = numValue <= filterValue;
            break;
          case 'between':
            if (filter.valueTo !== null && filter.valueTo !== undefined) {
              matches = numValue >= filterValue && numValue <= filter.valueTo;
            } else {
              matches = false;
            }
            break;
          default:
            matches = true;
        }

        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, searchTerm, startDate, endDate, numericFilters]);

  // Group submissions by day
  const groupedSubmissions = useMemo(() => {
    return groupSubmissionsByDay(filteredSubmissions);
  }, [filteredSubmissions]);

  // Helper functions
  const generateFilterId = () => `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getFieldLabel = (fieldId: string): string => {
    const field = flattenedFields.find(f => f.id === fieldId);
    return field?.label || 'Unknown Field';
  };

  const formatOperator = (operator: string): string => {
    const operatorLabels: Record<string, string> = {
      equals: '=',
      not_equals: '≠',
      greater_than: '>',
      greater_than_or_equal: '≥',
      less_than: '<',
      less_than_or_equal: '≤',
      between: 'between'
    };
    return operatorLabels[operator] || operator;
  };

  // Event handlers
  const handleAddNumericFilter = () => {
    if (numericFields.length === 0) return;

    const newFilter: NumericFilter = {
      id: generateFilterId(),
      fieldId: numericFields[0].id,
      operator: 'equals',
      value: null,
      valueTo: null
    };
    setNumericFilters([...numericFilters, newFilter]);
    setShowNumericFilters(true);
  };

  const handleRemoveNumericFilter = (filterId: string) => {
    setNumericFilters(numericFilters.filter(f => f.id !== filterId));
  };

  const handleUpdateNumericFilter = (
    filterId: string,
    updates: Partial<NumericFilter>
  ) => {
    setNumericFilters(numericFilters.map(f =>
      f.id === filterId ? { ...f, ...updates } : f
    ));
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setNumericFilters([]);
  };

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
    if (onDelete) {
      onDelete(id);
    }
  };

  const formatSubmittedAt = (submittedAt: Timestamp | string): string => {
    const date =
      typeof submittedAt === 'string' ? new Date(submittedAt) : submittedAt.toDate();
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Spreadsheet View ({filteredSubmissions.length} submissions)
          </h2>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={submissions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

        {/* Numeric Filters Section */}
        {numericFields.length > 0 && (
          <div className="col-span-full mt-4">
            <button
              onClick={() => setShowNumericFilters(!showNumericFilters)}
              className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showNumericFilters ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>
                Numeric Filters
                {numericFilters.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    {numericFilters.length}
                  </span>
                )}
              </span>
            </button>

            {showNumericFilters && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                {numericFilters.map((filter) => (
                  <div key={filter.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-end">
                    {/* Field Selector */}
                    <div className="lg:col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Field
                      </label>
                      <select
                        value={filter.fieldId}
                        onChange={(e) => handleUpdateNumericFilter(filter.id, {
                          fieldId: e.target.value
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {numericFields.map(field => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operator Selector */}
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Operator
                      </label>
                      <select
                        value={filter.operator}
                        onChange={(e) => handleUpdateNumericFilter(filter.id, {
                          operator: e.target.value as NumericFilter['operator'],
                          valueTo: e.target.value === 'between' ? filter.valueTo : null
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="equals">=  Equals</option>
                        <option value="not_equals">≠  Not Equals</option>
                        <option value="greater_than">&gt;  Greater Than</option>
                        <option value="greater_than_or_equal">≥  Greater or Equal</option>
                        <option value="less_than">&lt;  Less Than</option>
                        <option value="less_than_or_equal">≤  Less or Equal</option>
                        <option value="between">Between</option>
                      </select>
                    </div>

                    {/* Value Input(s) */}
                    {filter.operator === 'between' ? (
                      <>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Min
                          </label>
                          <input
                            type="number"
                            value={filter.value ?? ''}
                            onChange={(e) => handleUpdateNumericFilter(filter.id, {
                              value: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            placeholder="Min"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Max
                          </label>
                          <input
                            type="number"
                            value={filter.valueTo ?? ''}
                            onChange={(e) => handleUpdateNumericFilter(filter.id, {
                              valueTo: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            placeholder="Max"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="lg:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Value
                        </label>
                        <input
                          type="number"
                          value={filter.value ?? ''}
                          onChange={(e) => handleUpdateNumericFilter(filter.id, {
                            value: e.target.value ? parseFloat(e.target.value) : null
                          })}
                          placeholder="Enter value"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* Remove Button */}
                    <div className="lg:col-span-1">
                      <button
                        onClick={() => handleRemoveNumericFilter(filter.id)}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove filter"
                        aria-label={`Remove filter for ${getFieldLabel(filter.fieldId)}`}
                      >
                        <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Filter Button */}
                <button
                  onClick={handleAddNumericFilter}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-300 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Numeric Filter</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Pills */}
        {(searchTerm || startDate || endDate || numericFilters.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-blue-600 hover:text-blue-900"
                  aria-label="Clear search filter"
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
                  aria-label="Clear start date filter"
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
                  aria-label="Clear end date filter"
                >
                  ×
                </button>
              </span>
            )}
            {numericFilters.map(filter => {
              if (!filter.fieldId || filter.value === null) return null;

              const fieldLabel = getFieldLabel(filter.fieldId);
              const operatorSymbol = formatOperator(filter.operator);
              const valueText = filter.operator === 'between' && filter.valueTo !== null
                ? `${filter.value} - ${filter.valueTo}`
                : filter.value;

              return (
                <span
                  key={filter.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                >
                  {fieldLabel} {operatorSymbol} {valueText}
                  <button
                    onClick={() => handleRemoveNumericFilter(filter.id)}
                    className="ml-2 text-purple-600 hover:text-purple-900"
                    aria-label={`Remove numeric filter for ${fieldLabel}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Content */}
      <div className="p-4 sm:p-6">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No submissions found</p>
            {(searchTerm || startDate || endDate || numericFilters.length > 0) && (
              <button
                onClick={handleClearAllFilters}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {Array.from(groupedSubmissions.entries()).map(([dayLabel, daySubs]) => {
              const isExpanded = expandedDays.has(dayLabel);
              const summary = getDailySubmissionSummary(flattenedFields, daySubs);

              return (
              <div key={dayLabel} className="space-y-3">
                {/* Day Header */}
                <div className="bg-blue-100 border border-blue-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-blue-900">{dayLabel}</h3>
                      <p className="text-xs sm:text-sm text-blue-700">{daySubs.length} submission(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap justify-end gap-2 text-xs sm:text-sm font-semibold text-blue-900">
                        {summary.map((item) => (
                          <span key={item.key} className="rounded bg-white/70 px-2 py-1">
                            {item.shortLabel}: {item.total}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleDay(dayLabel)}
                        className="rounded p-1 text-blue-900 hover:bg-blue-200"
                        aria-label={isExpanded ? `Hide submissions for ${dayLabel}` : `Show submissions for ${dayLabel}`}
                        aria-expanded={isExpanded}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-up size-4 transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`} aria-hidden="true"><path d="m18 15-6-6-6 6"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                {/* Desktop Spreadsheet Table */}
                <div className="hidden lg:block border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {/* Sticky columns: Name, Email, Date/Time */}
                          <th className="sticky left-0 z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[150px]">
                            Name
                          </th>
                          <th className="sticky left-[150px] z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[200px]">
                            Email
                          </th>
                          <th className="sticky left-[350px] z-20 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[180px]">
                            Date & Time
                          </th>

                          {/* Question columns */}
                          {flattenedFields.map((field, index) => (
                            <th
                              key={field.id}
                              className="bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[200px]"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-blue-600">Q{index + 1}</span>
                                <span className="truncate" title={field.label}>
                                  {field.label}
                                </span>
                              </div>
                            </th>
                          ))}

                          {/* Actions column */}
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
                            className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            {/* Sticky columns */}
                            <td className="sticky left-0 z-10 px-4 py-3 text-sm text-gray-900 border-r border-gray-200 bg-inherit">
                              <div className="font-medium truncate" title={submission.submitterName || 'Anonymous'}>
                                {submission.submitterName || 'Anonymous'}
                              </div>
                            </td>
                            <td className="sticky left-[150px] z-10 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 bg-inherit">
                              <div className="truncate" title={submission.submitterEmail || '-'}>
                                {submission.submitterEmail || '-'}
                              </div>
                            </td>
                            <td className="sticky left-[350px] z-10 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 bg-inherit whitespace-nowrap">
                              {formatSubmittedAt(submission.submittedAt)}
                            </td>

                            {/* Answer columns */}
                            {flattenedFields.map((field) => {
                              const value = submission.data[field.id];

                              // Special handling for file fields
                              if (field.type === 'file') {
                                const fileAttachments = submission.files?.filter(
                                  (f) => f.fieldId === field.id
                                );

                                return (
                                  <td
                                    key={field.id}
                                    className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200"
                                  >
                                    {fileAttachments && fileAttachments.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {fileAttachments.map((file, idx) => (
                                          <a
                                            key={idx}
                                            href={file.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-medium transition-colors"
                                            title={file.fileName}
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="truncate max-w-[100px]">
                                              {file.fileName}
                                            </span>
                                          </a>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                );
                              }

                              // Regular field handling
                              const formattedValue = formatCellValue(value, field.type);

                              return (
                                <td
                                  key={field.id}
                                  className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200"
                                >
                                  <div
                                    className="truncate max-w-xs"
                                    title={formattedValue}
                                  >
                                    {formattedValue}
                                  </div>
                                </td>
                              );
                            })}

                            {/* Actions column */}
                            {onDelete && (
                              <td className="px-4 py-3 text-center text-sm">
                                <button
                                  onClick={() => handleDelete(submission.id)}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {daySubs.map((submission) => (
                    <div key={submission.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      {/* Submitter Info */}
                      <div className="mb-3 pb-3 border-b border-gray-200">
                        <div className="text-sm font-semibold text-gray-900">
                          {submission.submitterName || 'Anonymous'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {submission.submitterEmail || 'No email'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatSubmittedAt(submission.submittedAt)}
                        </div>
                      </div>

                      {/* Answers */}
                      <div className="space-y-3">
                        {flattenedFields.map((field, index) => {
                          const value = submission.data[field.id];

                          // Special handling for file fields
                          if (field.type === 'file') {
                            const fileAttachments = submission.files?.filter(
                              (f) => f.fieldId === field.id
                            );

                            return (
                              <div key={field.id} className="text-sm">
                                <div className="text-xs font-medium text-gray-500 mb-1">
                                  Q{index + 1}: {field.label}
                                </div>
                                {fileAttachments && fileAttachments.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {fileAttachments.map((file, idx) => (
                                      <a
                                        key={idx}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium"
                                      >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="truncate max-w-[150px]">{file.fileName}</span>
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-400">-</div>
                                )}
                              </div>
                            );
                          }

                          const formattedValue = formatCellValue(value, field.type);

                          return (
                            <div key={field.id} className="text-sm">
                              <div className="text-xs font-medium text-gray-500 mb-1">
                                Q{index + 1}: {field.label}
                              </div>
                              <div className="text-gray-900">{formattedValue}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      {onDelete && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleDelete(submission.id)}
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
            })}
          </div>
        )}
      </div>

      {/* Scroll hint for desktop */}
      <div className="hidden lg:block px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-blue-800">Scroll horizontally to see all columns</span>
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
