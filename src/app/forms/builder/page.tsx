'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';
import { FormPreview } from '@/components/forms/builder/FormPreview';

export default function FormBuilderListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await authenticatedFetch(`/api/forms/templates?${params}`);
      const result = await response.json();

      if (response.ok) {
        setTemplates(result.templates);
      } else {
        toast.error(result.error || 'Failed to load forms');
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/forms/builder/new');
  };

  const handleEdit = (id: string) => {
    router.push(`/forms/builder/${id}`);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/forms/templates/${id}/duplicate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Form duplicated successfully');
        fetchTemplates();
      } else {
        toast.error(result.error || 'Failed to duplicate form');
      }
    } catch (error) {
      toast.error('Failed to duplicate form');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await authenticatedFetch(`/api/forms/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Form deleted successfully');
        fetchTemplates();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to delete form');
      }
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/forms/templates/${id}/publish`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Form published successfully');
        fetchTemplates();
      } else {
        toast.error(result.error || 'Failed to publish form');
      }
    } catch (error) {
      toast.error('Failed to publish form');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Draft' },
      published: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'Published' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: 'Archived' },
    };

    const style = styles[status as keyof typeof styles] || styles.draft;

    return (
      <div
        className={`px-2.5 py-1 text-xs font-medium rounded border ${style.bg} ${style.text} ${style.border}`}
      >
        {style.label}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-20 h-20 mx-auto mb-4 bg-indigo-600 rounded-xl flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.div>
          <p className="text-lg font-medium text-gray-700">
            Loading forms...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Form Builder</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 hidden sm:block">Create and manage custom forms</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateNew}
              className="px-3 py-2 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center space-x-1.5 sm:space-x-2 text-sm sm:text-base whitespace-nowrap"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden xs:inline">Create New Form</span>
              <span className="xs:hidden">Create</span>
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex space-x-2 mt-4 sm:mt-6 overflow-x-auto pb-1">
            {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  filter === status
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {templates.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12 sm:py-20 bg-white rounded-xl border border-gray-200 shadow-sm"
            >
              <motion.div
                className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl mx-auto mb-4 sm:mb-6 flex items-center justify-center border border-gray-300"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </motion.div>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                No forms found
              </p>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
                Start building your first form
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateNew}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all inline-flex items-center space-x-1.5 sm:space-x-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create First Form</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                onClick={() => handleEdit(template.id)}
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-1 flex-1 pr-2">
                      {template.title}
                    </h3>
                    {getStatusBadge(template.status)}
                  </div>
                  {template.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {template.fields.length}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Fields
                      </div>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {template.submissionCount}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Submissions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 bg-white border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(template.id);
                      }}
                      className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </motion.button>
                    {template.status === 'draft' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublish(template.id);
                        }}
                        className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Publish</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(template.id);
                        }}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplate(template);
                      }}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors flex items-center justify-center space-x-1"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id, template.title);
                      }}
                      className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-md transition-colors flex items-center justify-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <FormPreview
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
