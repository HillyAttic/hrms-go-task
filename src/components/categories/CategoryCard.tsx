import React from 'react';
import { Category } from '@/types/category.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PencilSquareIcon, TrashIcon, TagIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export function CategoryCard({ category, onEdit, onDelete, onToggleStatus }: CategoryCardProps) {
  return (
    <Card className="group hover:shadow-hard transition-all duration-200 border-l-4 aspect-square" style={{ borderLeftColor: category.color }}>
      <CardContent className="p-2 h-full flex flex-col">
        {/* Icon and Status */}
        <div className="flex items-start justify-between mb-1.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${category.color}20` }}
          >
            {category.icon ? (
              <span className="text-lg">{category.icon}</span>
            ) : (
              <TagIcon className="w-4 h-4" style={{ color: category.color }} />
            )}
          </div>
          
          {category.isActive && (
            <MapPinIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
          )}
        </div>

        {/* Category Name */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <h3 className="text-xs font-bold text-foreground line-clamp-2 text-center leading-tight">
            {category.name}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(category)}
            className="flex-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 h-6 text-[10px] px-0 min-w-0"
          >
            <PencilSquareIcon className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(category.id)}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 h-6 px-1 min-w-0"
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
