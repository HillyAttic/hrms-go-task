import React from 'react';
import { Project } from '@/services/project.service';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import {
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface ProjectListViewProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: any) => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function ProjectListView({
  projects,
  onEdit,
  onDelete,
  selectedIds = new Set(),
  onToggleSelection,
  onToggleSelectAll,
}: ProjectListViewProps) {
  const allSelected = projects.length > 0 && projects.every((p) => selectedIds.has(p.id!));
  const someSelected = projects.some((p) => selectedIds.has(p.id!)) && !allSelected;

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-10 sticky left-0 bg-gray-50 dark:bg-gray-800">
              {onToggleSelectAll && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all projects"
                />
              )}
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-10 bg-gray-50 dark:bg-gray-800" style={{ minWidth: '80px' }}>
              Project ID
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '180px' }}>
              Project Name
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '140px' }}>
              Client
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '140px' }}>
              Team
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '120px' }}>
              Client SPOC
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '100px' }}>
              Start Date
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '100px' }}>
              Status
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '110px' }}>
              Value (₹)
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '120px' }}>
              Invoice
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '140px' }}>
              Progress
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 sticky right-0 bg-gray-50 dark:bg-gray-800" style={{ minWidth: '80px' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {/* Checkbox */}
              <td className="px-2 py-2 w-10 sticky left-0 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                {onToggleSelection && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(project.id!)}
                    onChange={() => onToggleSelection(project.id!)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`Select ${project.projectName}`}
                  />
                )}
              </td>

              {/* Project ID */}
              <td className="px-2 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 font-medium sticky left-10 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                {project.projectNumber}
              </td>

              {/* Project Name */}
              <td className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
                <div className="truncate" title={project.projectName}>
                  {project.projectName}
                </div>
              </td>

              {/* Client */}
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="truncate" title={project.client?.name || '—'}>
                  {project.client?.name || '—'}
                </div>
              </td>

              {/* Team */}
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="truncate" title={project.teamMembers?.map((m) => m.name).join(', ')}>
                  {project.teamMembers?.slice(0, 2).map((m) => m.name).join(', ')}
                  {project.teamMembers && project.teamMembers.length > 2 && (
                    <span className="text-gray-400"> +{project.teamMembers.length - 2}</span>
                  )}
                </div>
              </td>

              {/* Client SPOC */}
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {project.clientSpoc?.name || '—'}
              </td>

              {/* Start Date */}
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {formatDate(project.startDate)}
              </td>

              {/* Status */}
              <td className="px-2 py-2 text-center">
                <ProjectStatusBadge status={project.status} />
              </td>

              {/* Value */}
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300 text-right font-medium">
                {formatCurrency(project.projectValue || 0)}
              </td>

              {/* Invoice */}
              <td className="px-2 py-2 text-center">
                {project.invoice?.raised ? (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Raised
                    {project.invoice.amount ? ` · ₹${project.invoice.amount.toLocaleString('en-IN')}` : ''}
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    No
                  </span>
                )}
              </td>

              {/* Progress */}
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 min-w-[60px]">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${project.progress?.percentage ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 w-8 text-right">
                    {project.progress?.percentage ?? 0}%
                  </span>
                </div>
              </td>

              {/* Actions */}
              <td className="px-2 py-2 sticky right-0 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-1 justify-center">
                  <button
                    onClick={() => onEdit(project)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    aria-label="Edit project"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(project.id!)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    aria-label="Delete project"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
