'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { FormSettings, AccessControl } from '@/types/form.types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FormSettings;
  accessControl: AccessControl;
  onUpdate: (updates: any) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  accessControl,
  onUpdate,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [localAccessControl, setLocalAccessControl] = useState(accessControl);

  const handleSettingChange = (key: keyof FormSettings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdate(updated);
  };

  const handleAccessControlChange = (key: string, value: any) => {
    const updated = { ...localAccessControl, [key]: value };
    setLocalAccessControl(updated);
    onUpdate({ accessControl: updated });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-xl overflow-y-auto z-[101]">
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between z-[102]">
          <h2 className="text-lg font-semibold text-gray-900">Form settings</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Submit Button Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submit button text
            </label>
            <input
              type="text"
              value={localSettings.submitButtonText}
              onChange={(e) => handleSettingChange('submitButtonText', e.target.value)}
              className="
                w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                text-sm
              "
              placeholder="Submit"
            />
          </div>

          {/* Success Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Success message
            </label>
            <textarea
              value={localSettings.successMessage}
              onChange={(e) => handleSettingChange('successMessage', e.target.value)}
              className="
                w-full px-3 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                text-sm resize-none
              "
              placeholder="Thank you for your response"
              rows={3}
            />
          </div>

          {/* Allow Multiple Submissions */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="allowMultiple"
              checked={localSettings.allowMultipleSubmissions}
              onChange={(e) => handleSettingChange('allowMultipleSubmissions', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="allowMultiple" className="text-sm font-medium text-gray-700">
              Allow multiple submissions
            </label>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Access Control */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Access control</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who can access this form?
                </label>
                <select
                  value={localAccessControl.type}
                  onChange={(e) => handleAccessControlChange('type', e.target.value)}
                  className="
                    w-full px-3 py-2 border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    text-sm
                  "
                >
                  <option value="public">Public</option>
                  <option value="authenticated">Authenticated users only</option>
                  <option value="restricted">Restricted (specific users/roles)</option>
                </select>
              </div>

              {localAccessControl.type === 'restricted' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed roles (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={(localAccessControl.allowedRoles || []).join(', ')}
                      onChange={(e) =>
                        handleAccessControlChange(
                          'allowedRoles',
                          e.target.value ? e.target.value.split(',').map(r => r.trim()) : []
                        )
                      }
                      className="
                        w-full px-3 py-2 border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        text-sm
                      "
                      placeholder="admin, manager, employee"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed user IDs (comma-separated)
                    </label>
                    <textarea
                      value={(localAccessControl.allowedUserIds || []).join(', ')}
                      onChange={(e) =>
                        handleAccessControlChange(
                          'allowedUserIds',
                          e.target.value ? e.target.value.split(',').map(id => id.trim()) : []
                        )
                      }
                      className="
                        w-full px-3 py-2 border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                        text-sm resize-none
                      "
                      placeholder="user1@example.com, user2@example.com"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
