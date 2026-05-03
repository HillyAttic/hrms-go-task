'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormSubmission, FormField } from '@/types/form.types';
import { ExportModal, type ExportFilters } from './ExportModal';

interface ResponsesViewProps {
  formId: string;
  formTitle: string;
  fields: FormField[];
}

type ViewMode = 'summary' | 'individual';

export function ResponsesView({ formId, formTitle, fields }: ResponsesViewProps) {
  const [responses, setResponses] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedResponse, setSelectedResponse] = useState<FormSubmission | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [formId]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(
        `/api/forms/templates/${formId}/responses?limit=1000`
      );
      const result = await response.json();

      if (response.ok) {
        setResponses(result.responses || []);
      } else {
        toast.error(result.error || 'Failed to load responses');
      }
    } catch (error) {
      toast.error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (fieldId: string): string => {
    // Search in top-level fields
    const field = fields.find(f => f.id === fieldId);
    if (field) return field.label;

    // Search in nested section fields
    for (const sectionField of fields) {
      if (sectionField.type === 'section' && sectionField.fields) {
        const nestedField = sectionField.fields.find(f => f.id === fieldId);
        if (nestedField) return nestedField.label;
      }
    }

    return fieldId;
  };

  const getFieldType = (fieldId: string): string => {
    const field = fields.find(f => f.id === fieldId);
    if (field) return field.type;

    for (const sectionField of fields) {
      if (sectionField.type === 'section' && sectionField.fields) {
        const nestedField = sectionField.fields.find(f => f.id === fieldId);
        if (nestedField) return nestedField.type;
      }
    }

    return 'text';
  };

  const formatValue = (value: any, fieldId: string): string => {
    if (value === null || value === undefined) return 'No answer';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const calculateSummaryStats = (fieldId: string) => {
    const fieldType = getFieldType(fieldId);
    const values = responses
      .map(r => r.data[fieldId])
      .filter(v => v !== null && v !== undefined && v !== '');

    if (values.length === 0) return null;

    // For choice-based fields (radio, select, checkbox, multiselect)
    if (['radio', 'select', 'checkbox', 'multiselect'].includes(fieldType)) {
      const counts: Record<string, number> = {};

      values.forEach(value => {
        if (Array.isArray(value)) {
          value.forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
          });
        } else {
          counts[value] = (counts[value] || 0) + 1;
        }
      });

      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([option, count]) => ({
          option,
          count,
          percentage: ((count / total) * 100).toFixed(1),
        }));
    }

    // For text-based fields, just show count
    return { responseCount: values.length };
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';

    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleExportToExcel = async (filters: ExportFilters) => {
    try {
      setExporting(true);

      // Build query params
      const params = new URLSearchParams();

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      // If no custom date range, use month/year
      if (!filters.startDate && !filters.endDate && filters.month && filters.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }

      const response = await authenticatedFetch(
        `/api/forms/templates/${formId}/export?${params.toString()}`
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || 'Failed to export responses');
        return;
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitle.replace(/[^a-z0-9]/gi, '_')}_responses.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Responses exported successfully');
      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export responses');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading responses...</p>
        </div>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
        <div className="text-6xl text-gray-300 mb-4">📊</div>
        <h2 className="text-xl font-medium text-gray-600 mb-2">0 responses</h2>
        <p className="text-sm text-gray-400">Share your form to start receiving responses</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with view toggle and export button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {responses.length} {responses.length === 1 ? 'response' : 'responses'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Accepting responses
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'summary'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'individual'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={exporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export to Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-4">
          {fields.map((field) => {
            if (field.type === 'section') {
              return (
                <div key={field.id} className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {field.label}
                    </h3>
                    {field.description && (
                      <p className="text-sm text-gray-600">{field.description}</p>
                    )}
                  </div>
                  {field.fields?.map((nestedField) => {
                    const stats = calculateSummaryStats(nestedField.id);
                    if (!stats) return null;

                    return (
                      <div
                        key={nestedField.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                      >
                        <h4 className="text-base font-medium text-gray-900 mb-4">
                          {nestedField.label}
                        </h4>
                        {Array.isArray(stats) ? (
                          <div className="space-y-3">
                            {stats.map((stat, idx) => (
                              <div key={idx}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700">{stat.option}</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {stat.count} ({stat.percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${stat.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {stats.responseCount} {stats.responseCount === 1 ? 'response' : 'responses'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }

            const stats = calculateSummaryStats(field.id);
            if (!stats) return null;

            return (
              <div
                key={field.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h4 className="text-base font-medium text-gray-900 mb-4">
                  {field.label}
                </h4>
                {Array.isArray(stats) ? (
                  <div className="space-y-3">
                    {stats.map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{stat.option}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {stat.count} ({stat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {stats.responseCount} {stats.responseCount === 1 ? 'response' : 'responses'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Individual View */}
      {viewMode === 'individual' && (
        <div className="space-y-4">
          {responses.map((response, idx) => (
            <motion.div
              key={response.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Response #{responses.length - idx}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {response.submitterName || response.submitterEmail || 'Anonymous'} • {formatDate(response.submittedAt)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {fields.map((field) => {
                  if (field.type === 'section') {
                    return (
                      <div key={field.id} className="space-y-3">
                        <h5 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                          {field.label}
                        </h5>
                        {field.fields?.map((nestedField) => (
                          <div key={nestedField.id} className="ml-4">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              {nestedField.label}
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatValue(response.data[nestedField.id], nestedField.id)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div key={field.id}>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        {field.label}
                      </p>
                      <p className="text-sm text-gray-900">
                        {formatValue(response.data[field.id], field.id)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportToExcel}
        isExporting={exporting}
      />
    </div>
  );
}
