'use client';

import React, { useState, useMemo } from 'react';
import type { FormSubmission, FormTemplate, FormField } from '@/types/form.types';
import { flattenFormFields, groupSubmissionsByDay, formatCellValue } from '@/utils/submission-utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { SpreadsheetExportModal } from './SpreadsheetExportModal';

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

  // Flatten form fields (extract nested fields from sections)
  const flattenedFields = useMemo(() => {
    return flattenFormFields(template.fields);
  }, [template.fields]);

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

      return true;
    });
  }, [submissions, searchTerm, startDate, endDate]);

  // Group submissions by day
  const groupedSubmissions = useMemo(() => {
    return groupSubmissionsByDay(filteredSubmissions);
  }, [filteredSubmissions]);

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
      </div>

      {/* Spreadsheet Content */}
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
            {Array.from(groupedSubmissions.entries()).map(([dayLabel, daySubs]) => (
              <div key={dayLabel} className="space-y-3">
                {/* Day Header */}
                <div className="bg-blue-100 border border-blue-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900">{dayLabel}</h3>
                  <p className="text-xs sm:text-sm text-blue-700">{daySubs.length} submission(s)</p>
                </div>

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
              </div>
            ))}
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
          submissions={submissions}
          template={template}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
