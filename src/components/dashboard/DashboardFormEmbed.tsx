'use client';

import React, { useState, useEffect } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface AssignedFormInfo {
  formId: string;
  formTitle: string;
  requiredForClockout: boolean;
  template: FormTemplate | null;
  isSubmitted: boolean;
  loading: boolean;
}

export default function DashboardFormEmbed() {
  const { user } = useAuthEnhanced();
  const [assignedForms, setAssignedForms] = useState<AssignedFormInfo[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userIsClockedIn, setUserIsClockedIn] = useState(false);
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
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
      // Get MIS config to check access and get assigned forms
      const configResponse = await authenticatedFetch('/api/mis-config');
      const configData = await configResponse.json();

      if (!configResponse.ok || !configData.success) {
        console.error('Failed to load MIS config');
        setLoading(false);
        return;
      }

      const hasFormAccess = configData.data.hasFormAccess || false;
      const assignedFormsData = configData.data.assignedForms || [];

      setHasAccess(hasFormAccess);

      // If user has access and there are assigned forms, fetch each template
      if (hasFormAccess && assignedFormsData.length > 0) {
        const formPromises = assignedFormsData.map(async (form: any) => {
          try {
            const templateResponse = await authenticatedFetch(
              `/api/forms/templates/${form.formId}`
            );

            if (!templateResponse.ok) {
              return {
                formId: form.formId,
                formTitle: form.formTitle,
                requiredForClockout: form.requiredForClockout,
                template: null,
                isSubmitted: false,
                loading: false,
              };
            }

            const templateResult = await templateResponse.json();
            if (!templateResult.success || !templateResult.template) {
              return {
                formId: form.formId,
                formTitle: form.formTitle,
                requiredForClockout: form.requiredForClockout,
                template: null,
                isSubmitted: false,
                loading: false,
              };
            }

            const fetchedTemplate = templateResult.template;

            // Fix duplicate field IDs if they exist
            const seenIds = new Set<string>();
            const fixedFields = fetchedTemplate.fields.map((field: any) => {
              if (seenIds.has(field.id)) {
                return { ...field, id: `field_${Date.now()}_${fieldIdCounter.current++}` };
              }
              seenIds.add(field.id);
              return field;
            });

            const finalTemplate = { ...fetchedTemplate, fields: fixedFields };

            // Check if user has already submitted this form TODAY
            let isSubmitted = false;
            // Always check daily submission status (for both single and multiple submission modes)
            const checkTodayResponse = await authenticatedFetch(
              `/api/forms/submissions/check-today`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  formId: form.formId,
                  userId: user?.uid,
                }),
              }
            );

            if (checkTodayResponse.ok) {
              const checkResult = await checkTodayResponse.json();
              isSubmitted = checkResult.submitted || false;
            }

            return {
              formId: form.formId,
              formTitle: form.formTitle,
              requiredForClockout: form.requiredForClockout,
              template: finalTemplate,
              isSubmitted,
              loading: false,
            };
          } catch (error) {
            console.error(`Error fetching form ${form.formId}:`, error);
            return {
              formId: form.formId,
              formTitle: form.formTitle,
              requiredForClockout: form.requiredForClockout,
              template: null,
              isSubmitted: false,
              loading: false,
            };
          }
        });

        const forms = await Promise.all(formPromises);
        setAssignedForms(forms.filter(f => f.template !== null)); // Only show forms with valid templates

        // Auto-expand first unsubmitted form
        const firstUnsubmitted = forms.find(f => !f.isSubmitted && f.template !== null);
        if (firstUnsubmitted) {
          setExpandedFormId(firstUnsubmitted.formId);
        }
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (submissionId: string, formId: string) => {
    // Update the specific form's submission status
    setAssignedForms(prev =>
      prev.map(form =>
        form.formId === formId
          ? { ...form, isSubmitted: true }
          : form
      )
    );

    toast.success('Form submitted successfully!');

    // Broadcast form submission event for real-time sync with attendance tracker
    window.dispatchEvent(new CustomEvent('formSubmitted', {
      detail: { formId }
    }));
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const toggleForm = (formId: string) => {
    setExpandedFormId(prev => prev === formId ? null : formId);
  };

  // Calculate pending required forms
  const pendingRequiredForms = assignedForms.filter(
    f => f.requiredForClockout && !f.isSubmitted
  );

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

  // Don't render anything if no access or no forms
  if (!hasAccess || assignedForms.length === 0) {
    return null;
  }

  // Single form: render as before (backward compatible)
  if (assignedForms.length === 1) {
    const form = assignedForms[0];

    if (!form.template || form.template.status !== 'published') {
      return null;
    }

    // If form has been submitted today, show success message
    if (form.isSubmitted) {
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
                    {form.template.settings.allowMultipleSubmissions && (
                      <span className="block mt-1">
                        You can submit this form again tomorrow.
                      </span>
                    )}
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
            {!form.isSubmitted && userIsClockedIn && form.requiredForClockout && (
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
                      Form Submission Required
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                      You must submit this form before you can clock out today. Please complete all required fields below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <FormRenderer
              template={form.template}
              onSuccess={(submissionId) => handleSuccess(submissionId, form.formId)}
              onError={handleError}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multiple forms: render as accordion
  return (
    <Card className="col-span-full">
      <CardContent className="pt-6">
        <div className="w-full space-y-4">
          {/* Warning banner if any required form is not submitted */}
          {pendingRequiredForms.length > 0 && userIsClockedIn && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
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
                    Form Submission Required
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    You must submit the following form(s) before you can clock out today:
                  </p>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-300 mt-2 list-disc list-inside">
                    {pendingRequiredForms.map(form => (
                      <li key={form.formId}>{form.formTitle}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Accordion for multiple forms */}
          <div className="space-y-2">
            {assignedForms.map((form) => {
              const isExpanded = expandedFormId === form.formId;
              const isPublished = form.template?.status === 'published';

              if (!isPublished) return null;

              return (
                <div
                  key={form.formId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleForm(form.formId)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {form.formTitle}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {form.isSubmitted ? (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Submitted
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Pending
                            </span>
                          )}
                          {form.requiredForClockout && (
                            <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                              Required for clock-out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && form.template && (
                    <div className="p-4 bg-white dark:bg-gray-dark">
                      {form.isSubmitted ? (
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
                            Thank you for your submission!
                            {form.template.settings.allowMultipleSubmissions && (
                              <span className="block mt-1">
                                You can submit this form again tomorrow.
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <FormRenderer
                          template={form.template}
                          onSuccess={(submissionId) => handleSuccess(submissionId, form.formId)}
                          onError={handleError}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
