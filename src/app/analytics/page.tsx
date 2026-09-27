'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Task } from '@/types/task.types';
import { taskApi } from '@/services/task.api';

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const tasksData = await taskApi.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const todo = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, todo, overdue, completionRate };
  };

  const stats = getTaskStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-2">Track your productivity and team performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All tasks in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">Active tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ClockIcon className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-sm text-muted-foreground">{stats.completed} ({Math.round(stats.completed/stats.total*100 || 0)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.round(stats.completed/stats.total*100 || 0)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">In Progress</span>
                  <span className="text-sm text-muted-foreground">{stats.inProgress} ({Math.round(stats.inProgress/stats.total*100 || 0)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${Math.round(stats.inProgress/stats.total*100 || 0)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">To Do</span>
                  <span className="text-sm text-muted-foreground">{stats.todo} ({Math.round(stats.todo/stats.total*100 || 0)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${Math.round(stats.todo/stats.total*100 || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Updated {(task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt)).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    task.status === 'in-progress' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {task.status.replace('-', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}