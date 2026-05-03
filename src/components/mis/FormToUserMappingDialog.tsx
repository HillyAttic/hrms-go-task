import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import { XMarkIcon, DocumentTextIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FormToUserMapping } from '@/services/mis-config.service';
import type { FormTemplate } from '@/types/form.types';

interface User {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

interface FormToUserMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mappings: FormToUserMapping[]) => void;
  initialMappings: FormToUserMapping[];
  availableForms: FormTemplate[];
  availableUsers: User[];
}

export function FormToUserMappingDialog({
  isOpen,
  onClose,
  onSave,
  initialMappings,
  availableForms,
  availableUsers,
}: FormToUserMappingDialogProps) {
  const [mappings, setMappings] = useState<FormToUserMapping[]>(initialMappings);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [requiredForClockout, setRequiredForClockout] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMappings(initialMappings);
      setSelectedFormId('');
      setPendingUserIds([]);
      setRequiredForClockout(false);
      setUserSearch('');
    }
  }, [isOpen, initialMappings]);

  // Reset pending selection when form changes
  useEffect(() => {
    setPendingUserIds([]);
    setUserSearch('');
    setRequiredForClockout(false);
  }, [selectedFormId]);

  // Get already-assigned user IDs for the selected form
  const getAssignedUserIds = () => {
    return mappings.find(m => m.formId === selectedFormId)?.assignedUserIds || [];
  };

  // Get filtered users (exclude already assigned, apply search)
  const getFilteredUsers = () => {
    const assignedIds = getAssignedUserIds();
    return availableUsers.filter(user => {
      if (assignedIds.includes(user.uid)) return false;
      if (userSearch) {
        const searchLower = userSearch.toLowerCase();
        return (
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  };

  const filteredUsers = getFilteredUsers();

  // Handle checkbox click
  const handleUserCheckbox = (userId: string) => {
    setPendingUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Select all currently filtered users
  const handleSelectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.uid);
    setPendingUserIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  // Deselect all pending
  const handleDeselectAll = () => {
    setPendingUserIds([]);
  };

  // Add pending users to the mapping
  const handleAddSelected = () => {
    if (!selectedFormId || pendingUserIds.length === 0) return;

    const selectedForm = availableForms.find(f => f.id === selectedFormId);
    if (!selectedForm) return;

    const existingMapping = mappings.find(m => m.formId === selectedFormId);
    if (existingMapping) {
      // Update existing mapping
      setMappings(mappings.map(m =>
        m.formId === selectedFormId
          ? {
              ...m,
              assignedUserIds: Array.from(new Set([...m.assignedUserIds, ...pendingUserIds])),
              requiredForClockout: requiredForClockout || m.requiredForClockout, // Keep true if already true
            }
          : m
      ));
    } else {
      // Create new mapping
      setMappings([
        ...mappings,
        {
          formId: selectedFormId,
          formTitle: selectedForm.title,
          assignedUserIds: pendingUserIds,
          requiredForClockout,
        },
      ]);
    }
    setPendingUserIds([]);
    setUserSearch('');
  };

  const handleRemoveUser = (formId: string, userId: string) => {
    setMappings(mappings.map(m => {
      if (m.formId === formId) {
        const newUserIds = m.assignedUserIds.filter(id => id !== userId);
        return { ...m, assignedUserIds: newUserIds };
      }
      return m;
    }).filter(m => m.assignedUserIds.length > 0));
  };

  const handleRemoveForm = (formId: string) => {
    setMappings(mappings.filter(m => m.formId !== formId));
  };

  const handleToggleClockoutRequirement = (formId: string) => {
    setMappings(mappings.map(m =>
      m.formId === formId
        ? { ...m, requiredForClockout: !m.requiredForClockout }
        : m
    ));
  };

  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  const getUserName = (userId: string) => {
    const user = availableUsers.find(u => u.uid === userId);
    return user?.displayName || user?.email || 'Unknown User';
  };

  const getFormTitle = (formId: string) => {
    return availableForms.find(f => f.id === formId)?.title || 'Unknown Form';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[1100px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Form to User Assignment</DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Assign forms to users. Each user will see only their assigned forms on the dashboard.
          </p>
        </div>

        {/* Two-column landscape body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* LEFT — Selection controls */}
          <div className="md:w-[45%] flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-5 space-y-4">
            {/* Form Selection */}
            <div>
              <Label htmlFor="form-select" className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="w-4 h-4" />
                Select Form
              </Label>
              <Select
                id="form-select"
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="w-full"
              >
                <option value="">Choose a form...</option>
                {availableForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </Select>
            </div>

            {/* User Multi-Select */}
            {selectedFormId ? (
              <div className="flex flex-col flex-1 min-h-0">
                <Label className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4" />
                  Select Users
                  {pendingUserIds.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {pendingUserIds.length} selected
                    </span>
                  )}
                </Label>

                {/* Search Input */}
                <div className="relative mb-2">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 h-9 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* Bulk action row */}
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} shown
                    {userSearch && ' (filtered)'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      disabled={filteredUsers.length === 0}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    {pendingUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Deselect All
                      </button>
                    )}
                  </div>
                </div>

                {/* User List */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-y-auto flex-1 min-h-[200px] max-h-[300px] bg-white dark:bg-gray-dark">
                  {filteredUsers.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-sm text-gray-500">
                      {userSearch ? 'No users match the search' : 'All users already assigned'}
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isChecked = pendingUserIds.includes(user.uid);
                      return (
                        <label
                          key={user.uid}
                          className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleUserCheckbox(user.uid)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
                              {user.displayName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                          </div>
                          <span className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 flex-shrink-0">
                            {user.role}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Clock-out Requirement Checkbox */}
                <div className="mt-3 flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <input
                    type="checkbox"
                    id="clockout-required"
                    checked={requiredForClockout}
                    onChange={(e) => setRequiredForClockout(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="clockout-required" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    Require this form submission before clock-out
                  </label>
                </div>

                {/* Add Button */}
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleAddSelected}
                    disabled={pendingUserIds.length === 0}
                    className="text-white"
                    size="sm"
                  >
                    Add {pendingUserIds.length > 0 ? `${pendingUserIds.length} ` : ''}User{pendingUserIds.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg py-10">
                Select a form to assign users
              </div>
            )}
          </div>

          {/* RIGHT — Current mappings */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5">
            <Label className="mb-3 block flex-shrink-0">
              Current Mappings
              <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                {mappings.length} form{mappings.length !== 1 ? 's' : ''}
              </span>
            </Label>

            <div className="flex-1 overflow-y-auto">
              {mappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg py-12">
                  <DocumentTextIcon className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">No form assignments yet</p>
                  <p className="text-xs mt-1">Assign users to a form to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.formId}
                      className="p-3 bg-white dark:bg-gray-dark border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <DocumentTextIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight truncate">
                              {mapping.formTitle}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {mapping.assignedUserIds.length} user{mapping.assignedUserIds.length !== 1 ? 's' : ''} assigned
                              </p>
                              <button
                                type="button"
                                onClick={() => handleToggleClockoutRequirement(mapping.formId)}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                                  mapping.requiredForClockout
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                                }`}
                                title="Toggle clock-out requirement"
                              >
                                {mapping.requiredForClockout ? '✓ Clock-out required' : 'Optional'}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveForm(mapping.formId)}
                          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                          title="Remove all users from this form"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {mapping.assignedUserIds.map((userId) => (
                          <div
                            key={userId}
                            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1"
                          >
                            <span className="text-xs text-gray-800 dark:text-gray-200 leading-none">
                              {getUserName(userId)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(mapping.formId, userId)}
                              className="text-red-400 hover:text-red-600 ml-0.5"
                              aria-label={`Remove ${getUserName(userId)}`}
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="text-white">
            Save Mappings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
