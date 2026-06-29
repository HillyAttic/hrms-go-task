'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

export default function FormPage({ params }: { params: Promise<{ formId: string }> }) {
  const router = useRouter();
  const [formId, setFormId] = useState<string | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeParams = async () => {
      const { formId: id } = await params;
      setFormId(id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (!formId) return;

    const fetchTemplate = async () => {
      try {
        const response = await authenticatedFetch(
          `/api/forms/templates/${formId}`
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to load form');
        }

        const result = await response.json();
        setTemplate(result.template);
      } catch (err: any) {
        console.error('Error loading form:', err);
        setError(err.message || 'Failed to load form');
        toast.error(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [formId]);

  const handleSuccess = (submissionId: string) => {
    // Show success message and redirect after 2 seconds
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Form Not Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This form could not be found or you do not have access to it.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (template.status !== 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-yellow-600 text-5xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Form Not Published
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This form is currently in draft mode and not accepting submissions.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <FormRenderer template={template} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
