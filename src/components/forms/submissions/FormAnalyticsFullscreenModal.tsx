'use client';

import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import type { BranchReportData } from './SubmissionAnalyticsStats';
import { useModal } from '@/contexts/modal-context';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DashboardQuestionChart {
  fieldId: string;
  label: string;
  type: string;
  chartType: 'pie' | 'bar';
  data: Array<{ label: string; count: number; pct: number }>;
  totalAnswered: number;
}

interface FormAnalyticsFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  month: string;
  businessUnit: string;
  questionCharts: DashboardQuestionChart[];
  loading?: boolean;
}

function monthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) return month;
  return new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function getChartOptions(question: DashboardQuestionChart): ApexOptions {
  if (question.chartType === 'pie') {
    return {
      chart: { type: 'donut', fontFamily: 'inherit' },
      labels: question.data.map((d) => d.label),
      legend: { position: 'bottom' },
      dataLabels: { enabled: true },
      stroke: { width: 1 },
      tooltip: {
        y: {
          formatter: (value: number) => `${value}`,
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
          },
        },
      },
    };
  }

  return {
    chart: {
      type: 'bar',
      fontFamily: 'inherit',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '50%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: question.data.map((d) => d.label),
      labels: {
        rotate: -30,
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => String(Math.round(val)),
      },
    },
    grid: {
      strokeDashArray: 4,
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value}`,
      },
    },
  };
}

function getDaywiseGroupVisitsOptions(data: Array<{ date: string; total: number }>): ApexOptions {
  return {
    chart: {
      type: 'bar',
      fontFamily: 'inherit',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '45%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data.map((item) => item.date),
      title: { text: 'Dates' },
      labels: { rotate: -30 },
    },
    yaxis: {
      title: { text: 'Group visits' },
      labels: { formatter: (value: number) => String(Math.round(value)) },
    },
    grid: { strokeDashArray: 4 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} group visits`,
      },
    },
  };
}

interface BranchReportFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  data: BranchReportData | null;
  loading?: boolean;
  preset: 'week' | 'month';
  onPresetChange: (preset: 'week' | 'month') => void;
}

export function BranchReportFullscreenModal({
  isOpen,
  onClose,
  formTitle,
  data,
  loading = false,
  preset,
  onPresetChange,
}: BranchReportFullscreenModalProps) {
  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (isOpen) openModal();
    else closeModal();
  }, [isOpen, openModal, closeModal]);

  const chartData = data?.daywiseGroupVisits || [];
  const options = getDaywiseGroupVisitsOptions(chartData);
  const series = [{ name: 'Group Visits', data: chartData.map((item) => item.total) }];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-2 sm:inset-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 focus:outline-none flex flex-col">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                BU-wise Collective Report
              </Dialog.Title>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formTitle} • Daywise group visits
              </p>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
            {(['week', 'month'] as const).map((item) => (
              <button
                key={item}
                onClick={() => onPresetChange(item)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  preset === item
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No group visit data available for selected filter.
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800">
                <div className="mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    Daywise Visit Dashboard
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    X-axis: dates • Y-axis: collective group visits
                  </p>
                </div>
                <Chart options={options} series={series} type="bar" height={420} />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FormAnalyticsFullscreenModal({
  isOpen,
  onClose,
  formTitle,
  month,
  businessUnit,
  questionCharts,
  loading = false,
}: FormAnalyticsFullscreenModalProps) {
  const { openModal: openModal2, closeModal: closeModal2 } = useModal();
  useEffect(() => {
    if (isOpen) openModal2();
    else closeModal2();
  }, [isOpen, openModal2, closeModal2]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-2 sm:inset-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 focus:outline-none flex flex-col">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Form Analytics Report
              </Dialog.Title>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formTitle} • {monthLabel(month)} • {businessUnit === 'all' ? 'All Business Units' : businessUnit}
              </p>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : questionCharts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No chart data available for selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {questionCharts.map((question) => {
                  const options = getChartOptions(question);
                  const series =
                    question.chartType === 'pie'
                      ? question.data.map((d) => d.count)
                      : [{ name: 'Responses', data: question.data.map((d) => d.count) }];

                  return (
                    <div
                      key={question.fieldId}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="mb-3">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          {question.label}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {question.type} • {question.totalAnswered} answered
                        </p>
                      </div>

                      <Chart
                        options={options}
                        series={series as any}
                        type={question.chartType === 'pie' ? 'donut' : 'bar'}
                        height={320}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
