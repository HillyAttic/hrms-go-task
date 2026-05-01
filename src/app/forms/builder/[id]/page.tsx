'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate, FormField, FormFieldType } from '@/types/form.types';
import { FormBuilderCanvas } from '@/components/forms/builder/FormBuilderCanvas';
import { FieldPalette } from '@/components/forms/builder/FieldPalette';
import { FormSettingsPanel } from '@/components/forms/builder/FormSettingsPanel';
import { FormPreview } from '@/components/forms/builder/FormPreview';
import { toast } from 'react-toastify';

export default function FormBuilderEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [formId, setFormId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings'>('fields');
  const [activeId, setActiveId] = useState<string | null>(null);
  const fieldIdCounter = React.useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setFormId(id);
      setIsNew(id === 'new');
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (formId === null) return;

    if (isNew) {
      setTemplate({
        id: 'new',
        title: 'Untitled Form',
        description: '',
        status: 'draft',
        fields: [],
        settings: {
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
          allowMultipleSubmissions: false,
        },
        accessControl: {
          type: 'authenticated',
        },
        submissionCount: 0,
        createdBy: '',
        createdAt: null as any,
        updatedAt: null as any,
      });
      setLoading(false);
    } else {
      fetchTemplate();
    }
  }, [formId, isNew]);

  const fetchTemplate = async () => {
    if (!formId) return;

    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/forms/templates/${formId}`);
      const result = await response.json();

      if (response.ok) {
        const template = result.template;
        const seenIds = new Set<string>();
        const fixedFields = template.fields.map((field: FormField) => {
          if (seenIds.has(field.id)) {
            return { ...field, id: `field_${Date.now()}_${fieldIdCounter.current++}` };
          }
          seenIds.add(field.id);
          return field;
        });

        setTemplate({ ...template, fields: fixedFields });
      } else {
        toast.error(result.error || 'Failed to load form');
        router.push('/forms/builder');
      }
    } catch (error) {
      toast.error('Failed to load form');
      router.push('/forms/builder');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template || !formId) return;

    if (!template.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    if (template.fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    try {
      setSaving(true);

      const url = isNew ? '/api/forms/templates' : `/api/forms/templates/${formId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          status: template.status,
          fields: template.fields,
          settings: template.settings,
          accessControl: template.accessControl,
          category: template.category,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Form saved successfully');
        if (isNew) {
          router.push(`/forms/builder/${result.template.id}`);
        } else {
          setTemplate(result.template);
        }
      } else {
        toast.error(result.error || 'Failed to save form');
      }
    } catch (error) {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = (type: FormFieldType) => {
    if (!template) return;

    const newField: FormField = {
      id: `field_${Date.now()}_${fieldIdCounter.current++}`,
      type,
      label: type === 'section' ? 'New Section' : `New ${type} field`,
      required: type === 'section' ? false : false,
      order: template.fields.length,
      fields: type === 'section' ? [] : undefined,
    };

    setTemplate({
      ...template,
      fields: [...template.fields, newField],
    });

    toast.success(type === 'section' ? 'Section added' : `${type} field added`);
  };

  const handleAddFieldToSection = (sectionId: string, fieldType: FormFieldType) => {
    if (!template) return;

    const newField: FormField = {
      id: `field_${Date.now()}_${fieldIdCounter.current++}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: false,
      order: 0,
      sectionId,
    };

    const updatedFields = template.fields.map((field) => {
      if (field.id === sectionId && field.type === 'section') {
        const sectionFields = field.fields || [];
        newField.order = sectionFields.length;
        return {
          ...field,
          fields: [...sectionFields, newField],
        };
      }
      return field;
    });

    setTemplate({
      ...template,
      fields: updatedFields,
    });

    toast.success(`${fieldType} field added to section`);
  };

  const handleUpdateField = (index: number, updatedField: FormField) => {
    if (!template) return;

    const fields = [...template.fields];
    fields[index] = updatedField;

    setTemplate({
      ...template,
      fields,
    });
  };

  const handleDeleteField = (index: number) => {
    if (!template) return;

    const fields = [...template.fields];
    fields.splice(index, 1);

    fields.forEach((field, i) => {
      field.order = i;
    });

    setTemplate({
      ...template,
      fields,
    });

    toast.success('Field deleted');
  };

  const handleReorderFields = (reorderedFields: FormField[]) => {
    if (!template) return;

    setTemplate({
      ...template,
      fields: reorderedFields,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !template) return;

    // Check if dragging from palette to section
    if (active.data.current?.source === 'palette') {
      const fieldType = active.data.current.type as FormFieldType;

      // Dropping into a section
      if (over.data.current?.type === 'section') {
        const sectionId = over.data.current.sectionId;
        handleAddFieldToSection(sectionId, fieldType);
        return;
      }

      // Dropping into canvas
      if (over.id === 'canvas-drop-zone' || over.data.current?.type === 'field') {
        handleAddField(fieldType);
      }
      return;
    }

    // Reordering existing fields within canvas
    if (active.data.current?.type === 'field' && over.data.current?.type === 'field') {
      if (active.id === over.id) return;

      const oldIndex = template.fields.findIndex((f) => f.id === active.id);
      const newIndex = template.fields.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedFields = [...template.fields];
        const [movedField] = reorderedFields.splice(oldIndex, 1);
        reorderedFields.splice(newIndex, 0, movedField);

        reorderedFields.forEach((field, index) => {
          field.order = index;
        });

        setTemplate({
          ...template,
          fields: reorderedFields,
        });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-20 h-20 mx-auto mb-4 bg-indigo-500 rounded-xl flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.div>
          <p className="text-lg font-medium text-gray-700">
            Loading form...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            {/* Title and Description */}
            <div className="mb-4">
              <input
                type="text"
                value={template.title}
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                className="text-2xl sm:text-3xl font-bold text-gray-900 border-none focus:outline-none focus:ring-0 w-full bg-transparent placeholder-gray-400"
                placeholder="Form Title"
              />
              <input
                type="text"
                value={template.description || ''}
                onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                className="text-sm text-gray-600 border-none focus:outline-none focus:ring-0 w-full mt-2 bg-transparent placeholder-gray-400"
                placeholder="Add description here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPreview(true)}
                className="flex-1 sm:flex-none px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm rounded-lg transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Preview</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/forms/builder')}
                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('fields')}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'fields'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Fields</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'settings'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'fields' ? (
              <motion.div
                key="fields"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Mobile: Palette at top, Desktop: Palette on side */}
                <div className="lg:hidden">
                  <FieldPalette onAddField={handleAddField} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                  <div className="lg:col-span-3">
                    <FormBuilderCanvas
                      fields={template.fields}
                      onUpdateField={handleUpdateField}
                      onDeleteField={handleDeleteField}
                      onReorderFields={handleReorderFields}
                      onAddField={handleAddField}
                      onAddFieldToSection={handleAddFieldToSection}
                    />
                  </div>
                  <div className="hidden lg:block lg:col-span-1">
                    <FieldPalette onAddField={handleAddField} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto"
              >
                <FormSettingsPanel
                  settings={template.settings}
                  accessControl={template.accessControl}
                  onUpdateSettings={(settings) => setTemplate({ ...template, settings })}
                  onUpdateAccessControl={(accessControl) =>
                    setTemplate({ ...template, accessControl })
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <FormPreview template={template} onClose={() => setShowPreview(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-white border border-gray-300 shadow-lg rounded-lg p-4 opacity-90">
            <div className="font-medium text-gray-900">Dragging...</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
