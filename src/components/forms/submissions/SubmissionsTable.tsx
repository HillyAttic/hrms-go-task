'use client';

import React, { useState, useMemo } from 'react';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { SubmissionExportModal } from './SubmissionExportModal';
import { groupSubmissionsByDay } from '@/utils/submission-utils';

interface SubmissionsTableProps {
  submissions: FormSubmission[];
  template: FormTemplate;
  onRefresh: () => void;
  onDelete?: (id: string) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}

export function SubmissionsTable({
  submissions,
  template,
  onRefresh,
  onDelete,
  onModalOpen,
  onModalClose,
}: SubmissionsTableProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Notify parent when modal state changes
  React.useEffect(() => {
    const isModalOpen = !!selectedSubmission || showExportModal;
    if (isModalOpen) {
      onModalOpen?.();
    } else {
      onModalClose?.();
    }
  }, [selectedSubmission, showExportModal, onModalOpen, onModalClose]);

  // Filter submissions
  const filteredSubmissions = submissions.filter((submission) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = submission.submitterName?.toLowerCase().includes(searchLower);
      const matchesEmail = submission.submitterEmail?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesEmail) return false;
    }

    // Date range filter
    if (startDate) {
      const submittedDate = submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
        ? submission.submittedAt.toDate()
        : new Date(submission.submittedAt);
      if (submittedDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const submittedDate = submission.submittedAt && typeof submission.submittedAt === 'object' && 'toDate' in submission.submittedAt
        ? submission.submittedAt.toDate()
        : new Date(submission.submittedAt);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      if (submittedDate > endDateTime) return false;
    }

    return true;
  });

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

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Submissions ({filteredSubmissions.length})
          </h2>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base"
          >
            Export
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

      {/* Table */}
      <div className="overflow-x-auto">
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
              <div key={dayLabel}>
                {/* Day Header */}
                <div className="bg-blue-100 border border-blue-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3 mb-3">
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900">{dayLabel}</h3>
                  <p className="text-xs sm:text-sm text-blue-700">{daySubs.length} submission(s)</p>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitter
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Files
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {daySubs.map((submission) => (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {submission.submitterName || 'Anonymous'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.submitterEmail || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {typeof submission.submittedAt === 'string'
                              ? new Date(submission.submittedAt).toLocaleString()
                              : submission.submittedAt.toDate().toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {submission.files && submission.files.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {submission.files.length} file(s)
                              </span>
                            ) : (
                              <span className="text-gray-400">No files</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {!submission.isRead && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  New
                                </span>
                              )}
                              {submission.isFlagged && (
                                <span className="text-red-500">🚩</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedSubmission(submission)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </button>
                            {onDelete && (
                              <button
                                onClick={() => handleDelete(submission.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  {daySubs.map((submission) => (
                    <div key={submission.id} className="p-4 hover:bg-gray-50 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.submitterName || 'Anonymous'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {submission.submitterEmail || 'No email'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {!submission.isRead && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              New
                            </span>
                          )}
                          {submission.isFlagged && (
                            <span className="text-red-500">🚩</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-gray-600 mb-3">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {typeof submission.submittedAt === 'string'
                            ? new Date(submission.submittedAt).toLocaleString()
                            : submission.submittedAt.toDate().toLocaleString()}
                        </div>
                        {submission.files && submission.files.length > 0 && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {submission.files.length} file(s) attached
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          View Details
                        </button>
                        {onDelete && (
                          <button
                            onClick={() => handleDelete(submission.id)}
                            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          template={template}
          onClose={() => setSelectedSubmission(null)}
          onRefresh={onRefresh}
        />
      )}

      {showExportModal && (
        <SubmissionExportModal
          formId={template.id}
          formTitle={template.title}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
