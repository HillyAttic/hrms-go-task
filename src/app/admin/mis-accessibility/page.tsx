'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import UserMultiSelect, { User } from '@/components/mis/UserMultiSelect';

interface MISConfig {
  formUrl: string;
  formAssignedUsers: string[];
  sheetUrl: string;
  sheetAssignedUsers: string[];
  formResponseSheetId?: string;
  formResponseSheetGid?: string;
  formEmailColumnIndex?: number;
  formTimestampColumnIndex?: number;
  formRequiredForClockout?: boolean;
  googleSheetsApiKey?: string;
}

export default function MISAccessibilityPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuthEnhanced();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [formUrl, setFormUrl] = useState('');
  const [formAssignedUsers, setFormAssignedUsers] = useState<string[]>([]);

  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetAssignedUsers, setSheetAssignedUsers] = useState<string[]>([]);

  // New fields for daily form validation
  const [formResponseSheetId, setFormResponseSheetId] = useState('');
  const [formResponseSheetGid, setFormResponseSheetGid] = useState('');
  const [formEmailColumnIndex, setFormEmailColumnIndex] = useState(1);
  const [formTimestampColumnIndex, setFormTimestampColumnIndex] = useState(0);
  const [formRequiredForClockout, setFormRequiredForClockout] = useState(false);
  const [googleSheetsApiKey, setGoogleSheetsApiKey] = useState('');

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

      const [configRes, usersRes] = await Promise.all([
        authenticatedFetch('/api/mis-config'),
        authenticatedFetch('/api/admin/users'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.success && configData.data) {
          setFormUrl(configData.data.formUrl || '');
          setFormAssignedUsers(configData.data.formAssignedUsers || []);
          setSheetUrl(configData.data.sheetUrl || '');
          setSheetAssignedUsers(configData.data.sheetAssignedUsers || []);
          setFormResponseSheetId(configData.data.formResponseSheetId || '');
          setFormResponseSheetGid(configData.data.formResponseSheetGid || '');
          setFormEmailColumnIndex(configData.data.formEmailColumnIndex ?? 1);
          setFormTimestampColumnIndex(configData.data.formTimestampColumnIndex ?? 0);
          setFormRequiredForClockout(configData.data.formRequiredForClockout ?? false);
          setGoogleSheetsApiKey(configData.data.googleSheetsApiKey || '');
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async () => {
    try {
      setSaving(true);

      const response = await authenticatedFetch('/api/mis-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formUrl,
          formAssignedUsers,
          formResponseSheetId,
          formResponseSheetGid,
          formEmailColumnIndex,
          formTimestampColumnIndex,
          formRequiredForClockout,
          googleSheetsApiKey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Form configuration saved successfully');
      } else {
        toast.error(data.error || 'Failed to save form configuration');
      }
    } catch (error) {
      console.error('Error saving form config:', error);
      toast.error('Failed to save form configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSheet = async () => {
    try {
      setSaving(true);

      const response = await authenticatedFetch('/api/mis-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrl,
          sheetAssignedUsers,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Report configuration saved successfully');
      } else {
        toast.error(data.error || 'Failed to save report configuration');
      }
    } catch (error) {
      console.error('Error saving sheet config:', error);
      toast.error('Failed to save report configuration');
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
          Configure Google Forms and Sheets visibility for users
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Form to Share
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Form URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Paste the Google Form URL. It will be embedded on the dashboard for selected users.
                </p>
              </div>

              <UserMultiSelect
                users={users}
                selectedUserIds={formAssignedUsers}
                onSelectionChange={setFormAssignedUsers}
                label="Assign Users"
                placeholder="Search users by name or email..."
              />

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Daily Form Validation (Clock-Out Requirement)
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="formRequiredForClockout"
                      checked={formRequiredForClockout}
                      onChange={(e) => setFormRequiredForClockout(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="formRequiredForClockout" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Require daily form submission before clock-out
                    </label>
                  </div>

                  {formRequiredForClockout && (
                    <div className="space-y-4 pl-7 border-l-2 border-blue-500">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Google Sheets API Key
                        </label>
                        <input
                          type="text"
                          value={googleSheetsApiKey}
                          onChange={(e) => setGoogleSheetsApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          API key from Google Cloud Console (Firebase auto-created key works)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Form Response Sheet ID
                        </label>
                        <input
                          type="text"
                          value={formResponseSheetId}
                          onChange={(e) => setFormResponseSheetId(e.target.value)}
                          placeholder="1jpe4QATo5pUgYuDFrqBe_LydDLLNRoGUmzK8e31whjI"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Extract from URL: https://docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sheet Tab GID
                        </label>
                        <input
                          type="text"
                          value={formResponseSheetGid}
                          onChange={(e) => setFormResponseSheetGid(e.target.value)}
                          placeholder="1550384339"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Extract from URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=<strong>GID</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Timestamp Column Index
                          </label>
                          <input
                            type="number"
                            value={formTimestampColumnIndex}
                            onChange={(e) => setFormTimestampColumnIndex(parseInt(e.target.value))}
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Column A = 0, B = 1, etc. (Default: 0)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Column Index
                          </label>
                          <input
                            type="number"
                            value={formEmailColumnIndex}
                            onChange={(e) => setFormEmailColumnIndex(parseInt(e.target.value))}
                            min="0"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Column A = 0, B = 1, etc. (Default: 1)
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Note:</strong> When enabled, assigned users must submit the form daily before they can clock out.
                          The system checks if their email appears in the response sheet with today's timestamp.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveForm}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {saving ? 'Saving...' : 'Save Form Configuration'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Report to Show
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Sheet URL
                </label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Paste the Google Sheet URL. Selected users will see it in the MIS Tracker page.
                </p>
              </div>

              <UserMultiSelect
                users={users}
                selectedUserIds={sheetAssignedUsers}
                onSelectionChange={setSheetAssignedUsers}
                label="Assign Users"
                placeholder="Search users by name or email..."
              />

              <button
                onClick={handleSaveSheet}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {saving ? 'Saving...' : 'Save Report Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
