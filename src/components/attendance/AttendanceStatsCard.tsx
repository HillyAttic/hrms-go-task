'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { AttendanceStats } from '@/types/attendance.types';
import { Clock, TrendingUp, Calendar, Award } from 'lucide-react';

interface AttendanceStatsCardProps {
  stats: AttendanceStats | null;
  loading?: boolean;
  error?: string;
}

export function AttendanceStatsCard({ stats, loading, error }: AttendanceStatsCardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">No attendance data available</span>
        </div>
      </Card>
    );
  }

  const statItems = [
    {
      label: 'Total Hours',
      value: `${stats.totalHours.toFixed(1)}h`,
      icon: Clock,
      color: 'text-blue-600',
    },
    {
      label: 'Average Hours',
      value: `${stats.averageHours.toFixed(1)}h`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Attendance Rate',
      value: `${stats.attendanceRate.toFixed(0)}%`,
      icon: Calendar,
      color: 'text-purple-600',
    },
    {
      label: 'Punctuality',
      value: `${stats.punctualityRate.toFixed(0)}%`,
      icon: Award,
      color: 'text-orange-600',
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Attendance Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="text-center">
            <div className="flex justify-center mb-2">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      {stats.overtimeHours > 0 && (
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overtime: <span className="font-semibold text-orange-600">{stats.overtimeHours.toFixed(1)}h</span>
          </p>
        </div>
      )}
    </Card>
  );
}
