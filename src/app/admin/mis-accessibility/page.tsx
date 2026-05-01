'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import UserMultiSelect, { User } from '@/components/mis/UserMultiSelect';

interface MISConfig {
  dailyFormTemplateId?: string;
  formAssignedUsers: string[];
  sheetAssignedUsers: string[];
  formRequiredForClockout?: boolean;
}

interface FormTemplate {
  id: string;
  title: string;
  status: string;
}

export default function MISAccessibilityPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuthEnhanced();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);

  const [dailyFormTemplateId, setDailyFormTemplateId] = useState('');
  const [formAssignedUsers, setFormAssignedUsers] = useState<string[]>([]);
  const [sheetAssignedUsers, setSheetAssignedUsers] = useState<string[]>([]);
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
          setDailyFormTemplateId(configData.data.dailyFormTemplateId || '');
          setFormAssignedUsers(configData.data.formAssignedUsers || []);
          setSheetAssignedUsers(configData.data.sheetAssignedUsers || []);
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
              role: user.role,
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
          dailyFormTemplateId,
          formAssignedUsers,
          sheetAssignedUsers,
          formRequiredForClockout,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('MIS configuration saved successfully');
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MIS Accessibility</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure daily form and submission tracking for users
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Daily Form Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Daily Form Configuration
            </h2>

            <div className="space-y-6">
              {/* Form Template Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Daily Form Template
                </label>
                <div className="flex space-x-3">
                  <select
                    value={dailyFormTemplateId}
                    onChange={(e) => setDailyFormTemplateId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a form template</option>
                    {formTemplates
                      .sort((a, b) => {
                        // Selected form comes first
                        if (a.id === dailyFormTemplateId) return -1;
                        if (b.id === dailyFormTemplateId) return 1;
                        // Otherwise sort alphabetically
                        return a.title.localeCompare(b.title);
                      })
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => router.push('/forms/builder/new')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    + Create New Form
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select a published form template for daily MIS submissions
                </p>
              </div>

              {/* Assigned Users */}
              <UserMultiSelect
                users={users}
                selectedUserIds={formAssignedUsers}
                onSelectionChange={setFormAssignedUsers}
                label="Assign Users (Who must submit)"
                placeholder="Search users by name or email..."
              />

              {/* Clock-out Requirement */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="formRequiredForClockout"
                    checked={formRequiredForClockout}
                    onChange={(e) => setFormRequiredForClockout(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="formRequiredForClockout"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Require daily form submission before clock-out
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 ml-7">
                  When enabled, assigned users must submit the daily form before they can clock out
                </p>
              </div>
            </div>
          </div>

          {/* Submissions Access */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Submissions Access
            </h2>

            <div className="space-y-6">
              <UserMultiSelect
                users={users}
                selectedUserIds={sheetAssignedUsers}
                onSelectionChange={setSheetAssignedUsers}
                label="Who can view submissions"
                placeholder="Search users by name or email..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                These users will be able to view form submissions in the MIS Tracker
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
