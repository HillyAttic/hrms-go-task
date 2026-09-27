import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function CategorySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
