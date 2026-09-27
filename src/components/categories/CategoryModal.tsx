import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, CreateCategoryInput } from '@/types/category.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
});

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryInput) => Promise<void>;
  category?: Category | null;
  isLoading?: boolean;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

export function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  isLoading = false,
}: CategoryModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3B82F6',
      icon: '',
      isActive: true,
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description || '',
        color: category.color,
        icon: category.icon || '',
        isActive: category.isActive,
      });
    } else {
      reset({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: '',
        isActive: true,
      });
    }
  }, [category, reset]);

  const handleFormSubmit = async (data: CreateCategoryInput) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting category:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Category Name */}
          <div>
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter category name"
              className="mt-1"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register('description')}
              placeholder="Enter category description (optional)"
              className="mt-1 w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <Label>Category Color *</Label>
            <div className="mt-2 space-y-3">
              {/* Preset Colors */}
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color
                        ? 'border-gray-900 scale-110'
                        : 'border-border hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  {...register('color')}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  {...register('color')}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            {errors.color && (
              <p className="text-sm text-red-600 mt-1">{errors.color.message}</p>
            )}
          </div>

          {/* Icon (Emoji) */}
          <div>
            <Label htmlFor="icon">Icon (Emoji)</Label>
            <Input
              id="icon"
              {...register('icon')}
              placeholder="📁 (optional)"
              maxLength={10}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add an emoji to represent this category
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="w-4 h-4 text-blue-600 border-border rounded focus:ring-ring"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (visible to users)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="text-white">
              {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
