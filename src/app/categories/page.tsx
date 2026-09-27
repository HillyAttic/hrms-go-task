'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useCategories } from '@/hooks/use-categories';
import { Category, CreateCategoryInput } from '@/types/category.types';
import { CategoryList, CategoryModal, CategorySkeleton } from '@/components/categories';
import { toast } from 'react-toastify';

export default function CategoriesPage() {
  const {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
  } = useCategories();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && category.isActive) ||
        (filterStatus === 'inactive' && !category.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [categories, searchQuery, filterStatus]);

  const handleOpenModal = (category?: Category) => {
    setSelectedCategory(category || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (data: CreateCategoryInput) => {
    try {
      setIsSubmitting(true);
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, data);
        toast.success('Category updated successfully!');
      } else {
        await createCategory(data);
        toast.success('Category created successfully!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCategory(id);
      toast.success('Category deleted successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleCategoryStatus(id, isActive);
      toast.success(`Category ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category status');
    }
  };

  if (error) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </>
    );
  }

  // Show seed button if no categories exist and not loading
  const showSeedButton = !loading && categories.length === 0;

  const handleSeedCategories = async () => {
    try {
      const response = await fetch('/api/categories/seed', {
        method: 'POST',
      });
      const result = await response.json();

      if (response.ok) {
        toast.success(`${result.message}`);
        // Refresh the page to show the new categories
        window.location.reload();
      } else {
        toast.error('Failed to seed categories');
      }
    } catch (error) {
      toast.error('Failed to seed categories');
    }
  };

  return (
    <>
      {/* Mobile Error Message */}
      <div className="block md:hidden flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg inline-block mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Desktop Only View</h2>
        <p className="text-muted-foreground text-sm">
          The Categories page is restricted and cannot be accessed on mobile devices. Please use a desktop or tablet device to view this page.
        </p>
      </div>

      <div className="space-y-4 max-w-[1600px] mx-auto hidden md:block">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Categories</h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'} • {categories.filter((c) => c.isActive).length} active
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="w-full lg:w-auto text-white shrink-0 h-9">
            <PlusCircleIcon className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search categories by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
                className="flex-1 lg:flex-none h-9"
              >
                <span className="hidden sm:inline">All</span>
                <span className="sm:hidden">All ({categories.length})</span>
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('active')}
                size="sm"
                className="flex-1 lg:flex-none h-9"
              >
                <span className="hidden sm:inline">Active</span>
                <span className="sm:hidden">Active ({categories.filter((c) => c.isActive).length})</span>
              </Button>
              <Button
                variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('inactive')}
                size="sm"
                className="flex-1 lg:flex-none h-9"
              >
                <span className="hidden sm:inline">Inactive</span>
                <span className="sm:hidden">Inactive ({categories.filter((c) => !c.isActive).length})</span>
              </Button>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || filterStatus !== 'all') && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredCategories.length}</span> of <span className="font-semibold text-foreground">{categories.length}</span> categories
              </p>
            </div>
          )}
        </div>

        {/* Categories List */}
        {loading ? (
          <CategorySkeleton />
        ) : (
          <>
            <CategoryList
              categories={filteredCategories}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />

            {filteredCategories.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filterStatus !== 'all'
                    ? 'No categories match your search criteria.'
                    : 'No categories found.'}
                </p>
                {showSeedButton && (
                  <Button onClick={handleSeedCategories} variant="outline">
                    🌱 Seed Sample Categories
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Category Modal */}
        <CategoryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          category={selectedCategory}
          isLoading={isSubmitting}
        />
      </div>
    </>
  );
}