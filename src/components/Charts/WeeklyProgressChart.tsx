import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface WeeklyProgressChartProps {
  data: {
    labels: string[];
    created: number[];
    completed: number[];
  };
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  const maxValue = Math.max(...data.created, ...data.completed, 10);
  const totalCreated = data.created.reduce((a, b) => a + b, 0);
  const totalCompleted = data.completed.reduce((a, b) => a + b, 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Weekly Progress</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 px-3 py-1 bg-card rounded-full shadow-sm">
              {completionRate >= 50 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-orange-500" />
              )}
              <span className="font-semibold">{completionRate}%</span>
              <span className="text-muted-foreground">completion</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCreated}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCompleted}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Line Chart Style */}
          <div className="space-y-3">
            {data.labels.map((label, index) => {
              const created = data.created[index];
              const completed = data.completed[index];
              const total = created + completed;
              const createdPercent = total > 0 ? (created / maxValue) * 100 : 0;
              const completedPercent = total > 0 ? (completed / maxValue) * 100 : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground w-12">{label}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-blue-600 dark:text-blue-400">
                        <span className="font-semibold">{created}</span> created
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        <span className="font-semibold">{completed}</span> done
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 h-8">
                    {/* Created bar */}
                    <div className="flex-1 bg-muted rounded-lg overflow-hidden relative group">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg transition-all duration-500 ease-out group-hover:from-blue-500 group-hover:to-blue-700"
                        style={{ width: `${createdPercent}%`, minWidth: created > 0 ? '8px' : '0' }}
                      />
                    </div>
                    {/* Completed bar */}
                    <div className="flex-1 bg-muted rounded-lg overflow-hidden relative group">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-lg transition-all duration-500 ease-out group-hover:from-green-500 group-hover:to-green-700"
                        style={{ width: `${completedPercent}%`, minWidth: completed > 0 ? '8px' : '0' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <span className="text-sm font-medium text-muted-foreground">Tasks Created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-green-400 to-green-600"></div>
              <span className="text-sm font-medium text-muted-foreground">Tasks Completed</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
