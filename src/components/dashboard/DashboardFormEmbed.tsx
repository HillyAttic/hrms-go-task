'use client';

import React, { useState, useEffect } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function DashboardFormEmbed() {
  const { user } = useAuthEnhanced();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userIsClockedIn, setUserIsClockedIn] = useState(false);
  const [dailyFormTemplateId, setDailyFormTemplateId] = useState<string | null>(null);
  const fieldIdCounter = React.useRef(0);

  useEffect(() => {
    if (user) {
      fetchFormData();
      checkClockInStatus();
    }
  }, [user]);

  const checkClockInStatus = async () => {
    try {
      const response = await authenticatedFetch(`/api/attendance/status?employeeId=${user?.uid}`);
      if (response.ok) {
        const status = await response.json();
        setUserIsClockedIn(status.isClockedIn || false);
      }
    } catch (error) {
      console.error('Error checking clock-in status:', error);
    }
  };

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
      setDailyFormTemplateId(dailyFormTemplateId);

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

            // Check if user has already submitted this form TODAY (if multiple submissions not allowed)
            if (!finalTemplate.settings.allowMultipleSubmissions) {
              // Use the check-today endpoint to see if submitted today
              const checkTodayResponse = await authenticatedFetch(
                `/api/forms/submissions/check-today`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    formId: dailyFormTemplateId,
                    userId: user?.uid
                  })
                }
              );

              if (checkTodayResponse.ok) {
                const checkResult = await checkTodayResponse.json();
                console.log('[DashboardFormEmbed] Check today result:', checkResult);
                if (checkResult.submitted) {
                  // User has already submitted this form TODAY
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

    // Broadcast form submission event for real-time sync with attendance tracker
    if (dailyFormTemplateId) {
      window.dispatchEvent(new CustomEvent('formSubmitted', {
        detail: { formId: dailyFormTemplateId }
      }));
    }
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  // Show loading animation while fetching form data
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <DotLottieReact
              src="https://lottie.host/bb6fce6a-9e65-430d-8310-8138c178d463/XCPRVDtq3D.lottie"
              loop
              autoplay
              style={{ width: 200, height: 200 }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render anything if no access or no template
  if (!hasAccess || !template) {
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
        <CardContent className="pt-6">
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
                  Thank you for your submission! You can now clock out when ready.
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
      <CardContent className="pt-6">
        <div className="w-full">
          {/* Warning banner if user is clocked in and hasn't submitted */}
          {!isSubmitted && userIsClockedIn && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">
                    ⚠️ Form Submission Required
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    You must submit this form before you can clock out today. Please complete all required fields below.
                  </p>
                </div>
              </div>
            </div>
          )}

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
