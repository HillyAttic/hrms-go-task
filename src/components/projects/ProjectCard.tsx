import React from 'react';
import { Project } from '@/services/project.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import {
  PencilSquareIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const progress = project.progress?.percentage ?? 0;
  const completedMilestones =
    project.progress?.milestones?.filter((m) => m.completed).length ?? 0;
  const totalMilestones = project.progress?.milestones?.length ?? 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {project.projectNumber}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {project.projectName}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(project)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label={`Edit ${project.projectName}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(project.id!)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${project.projectName}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Client */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{project.client?.name || '—'}</span>
        </div>

        {/* Team Members */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <UserGroupIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {project.teamMembers?.slice(0, 3).map((m) => m.name).join(', ')}
            {project.teamMembers?.length > 3 && ` +${project.teamMembers.length - 3} more`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {totalMilestones > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
              <span>
                {completedMilestones}/{totalMilestones} milestones
              </span>
            </div>
          )}
        </div>

        {/* Footer: Value + Invoice */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
            <CurrencyRupeeIcon className="w-4 h-4" />
            {formatCurrency(project.projectValue || 0)}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <DocumentTextIcon className="w-3.5 h-3.5" />
            {project.invoice?.raised ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Invoice raised
                {project.invoice.amount
                  ? ` · ${formatCurrency(project.invoice.amount)}`
                  : ''}
              </span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">No invoice</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
