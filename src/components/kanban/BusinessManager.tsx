'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Business } from '@/types/kanban.types';
import { Button } from '@/components/ui/button';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useModal } from '@/contexts/modal-context';

interface BusinessManagerProps {
  businesses: Business[];
  selectedBusinessId: string | null;
  onSelectBusiness: (businessId: string) => void;
  onAddBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => void;
  onUpdateBusiness: (business: Business) => void;
  onDeleteBusiness: (businessId: string) => void;
}

const BUSINESS_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const FIELD =
  'w-full rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none shadow-[inset_2px_2px_5px_rgba(148,163,199,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45),inset_-2px_-2px_5px_rgba(255,255,255,0.03)]';

const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200';

export function BusinessManager({
  businesses,
  selectedBusinessId,
  onSelectBusiness,
  onAddBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
}: BusinessManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (showAddModal) openModal();
    else closeModal();
  }, [showAddModal, openModal, closeModal]);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: BUSINESS_COLORS[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    if (editingBusiness) {
      onUpdateBusiness({
        ...editingBusiness,
        ...formData,
      });
    } else {
      onAddBusiness(formData);
    }

    setFormData({ name: '', description: '', color: BUSINESS_COLORS[0] });
    setShowAddModal(false);
    setEditingBusiness(null);
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      description: business.description || '',
      color: business.color,
    });
    setShowAddModal(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', color: BUSINESS_COLORS[0] });
    setShowAddModal(false);
    setEditingBusiness(null);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Business Tabs */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
        {businesses.map((business) => (
          <div key={business.id} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => onSelectBusiness(business.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:px-4 sm:py-2 whitespace-nowrap ${
                selectedBusinessId === business.id
                  ? 'text-white shadow-[4px_4px_9px_rgba(15,23,42,0.25),-3px_-3px_8px_rgba(255,255,255,0.85)] dark:shadow-[4px_4px_9px_rgba(0,0,0,0.55),-3px_-3px_8px_rgba(255,255,255,0.05)]'
                  : 'border border-slate-200/70 bg-white/70 text-slate-600 shadow-[3px_3px_7px_rgba(148,163,199,0.4),-3px_-3px_7px_rgba(255,255,255,0.95)] backdrop-blur hover:bg-white/90 hover:text-slate-900 active:shadow-[inset_2px_2px_5px_rgba(148,163,199,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5),-3px_-3px_7px_rgba(255,255,255,0.04)] dark:hover:bg-white/10 dark:hover:text-white'
              }`}
              style={{
                backgroundColor: selectedBusinessId === business.id ? business.color : undefined,
              }}
            >
              {business.name}
            </button>

            {selectedBusinessId === business.id && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => handleEdit(business)}
                  className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:p-1.5"
                  title="Edit business"
                  aria-label="Edit business"
                >
                  <PencilIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {businesses.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${business.name}"? All tasks will be removed.`)) {
                        onDeleteBusiness(business.id);
                      }
                    }}
                    className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 sm:p-1.5"
                    title="Delete business"
                    aria-label="Delete business"
                  >
                    <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={() => setShowAddModal(true)}
          variant="outline"
          className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-sm text-slate-700 shadow-[3px_3px_7px_rgba(148,163,199,0.4),-3px_-3px_7px_rgba(255,255,255,0.95)] backdrop-blur transition hover:bg-white/90 hover:text-slate-900 active:shadow-[inset_2px_2px_5px_rgba(148,163,199,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5),-3px_-3px_7px_rgba(255,255,255,0.04)] dark:hover:bg-white/10 sm:gap-2 sm:px-4 sm:py-2"
        >
          <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Add Business</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Add/Edit Business Modal — portaled to body because the glass panel's
          backdrop-blur creates a containing block that traps fixed positioning */}
      {showAddModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
            onClick={handleCancel}
          >
            <div
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/70 bg-white/85 p-5 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {editingBusiness ? 'Edit Business' : 'Add New Business'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={LABEL}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={FIELD}
                    placeholder="e.g., Tech Startup, Consulting Firm"
                    required
                  />
                </div>

                <div>
                  <label className={LABEL}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={FIELD}
                    placeholder="Brief description of this business"
                    rows={3}
                  />
                </div>

                <div>
                  <label className={`${LABEL} mb-2`}>
                    Color Theme
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`h-8 w-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 sm:h-9 sm:w-9 ${
                          formData.color === color
                            ? 'scale-110 ring-2 ring-slate-900/60 ring-offset-2 ring-offset-white/80 dark:ring-white dark:ring-offset-[#0B1430]'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 sm:gap-3 sm:pt-4">
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 rounded-xl border-slate-200/80 bg-white/60 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
                  >
                    {editingBusiness ? 'Update' : 'Add'} Business
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
