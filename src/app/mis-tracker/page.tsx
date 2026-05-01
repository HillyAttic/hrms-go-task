'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { SubmissionsTable } from '@/components/forms/submissions/SubmissionsTable';
import { SubmissionsSpreadsheetView } from '@/components/forms/submissions/SubmissionsSpreadsheetView';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { useModal } from '@/contexts/modal-context';

export default function MISTrackerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthEnhanced();
  const { openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);

  // Default view: spreadsheet on desktop (lg+), table on mobile
  const [viewMode, setViewMode] = useState<'table' | 'spreadsheet'>('spreadsheet');

  // Set default view based on screen size on mount
  useEffect(() => {
    const handleResize = () => {
      // Only set default on initial load, not on every resize
      if (typeof window !== 'undefined') {
        const isDesktop = window.innerWidth >= 1024; // lg breakpoint
        setViewMode(isDesktop ? 'spreadsheet' : 'table');
      }
    };

    // Set initial view
    handleResize();
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get MIS config
      const configResponse = await authenticatedFetch('/api/mis-config');
      const configData = await configResponse.json();

      if (!configResponse.ok || !configData.success) {
        toast.error('Failed to load MIS configuration');
        return;
      }

      setHasAccess(configData.data.hasSheetAccess || false);

      if (!configData.data.hasSheetAccess) {
        return;
      }

      const dailyFormTemplateId = configData.data.dailyFormTemplateId;

      if (!dailyFormTemplateId) {
        // No form configured yet
        return;
      }

      // Fetch form template
      const templateResponse = await authenticatedFetch(
        `/api/forms/templates/${dailyFormTemplateId}`
      );
      const templateResult = await templateResponse.json();

      if (templateResponse.ok && templateResult.success) {
        setTemplate(templateResult.template);

        // Fetch submissions
        const submissionsResponse = await authenticatedFetch(
          `/api/forms/submissions?formId=${dailyFormTemplateId}`
        );
        const submissionsResult = await submissionsResponse.json();

        if (submissionsResponse.ok && submissionsResult.success) {
          setSubmissions(submissionsResult.submissions);
        }
      }
    } catch (error) {
      console.error('Error fetching MIS data:', error);
      toast.error('Failed to load MIS data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/forms/submissions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Submission deleted successfully');
        fetchData();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to delete submission');
      }
    } catch (error) {
      toast.error('Failed to delete submission');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You do not have permission to view the MIS Tracker. Please contact your administrator
            if you believe this is an error.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Form Configured
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The daily MIS form has not been configured yet. Please contact your administrator.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">MIS Tracker</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and manage daily form submissions
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>Table</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                viewMode === 'spreadsheet'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Spreadsheet</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {viewMode === 'table' ? (
          <SubmissionsTable
            submissions={submissions}
            template={template}
            onRefresh={fetchData}
            onDelete={handleDelete}
            onModalOpen={openModal}
            onModalClose={closeModal}
          />
        ) : (
          <SubmissionsSpreadsheetView
            submissions={submissions}
            template={template}
            onRefresh={fetchData}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
