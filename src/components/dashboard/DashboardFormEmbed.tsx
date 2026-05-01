'use client';

import React, { useState, useEffect } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

export default function DashboardFormEmbed() {
  const { user } = useAuthEnhanced();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fieldIdCounter = React.useRef(0);

  useEffect(() => {
    if (user) {
      fetchFormData();
    }
  }, [user]);

  const fetchFormData = async () => {
    try {
      // Get MIS config to check access and get form template ID
      const configResponse = await authenticatedFetch('/api/mis-config');
      const configData = await configResponse.json();

      if (!configResponse.ok || !configData.success) {
        console.error('Failed to load MIS config');
        setLoading(false);
        return;
      }

      const hasFormAccess = configData.data.hasFormAccess || false;
      const dailyFormTemplateId = configData.data.dailyFormTemplateId;

      setHasAccess(hasFormAccess);

      // If user has access and there's a form configured, fetch the template
      if (hasFormAccess && dailyFormTemplateId) {
        const templateResponse = await authenticatedFetch(
          `/api/forms/templates/${dailyFormTemplateId}`
        );

        if (templateResponse.ok) {
          const templateResult = await templateResponse.json();
          if (templateResult.success && templateResult.template) {
            // Fix duplicate field IDs if they exist
            const fetchedTemplate = templateResult.template;
            const seenIds = new Set<string>();
            const fixedFields = fetchedTemplate.fields.map((field: any) => {
              if (seenIds.has(field.id)) {
                // Generate new unique ID for duplicate
                return { ...field, id: `field_${Date.now()}_${fieldIdCounter.current++}` };
              }
              seenIds.add(field.id);
              return field;
            });

            const finalTemplate = { ...fetchedTemplate, fields: fixedFields };
            setTemplate(finalTemplate);

            // Check if user has already submitted this form (if multiple submissions not allowed)
            if (!finalTemplate.settings.allowMultipleSubmissions) {
              const submissionsResponse = await authenticatedFetch(
                `/api/forms/submissions?formId=${dailyFormTemplateId}&submittedBy=${user?.uid}&limit=1`
              );

              if (submissionsResponse.ok) {
                const submissionsData = await submissionsResponse.json();
                if (submissionsData.success && submissionsData.submissions.length > 0) {
                  // User has already submitted this form
                  setIsSubmitted(true);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (submissionId: string) => {
    // If multiple submissions are NOT allowed, hide the form and show success message
    if (template && !template.settings.allowMultipleSubmissions) {
      setIsSubmitted(true);
    } else {
      // If multiple submissions are allowed, just show toast
      toast.success('Form submitted successfully!');
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  // Don't render anything if loading, no access, or no template
  if (loading || !hasAccess || !template) {
    return null;
  }

  // Don't render if form is not published
  if (template.status !== 'published') {
    return null;
  }

  // If form has been submitted and multiple submissions are not allowed, show success message
  if (isSubmitted && !template.settings.allowMultipleSubmissions) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Daily MIS Form</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
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
                  className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2"
                >
                  <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                  <path d="m9 11 3 3L22 4"></path>
                </svg>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Form Submitted Successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {template.settings.successMessage}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Daily MIS Form</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <FormRenderer
            template={template}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </CardContent>
    </Card>
  );
}
