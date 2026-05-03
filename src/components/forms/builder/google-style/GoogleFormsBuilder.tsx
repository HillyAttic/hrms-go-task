'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'react-toastify';
import type { FormField, FormFieldType, FormTemplate } from '@/types/form.types';
import { useAutoSave } from '@/hooks/useAutoSave';
import { authenticatedFetch } from '@/lib/api-client';
import { FormTopBar } from './FormTopBar';
import { FormHeaderCard } from './FormHeaderCard';
import { QuestionCard } from './QuestionCard';
import { SectionCard } from './SectionCard';
import { AddQuestionButton } from './AddQuestionButton';
import { SettingsModal } from './SettingsModal';
import { ResponsesView } from './ResponsesView';

interface GoogleFormsBuilderProps {
  form: FormTemplate;
  onSave: (form: FormTemplate) => Promise<void>;
  onPublish?: (form: FormTemplate) => Promise<void>;
  onClose: () => void;
  onPreview: () => void;
}

type Tab = 'questions' | 'responses' | 'settings';

export function GoogleFormsBuilder({
  form,
  onSave,
  onPublish,
  onClose,
  onPreview,
}: GoogleFormsBuilderProps) {
  const [formData, setFormData] = useState<FormTemplate>(form);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('questions');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [responseCount, setResponseCount] = useState(0);

  // Auto-save with debouncing
  const { isSaving, lastSaved } = useAutoSave(
    formData,
    onSave,
    2000
  );

  // Fetch response count
  useEffect(() => {
    const fetchResponseCount = async () => {
      if (formData.id === 'new') return;

      try {
        const response = await authenticatedFetch(
          `/api/forms/templates/${formData.id}/responses?limit=1`
        );
        const result = await response.json();

        if (response.ok) {
          setResponseCount(result.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch response count:', error);
      }
    };

    fetchResponseCount();
  }, [formData.id, activeTab]);

  // Handle form title change
  const handleTitleChange = useCallback((title: string) => {
    setFormData(prev => ({ ...prev, title }));
  }, []);

  // Handle form description change
  const handleDescriptionChange = useCallback((description: string) => {
    setFormData(prev => ({ ...prev, description }));
  }, []);

  // Handle field update
  const handleUpdateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    }));
  }, []);

  // Handle field deletion
  const handleDeleteField = useCallback((fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
    }));
    setSelectedFieldId(null);
  }, []);

  // Handle field duplication
  const handleDuplicateField = useCallback((fieldId: string) => {
    const fieldIndex = formData.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    const fieldToDuplicate = formData.fields[fieldIndex];
    const newField: FormField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...(fieldToDuplicate.type === 'section' && {
        fields: fieldToDuplicate.fields?.map(f => ({
          ...f,
          id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })) || [],
      }),
    };

    setFormData(prev => {
      const newFields = [...prev.fields];
      newFields.splice(fieldIndex + 1, 0, newField);
      return { ...prev, fields: newFields };
    });
  }, [formData.fields]);

  // Handle nested field addition
  const handleAddNestedField = useCallback((sectionId: string, type: FormFieldType) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === sectionId && f.type === 'section') {
          const newNestedField: FormField = {
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            label: '',
            required: false,
            order: (f.fields?.length || 0),
            ...(type === 'file' && { fileConfig: { acceptedTypes: [], maxSize: 5242880, multiple: false } }),
          };
          return {
            ...f,
            fields: [...(f.fields || []), newNestedField],
          };
        }
        return f;
      }),
    }));
  }, []);

  // Handle nested field update
  const handleUpdateNestedField = useCallback((sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === sectionId && f.type === 'section') {
          return {
            ...f,
            fields: (f.fields || []).map(nf =>
              nf.id === fieldId ? { ...nf, ...updates } : nf
            ),
          };
        }
        return f;
      }),
    }));
  }, []);

  // Handle nested field deletion
  const handleDeleteNestedField = useCallback((sectionId: string, fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === sectionId && f.type === 'section') {
          return {
            ...f,
            fields: (f.fields || []).filter(nf => nf.id !== fieldId),
          };
        }
        return f;
      }),
    }));
    setSelectedFieldId(null);
  }, []);

  // Handle nested field duplication
  const handleDuplicateNestedField = useCallback((sectionId: string, fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === sectionId && f.type === 'section') {
          const nestedFields = f.fields || [];
          const fieldIndex = nestedFields.findIndex(nf => nf.id === fieldId);
          if (fieldIndex === -1) return f;

          const fieldToDuplicate = nestedFields[fieldIndex];
          const newField: FormField = {
            ...fieldToDuplicate,
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };

          const newNestedFields = [...nestedFields];
          newNestedFields.splice(fieldIndex + 1, 0, newField);

          return {
            ...f,
            fields: newNestedFields,
          };
        }
        return f;
      }),
    }));
  }, []);

  // Handle add field
  const handleAddField = useCallback((type: FormFieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: '',
      required: false,
      order: formData.fields.length,
      ...(type === 'section' && { fields: [], description: '' }),
      ...(type === 'file' && { fileConfig: { acceptedTypes: [], maxSize: 5242880, multiple: false } }),
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    setSelectedFieldId(newField.id);
    setShowAddMenu(false);
  }, [formData.fields.length]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setFormData(prev => {
      const oldIndex = prev.fields.findIndex(f => f.id === active.id);
      const newIndex = prev.fields.findIndex(f => f.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newFields = [...prev.fields];
      const [movedField] = newFields.splice(oldIndex, 1);
      newFields.splice(newIndex, 0, movedField);

      return { ...prev, fields: newFields };
    });
  }, []);

  const fieldIds = useMemo(() => formData.fields.map(f => f.id), [formData.fields]);

  const handlePublish = useCallback(async () => {
    if (!onPublish) return;

    if (!formData.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    if (formData.fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    try {
      setIsPublishing(true);
      const newStatus = formData.status === 'published' ? 'draft' : 'published';
      const updatedForm: FormTemplate = {
        ...formData,
        status: newStatus,
      };
      await onPublish(updatedForm);
      setFormData(updatedForm);
      toast.success(newStatus === 'published' ? 'Form published!' : 'Form unpublished');
    } catch (error) {
      toast.error('Failed to publish form');
    } finally {
      setIsPublishing(false);
    }
  }, [formData, onPublish]);

  return (
    <div className="min-h-screen bg-[#f0ebf8] flex flex-col">
      {/* Top Navigation */}
      <FormTopBar
        title={formData.title}
        isSaving={isSaving}
        lastSaved={lastSaved}
        isPublished={formData.status === 'published'}
        onSettingsClick={() => setShowSettings(true)}
        onPreviewClick={onPreview}
        onPublishClick={onPublish ? handlePublish : undefined}
        onClose={onClose}
      />

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-0">
            {(['questions', 'responses', 'settings'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#673ab7] text-[#673ab7]'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab === 'responses' ? `Responses (${responseCount})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        {activeTab === 'questions' && (
          <>
            {/* Form Header Card */}
            <FormHeaderCard
              title={formData.title}
              description={formData.description || ''}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
            />

            {/* Questions */}
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fieldIds}
                strategy={verticalListSortingStrategy}
              >
                {formData.fields.map((field, index) => (
                  field.type === 'section' ? (
                    <SectionCard
                      key={field.id}
                      field={field}
                      index={index}
                      isSelected={selectedFieldId === field.id}
                      onUpdate={(updates) => handleUpdateField(field.id, updates)}
                      onDelete={() => handleDeleteField(field.id)}
                      onDuplicate={() => handleDuplicateField(field.id)}
                      onFocus={() => setSelectedFieldId(field.id)}
                      onAddNestedField={handleAddNestedField}
                      onUpdateNestedField={handleUpdateNestedField}
                      onDeleteNestedField={handleDeleteNestedField}
                      onDuplicateNestedField={handleDuplicateNestedField}
                      selectedFieldId={selectedFieldId}
                      onSelectField={setSelectedFieldId}
                    />
                  ) : (
                    <QuestionCard
                      key={field.id}
                      field={field}
                      index={index}
                      isSelected={selectedFieldId === field.id}
                      onUpdate={(updates) => handleUpdateField(field.id, updates)}
                      onDelete={() => handleDeleteField(field.id)}
                      onDuplicate={() => handleDuplicateField(field.id)}
                      onFocus={() => setSelectedFieldId(field.id)}
                    />
                  )
                ))}
              </SortableContext>
            </DndContext>

            {/* Sticky Add Question Floating Toolbar */}
            <div className="sticky bottom-6 flex justify-center mt-8 z-50">
              <AddQuestionButton
                onAddField={handleAddField}
                onPreview={onPreview}
                showAddMenu={showAddMenu}
                onToggleAddMenu={() => setShowAddMenu(!showAddMenu)}
              />
            </div>
          </>
        )}

        {activeTab === 'responses' && (
          <ResponsesView
            formId={formData.id}
            formTitle={formData.title}
            fields={formData.fields}
          />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-6 space-y-6">
              {/* Submit Button Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submit button text
                </label>
                <input
                  type="text"
                  value={formData.settings.submitButtonText}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, submitButtonText: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Submit"
                />
              </div>

              {/* Success Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Success message
                </label>
                <textarea
                  value={formData.settings.successMessage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, successMessage: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                  placeholder="Thank you for your response"
                  rows={3}
                />
              </div>

              {/* Allow Multiple Submissions */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowMultiple"
                  checked={formData.settings.allowMultipleSubmissions}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, allowMultipleSubmissions: e.target.checked }
                  }))}
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
                      value={formData.accessControl.type}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        accessControl: { ...prev.accessControl, type: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    >
                      <option value="public">Public</option>
                      <option value="authenticated">Authenticated users only</option>
                      <option value="restricted">Restricted (specific users/roles)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={formData.settings}
        accessControl={formData.accessControl}
        onUpdate={(updates) => {
          setFormData(prev => ({
            ...prev,
            settings: { ...prev.settings, ...updates.settings },
            accessControl: updates.accessControl ? { ...prev.accessControl, ...updates.accessControl } : prev.accessControl,
          }));
        }}
      />
    </div>
  );
}
