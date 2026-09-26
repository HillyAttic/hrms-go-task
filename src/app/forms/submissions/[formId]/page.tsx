'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormSubmission, FormTemplate } from '@/types/form.types';
import { SubmissionsTable } from '@/components/forms/submissions/SubmissionsTable';
import { toast } from 'react-toastify';

export default function FormSubmissionsPage({ params }: { params: Promise<{ formId: string }> }) {
  const router = useRouter();
  const [formId, setFormId] = useState<string | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeParams = async () => {
      const { formId: id } = await params;
      setFormId(id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (!formId) return;
    fetchData();
  }, [formId]);

  const fetchData = async () => {
    if (!formId) return;

    try {
      setLoading(true);

      // Fetch template
      const templateResponse = await authenticatedFetch(
        `/api/forms/templates/${formId}`
      );
      const templateResult = await templateResponse.json();

      if (!templateResponse.ok) {
        throw new Error(templateResult.error || 'Failed to load form');
      }

      setTemplate(templateResult.template);

      // Fetch submissions
      const submissionsResponse = await authenticatedFetch(
        `/api/forms/submissions?formId=${formId}`
      );
      const submissionsResult = await submissionsResponse.json();

      if (!submissionsResponse.ok) {
        throw new Error(submissionsResult.error || 'Failed to load submissions');
      }

      setSubmissions(submissionsResult.submissions);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Failed to load data');
      router.push('/forms/builder');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Form not found</p>
          <button
            onClick={() => router.push('/forms/builder')}
            className="mt-4 px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/forms/builder')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Forms</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>
              {template.description && (
                <p className="text-gray-600 mt-1">{template.description}</p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Submissions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {submissions.length}
                </div>
              </div>
              <button
                onClick={() => router.push(`/forms/builder/${formId}`)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Edit Form
              </button>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <SubmissionsTable
          submissions={submissions}
          template={template}
          onRefresh={fetchData}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
