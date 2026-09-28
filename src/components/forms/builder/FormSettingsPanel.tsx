'use client';

import React from 'react';
import type { FormSettings, AccessControl, UserRole } from '@/types/form.types';

interface FormSettingsPanelProps {
  settings: FormSettings;
  accessControl: AccessControl;
  onUpdateSettings: (settings: FormSettings) => void;
  onUpdateAccessControl: (accessControl: AccessControl) => void;
}

export function FormSettingsPanel({
  settings,
  accessControl,
  onUpdateSettings,
  onUpdateAccessControl,
}: FormSettingsPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Form Settings</h3>

      {/* Submit Button Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Submit Button Text
        </label>
        <input
          type="text"
          value={settings.submitButtonText}
          onChange={(e) =>
            onUpdateSettings({ ...settings, submitButtonText: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
          placeholder="Submit"
        />
      </div>

      {/* Success Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Success Message
        </label>
        <textarea
          value={settings.successMessage}
          onChange={(e) =>
            onUpdateSettings({ ...settings, successMessage: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
          placeholder="Thank you for your submission!"
        />
      </div>

      {/* Allow Multiple Submissions */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="allowMultiple"
          checked={settings.allowMultipleSubmissions}
          onChange={(e) =>
            onUpdateSettings({
              ...settings,
              allowMultipleSubmissions: e.target.checked,
            })
          }
          className="w-4 h-4 text-blue-600 rounded focus:ring-ring"
        />
        <label htmlFor="allowMultiple" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Allow multiple submissions per user
        </label>
      </div>

      {/* Access Control */}
      <div className="pt-6 border-t">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Access Control</h4>

        <div className="space-y-4">
          {/* Access Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Who can submit this form?
            </label>
            <select
              value={accessControl.type}
              onChange={(e) =>
                onUpdateAccessControl({
                  ...accessControl,
                  type: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
            >
              <option value="public">Anyone (Public)</option>
              <option value="authenticated">Any logged-in user</option>
              <option value="restricted">Specific users/roles only</option>
            </select>
          </div>

          {/* Restricted Access Options */}
          {accessControl.type === 'restricted' && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-500">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allowed Roles
                </label>
                <div className="space-y-2">
                  {(['admin', 'manager', 'employee'] as UserRole[]).map((role) => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={accessControl.allowedRoles?.includes(role) || false}
                        onChange={(e) => {
                          const roles = accessControl.allowedRoles || [];
                          if (e.target.checked) {
                            onUpdateAccessControl({
                              ...accessControl,
                              allowedRoles: [...roles, role],
                            });
                          } else {
                            onUpdateAccessControl({
                              ...accessControl,
                              allowedRoles: roles.filter((r) => r !== role),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-ring"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allowed User IDs
                </label>
                <textarea
                  value={accessControl.allowedUserIds?.join('\n') || ''}
                  onChange={(e) =>
                    onUpdateAccessControl({
                      ...accessControl,
                      allowedUserIds: e.target.value
                        .split('\n')
                        .map((id) => id.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-sm"
                  placeholder="Enter user IDs (one per line)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  One user ID per line
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
