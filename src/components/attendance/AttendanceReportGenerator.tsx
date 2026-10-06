'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReportConfig } from '@/types/attendance.types';
import { FileText, Download } from 'lucide-react';

interface AttendanceReportGeneratorProps {
  onGenerate: (config: ReportConfig) => Promise<void>;
  loading: boolean;
}

export function AttendanceReportGenerator({
  onGenerate,
  loading,
}: AttendanceReportGeneratorProps) {
  const { register, handleSubmit } = useForm<Partial<ReportConfig>>({
    defaultValues: {
      reportType: 'monthly',
      format: 'pdf',
      includeCharts: true,
    },
  });

  const onSubmit = async (data: Partial<ReportConfig>) => {
    const config: ReportConfig = {
      reportType: data.reportType || 'monthly',
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(),
      filters: {},
      format: data.format || 'pdf',
      includeCharts: data.includeCharts ?? true,
    };
    await onGenerate(config);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Generate Report</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="reportType">Report Type</Label>
          <select
            id="reportType"
            {...register('reportType')}
            className="w-full mt-1 rounded-md border border-stroke bg-white px-3 py-2 text-dark dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="daily">Daily Attendance</option>
            <option value="weekly">Weekly Timesheet</option>
            <option value="monthly">Monthly Summary</option>
            <option value="leave-summary">Leave Summary</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate', { valueAsDate: true })}
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              {...register('endDate', { valueAsDate: true })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="format">Format</Label>
          <select
            id="format"
            {...register('format')}
            className="w-full mt-1 rounded-md border border-stroke bg-white px-3 py-2 text-dark dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeCharts"
            {...register('includeCharts')}
            className="rounded"
          />
          <Label htmlFor="includeCharts" className="cursor-pointer">
            Include charts and visualizations
          </Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full text-white">
          <Download className="mr-2 h-4 w-4" />
          {loading ? 'Generating…' : 'Generate Report'}
        </Button>
      </form>
    </Card>
  );
}
