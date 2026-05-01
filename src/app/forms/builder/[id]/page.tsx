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
      label: `New ${type} field`,
      required: false,
      order: template.fields.length,
    };

    setTemplate({
      ...template,
      fields: [...template.fields, newField],
    });

    toast.success(`${type} field added`);
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

    // Check if dragging from palette to canvas
    if (active.data.current?.source === 'palette') {
      if (over.id === 'canvas-drop-zone' || over.data.current?.type === 'field') {
        const fieldType = active.data.current.type as FormFieldType;
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
      <div className="flex items-center justify-center min-h-screen bg-[#FFFEF5] grid-pattern">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-32 h-32 mx-auto mb-6 bg-[#FFE500] border-4 border-black brutal-border-yellow"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <div className="w-full h-full flex items-center justify-center text-6xl">
              ⚡
            </div>
          </motion.div>
          <p className="text-2xl font-black text-black uppercase" style={{ fontFamily: 'Syne, sans-serif' }}>
            LOADING...
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
      <div className="min-h-screen bg-[#FFFEF5] grid-pattern form-builder-neo">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#FFE500] border-b-4 border-black sticky top-0 z-20 noise-texture"
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-2xl">
                <input
                  type="text"
                  value={template.title}
                  onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                  className="text-4xl font-black text-black border-none focus:outline-none focus:ring-0 w-full bg-transparent placeholder-black/40 uppercase tracking-tight"
                  placeholder="FORM TITLE"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                />
                <input
                  type="text"
                  value={template.description || ''}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  className="text-sm text-black/70 border-none focus:outline-none focus:ring-0 w-full mt-2 bg-transparent placeholder-black/30 form-builder-mono"
                  placeholder="// Add description here..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={() => setShowPreview(true)}
                  className="px-5 py-3 text-black bg-white border-4 border-black font-bold uppercase text-sm brutal-hover transition-all form-builder-mono"
                >
                  👁 PREVIEW
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-[#FF6B00] text-white border-4 border-black font-black uppercase text-sm brutal-hover disabled:opacity-50 transition-all"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {saving ? '⏳ SAVING...' : '💾 SAVE'}
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={() => router.push('/forms/builder')}
                  className="px-5 py-3 text-black bg-white border-4 border-black font-bold uppercase text-sm brutal-hover transition-all form-builder-mono"
                >
                  ✕
                </motion.button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-6 py-3 text-sm font-black uppercase border-4 border-black transition-all brutal-hover ${
                  activeTab === 'fields'
                    ? 'bg-black text-[#FFE500]'
                    : 'bg-white text-black'
                }`}
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                📝 FIELDS
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 text-sm font-black uppercase border-4 border-black transition-all brutal-hover ${
                  activeTab === 'settings'
                    ? 'bg-black text-[#FFE500]'
                    : 'bg-white text-black'
                }`}
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                ⚙️ SETTINGS
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'fields' ? (
              <motion.div
                key="fields"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-6"
              >
                <div className="lg:col-span-3">
                  <FormBuilderCanvas
                    fields={template.fields}
                    onUpdateField={handleUpdateField}
                    onDeleteField={handleDeleteField}
                    onReorderFields={handleReorderFields}
                    onAddField={handleAddField}
                  />
                </div>
                <div className="lg:col-span-1">
                  <FieldPalette onAddField={handleAddField} />
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
          <div className="bg-[#FFE500] border-4 border-black shadow-2xl p-4 opacity-90 brutal-border">
            <div className="font-black text-black uppercase form-builder-neo">DRAGGING...</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
