'use client';

import { useState, useEffect } from 'react';
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
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {businesses.map((business) => (
          <div key={business.id} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => onSelectBusiness(business.id)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap ${
                selectedBusinessId === business.id
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  className="p-1 sm:p-1.5 rounded hover:bg-gray-100 dark:bg-gray-700 text-gray-600 hover:text-gray-900 dark:text-white transition-colors"
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
                    className="p-1 sm:p-1.5 rounded hover:bg-red-100 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors"
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
          className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap"
        >
          <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Add Business</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Add/Edit Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {editingBusiness ? 'Edit Business' : 'Add New Business'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Tech Startup, Consulting Firm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this business"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                >
                  {editingBusiness ? 'Update' : 'Add'} Business
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
