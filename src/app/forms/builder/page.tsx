'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

export default function FormBuilderListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

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
      draft: { bg: '#FFE500', text: '#000', emoji: '✏️' },
      published: { bg: '#00FF85', text: '#000', emoji: '✓' },
      archived: { bg: '#FF6B00', text: '#FFF', emoji: '📦' },
    };

    const style = styles[status as keyof typeof styles] || styles.draft;

    return (
      <div
        className="px-3 py-1.5 text-xs font-black uppercase border-4 border-black form-builder-neo inline-flex items-center space-x-1"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        <span>{style.emoji}</span>
        <span>{status}</span>
      </div>
    );
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
              📋
            </div>
          </motion.div>
          <p className="text-2xl font-black text-black uppercase form-builder-neo">
            LOADING FORMS...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEF5] grid-pattern p-6 form-builder-neo">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-5xl font-black text-black uppercase mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              FORM BUILDER
            </h1>
            <p className="text-black/60 font-bold form-builder-mono">// Create and manage your forms</p>
          </div>
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ y: 0 }}
            onClick={handleCreateNew}
            className="px-6 py-4 bg-[#FF6B00] text-white border-4 border-black font-black uppercase text-lg brutal-hover transition-all"
            style={{ fontFamily: 'Syne, sans-serif', boxShadow: '8px 8px 0 #000' }}
          >
            ➕ CREATE NEW
          </motion.button>
        </div>

        {/* Filters */}
        <div className="flex space-x-3">
          {(['all', 'draft', 'published', 'archived'] as const).map((status, index) => (
            <motion.button
              key={status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 text-sm font-black uppercase border-4 border-black transition-all ${
                filter === status
                  ? 'bg-black text-[#FFE500]'
                  : 'bg-white text-black brutal-hover'
              }`}
              style={{
                fontFamily: 'Syne, sans-serif',
                boxShadow: filter === status ? '4px 4px 0 #FFE500' : '4px 4px 0 #000'
              }}
            >
              {status === 'all' ? '📋 ' : status === 'draft' ? '✏️ ' : status === 'published' ? '✓ ' : '📦 '}
              {status.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Templates List */}
      <AnimatePresence mode="wait">
        {templates.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-20 bg-white border-4 border-black brutal-border-cyan"
          >
            <motion.div
              className="w-32 h-32 bg-[#00FFE5] border-4 border-black mx-auto mb-6"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-full h-full flex items-center justify-center text-6xl">
                📝
              </div>
            </motion.div>
            <p className="text-3xl font-black text-black mb-6 uppercase" style={{ fontFamily: 'Syne, sans-serif' }}>
              NO FORMS FOUND
            </p>
            <p className="text-black/60 font-bold form-builder-mono mb-8">
              // Start building your first form
            </p>
            <motion.button
              whileHover={{ y: -4 }}
              whileTap={{ y: 0 }}
              onClick={handleCreateNew}
              className="px-8 py-4 bg-[#FF6B00] text-white border-4 border-black font-black uppercase text-lg brutal-hover transition-all"
              style={{ fontFamily: 'Syne, sans-serif', boxShadow: '8px 8px 0 #000' }}
            >
              ➕ CREATE FIRST FORM
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {templates.map((template, index) => {
              const colors = ['#FFE500', '#FF6B00', '#FF006B', '#00FFE5', '#00FF85'];
              const accentColor = colors[index % colors.length];

              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, rotate: 1 }}
                  className="bg-white border-4 border-black p-6 transition-all cursor-pointer"
                  style={{ boxShadow: `8px 8px 0 ${accentColor}` }}
                  onClick={() => handleEdit(template.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-xl font-black text-black mb-2 uppercase line-clamp-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                        {template.title}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-black/70 line-clamp-2 font-bold form-builder-mono">
                          // {template.description}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(template.status)}
                  </div>

                  {/* Stats */}
                  <div className="mb-6 p-4 border-4 border-black diagonal-stripes">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-3xl font-black text-black" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {template.fields.length}
                        </div>
                        <div className="text-xs font-bold text-black/60 uppercase form-builder-mono">
                          FIELDS
                        </div>
                      </div>
                      <div className="w-px h-12 bg-black"></div>
                      <div className="text-center">
                        <div className="text-3xl font-black text-black" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {template.submissionCount}
                        </div>
                        <div className="text-xs font-bold text-black/60 uppercase form-builder-mono">
                          SUBMISSIONS
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(template.id);
                      }}
                      className="px-3 py-2 text-sm bg-black text-white border-4 border-black font-black uppercase transition-all form-builder-neo"
                    >
                      ✏️ EDIT
                    </motion.button>
                    {template.status === 'draft' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublish(template.id);
                        }}
                        className="px-3 py-2 text-sm bg-[#00FF85] text-black border-4 border-black font-black uppercase transition-all form-builder-neo"
                      >
                        ✓ PUBLISH
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(template.id);
                      }}
                      className="px-3 py-2 text-sm bg-[#00FFE5] text-black border-4 border-black font-black uppercase transition-all form-builder-neo"
                    >
                      📋 COPY
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id, template.title);
                      }}
                      className="px-3 py-2 text-sm bg-[#FF006B] text-white border-4 border-black font-black uppercase transition-all form-builder-neo"
                    >
                      🗑️ DELETE
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
