import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TaskDistributionChartProps {
  completed: number;
  inProgress: number;
  todo: number;
  total: number;
}

export function TaskDistributionChart({
  completed,
  inProgress,
  todo,
  total
}: TaskDistributionChartProps) {
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const todoPercent = total > 0 ? (todo / total) * 100 : 0;

  // Calculate pie chart segments
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  const completedDash = (completedPercent / 100) * circumference;
  const inProgressDash = (inProgressPercent / 100) * circumference;
  const todoDash = (todoPercent / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center">
          {/* Pie Chart */}
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Completed segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth="15"
                strokeDasharray={`${completedDash} ${circumference}`}
                strokeDashoffset="0"
              />
              {/* In Progress segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="15"
                strokeDasharray={`${inProgressDash} ${circumference}`}
                strokeDashoffset={`-${completedDash}`}
              />
              {/* Todo segment */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#ef4444"
                strokeWidth="15"
                strokeDasharray={`${todoDash} ${circumference}`}
                strokeDashoffset={`-${completedDash + inProgressDash}`}
              />
            </svg>
            
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-700">Completed</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {completed} ({Math.round(completedPercent)}%)
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium text-gray-700">In Progress</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {inProgress} ({Math.round(inProgressPercent)}%)
              </span>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-red-50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-gray-700">To Do</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {todo} ({Math.round(todoPercent)}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
