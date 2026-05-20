'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { SubmissionsTable } from '@/components/forms/submissions/SubmissionsTable';
import { SubmissionsSpreadsheetView } from '@/components/forms/submissions/SubmissionsSpreadsheetView';
import { SubmissionAnalyticsStats } from '@/components/forms/submissions/SubmissionAnalyticsStats';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { useModal } from '@/contexts/modal-context';

export default function MISTrackerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthEnhanced();
  const { openModal, closeModal } = useModal();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [availableForms, setAvailableForms] = useState<FormTemplate[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
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

  // Refetch data when URL params change
  useEffect(() => {
    const formIdFromUrl = searchParams.get('formId');
    if (formIdFromUrl && formIdFromUrl !== selectedFormId && !authLoading && user) {
      fetchData();
    }
  }, [searchParams]);

  const handleFormChange = (formId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('formId', formId);
    router.push(`/mis-tracker?${params.toString()}`);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Get MIS config (for access control and default form)
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

      // 2. Fetch all published forms
      const formsResponse = await authenticatedFetch('/api/forms/templates?status=published');
      const formsResult = await formsResponse.json();

      if (!formsResponse.ok || !formsResult.success) {
        toast.error('Failed to load forms');
        return;
      }

      const forms = formsResult.templates || [];
      setAvailableForms(forms);

      if (forms.length === 0) {
        // No published forms available
        return;
      }

      // 3. Determine which form to display (priority order)
      let formToDisplay: string | null = null;

      const formIdFromUrl = searchParams.get('formId');
      if (formIdFromUrl && forms.some((f: FormTemplate) => f.id === formIdFromUrl)) {
        // URL param is valid
        formToDisplay = formIdFromUrl;
      } else if (configData.data.dailyFormTemplateId &&
                 forms.some((f: FormTemplate) => f.id === configData.data.dailyFormTemplateId)) {
        // Use MIS config default
        formToDisplay = configData.data.dailyFormTemplateId;
      } else if (forms.length > 0) {
        // Use first form
        formToDisplay = forms[0].id;
      }

      if (!formToDisplay) {
        return;
      }

      // 4. Update URL if needed
      if (!formIdFromUrl || formIdFromUrl !== formToDisplay) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('formId', formToDisplay);
        router.replace(`/mis-tracker?${params.toString()}`, { scroll: false });
      }

      setSelectedFormId(formToDisplay);

      // 5. Fetch form template and submissions for selected form
      const templateResponse = await authenticatedFetch(
        `/api/forms/templates/${formToDisplay}`
      );
      const templateResult = await templateResponse.json();

      if (templateResponse.ok && templateResult.success) {
        setTemplate(templateResult.template);

        // Fetch submissions (request high limit to get all submissions)
        const submissionsResponse = await authenticatedFetch(
          `/api/forms/submissions?formId=${formToDisplay}&limit=10000`
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

  if (availableForms.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="mb-4 text-6xl">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Forms Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No published forms found. Create and publish a form to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/forms/builder')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Go to Form Builder
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">MIS Tracker</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
              View and manage form submissions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Form Selector Dropdown */}
            {availableForms.length > 0 && (
              <select
                value={selectedFormId || ''}
                onChange={(e) => handleFormChange(e.target.value)}
                className="flex-1 sm:flex-none sm:min-w-[250px] px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title} ({form.submissionCount || 0} submissions)
                  </option>
                ))}
              </select>
            )}

            {/* View Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Table</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('spreadsheet')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'spreadsheet'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Spreadsheet</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {template && (
          <>
            {/* Analytics Stats Section */}
            <div className="mb-4 sm:mb-6">
              <SubmissionAnalyticsStats
                formId={selectedFormId!}
                template={template}
                onRefresh={fetchData}
              />
            </div>

            {/* Existing Table/Spreadsheet Views */}
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
          </>
        )}
      </div>
    </div>
  );
}
