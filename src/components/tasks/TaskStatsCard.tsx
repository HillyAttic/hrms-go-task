import React from 'react';
import { Task } from '@/types/task.types';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TaskStatsCardProps {
  tasks: Task[];
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function StatItem({ icon, label, value, color, bgColor }: StatItemProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:bg-gray-700 transition-colors">
      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${bgColor}`}>
        <div className={color}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/**
 * TaskStatsCard Component
 * Displays summary statistics for tasks including total, pending, completed, and overdue counts
 * Validates Requirements: 2.10
 */
export function TaskStatsCard({ tasks }: TaskStatsCardProps) {
  // Calculate statistics - Requirement 2.10
  const totalTasks = tasks.length;
  
  const pendingTasks = tasks.filter(
    task => task.status === 'pending' || task.status === 'in-progress'
  ).length;
  
  const completedTasks = tasks.filter(
    task => task.status === 'completed'
  ).length;
  
  const overdueTasks = tasks.filter(
    task => task.status !== 'completed' && new Date(task.dueDate) < new Date()
  ).length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Task Overview</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Summary of all task statuses</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Tasks */}
          <StatItem
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
            label="Total Tasks"
            value={totalTasks}
            color="text-white"
            bgColor="bg-foreground"
          />

          {/* Pending Tasks */}
          <StatItem
            icon={<ClockIcon className="w-6 h-6" />}
            label="Pending"
            value={pendingTasks}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />

          {/* Completed Tasks */}
          <StatItem
            icon={<CheckCircleIcon className="w-6 h-6" />}
            label="Completed"
            value={completedTasks}
            color="text-green-600"
            bgColor="bg-green-100"
          />

          {/* Overdue Tasks */}
          <StatItem
            icon={<ExclamationTriangleIcon className="w-6 h-6" />}
            label="Overdue"
            value={overdueTasks}
            color="text-red-600"
            bgColor="bg-red-100"
          />
        </div>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion Rate</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {Math.round((completedTasks / totalTasks) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
