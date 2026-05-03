'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import UserMultiSelect, { User } from '@/components/mis/UserMultiSelect';
import { FormToUserMappingDialog } from '@/components/mis/FormToUserMappingDialog';
import { FormToUserMapping } from '@/services/mis-config.service';
import type { FormTemplate } from '@/types/form.types';

interface MISConfig {
  formToUserMappings?: FormToUserMapping[];
  dailyFormTemplateId?: string;
  formAssignedUsers: string[];
  sheetAssignedUsers: string[];
  formRequiredForClockout?: boolean;
}

export default function MISAccessibilityPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuthEnhanced();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);

  const [formToUserMappings, setFormToUserMappings] = useState<FormToUserMapping[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [sheetAssignedUsers, setSheetAssignedUsers] = useState<string[]>([]);

  // Legacy fields (for backward compatibility)
  const [dailyFormTemplateId, setDailyFormTemplateId] = useState('');
  const [formAssignedUsers, setFormAssignedUsers] = useState<string[]>([]);
  const [formRequiredForClockout, setFormRequiredForClockout] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [configRes, usersRes, templatesRes] = await Promise.all([
        authenticatedFetch('/api/mis-config'),
        authenticatedFetch('/api/admin/users'),
        authenticatedFetch('/api/forms/templates?status=published'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.success && configData.data) {
          setFormToUserMappings(configData.data.formToUserMappings || []);
          setSheetAssignedUsers(configData.data.sheetAssignedUsers || []);
          // Legacy fields
          setDailyFormTemplateId(configData.data.dailyFormTemplateId || '');
          setFormAssignedUsers(configData.data.formAssignedUsers || []);
          setFormRequiredForClockout(configData.data.formRequiredForClockout ?? false);
        }
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setUsers(
            usersData.map((user: any) => ({
              uid: user.uid,
              displayName: user.displayName || user.name || user.email,
              email: user.email,
              role: user.role || 'employee',
            }))
          );
        }
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        if (templatesData.success && Array.isArray(templatesData.templates)) {
          setFormTemplates(templatesData.templates);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await authenticatedFetch('/api/mis-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formToUserMappings,
          sheetAssignedUsers,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('MIS configuration saved successfully');
        fetchData(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMappings = (mappings: FormToUserMapping[]) => {
    setFormToUserMappings(mappings);
  };

  // Calculate summary stats
  const totalForms = formToUserMappings.length;
  const totalUsers = new Set(formToUserMappings.flatMap(m => m.assignedUserIds)).size;
  const requiredForms = formToUserMappings.filter(m => m.requiredForClockout).length;

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">MIS Accessibility</h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
          Configure daily form and submission tracking for users
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          {/* Form Assignments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                  Form Assignments
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                  Assign different forms to different users
                </p>
              </div>
              <button
                onClick={() => setShowMappingDialog(true)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                Manage Assignments
              </button>
            </div>

            {/* Summary Card */}
            {formToUserMappings.length > 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      Current Configuration
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {totalForms} form{totalForms !== 1 ? 's' : ''} assigned to {totalUsers} user{totalUsers !== 1 ? 's' : ''}
                      {requiredForms > 0 && ` • ${requiredForms} required for clock-out`}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {formToUserMappings.map((mapping) => (
                    <div
                      key={mapping.formId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-2 sm:px-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-900 dark:text-white font-medium truncate">
                          {mapping.formTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-5 sm:ml-0">
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                          {mapping.assignedUserIds.length} user{mapping.assignedUserIds.length !== 1 ? 's' : ''}
                        </span>
                        {mapping.requiredForClockout && (
                          <span className="text-[9px] sm:text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            Clock-out required
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 sm:p-8 border border-dashed border-gray-300 dark:border-gray-700 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">No form assignments configured</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">
                  Click "Manage Assignments" to assign forms to users
                </p>
              </div>
            )}
          </div>

          {/* Submissions Access */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 md:mb-6">
              Submissions Access
            </h2>

            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <UserMultiSelect
                users={users}
                selectedUserIds={sheetAssignedUsers}
                onSelectionChange={setSheetAssignedUsers}
                label="Who can view submissions"
                placeholder="Search users by name or email..."
              />
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                These users will be able to view form submissions in the MIS Tracker
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Form to User Mapping Dialog */}
      <FormToUserMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        onSave={handleSaveMappings}
        initialMappings={formToUserMappings}
        availableForms={formTemplates}
        availableUsers={users.map(u => ({ ...u, role: u.role || 'employee' }))}
      />
    </div>
  );
}
