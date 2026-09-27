import React from 'react';
import { Project } from '@/services/project.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import {
  PencilSquareIcon,
  TrashIcon,
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
    <Card className="group hover:-translate-y-0.5 transition-transform">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                {project.projectNumber}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground truncate">
              {project.projectName}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(project)}
              className="h-9 w-9"
              aria-label={`Edit ${project.projectName}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(project.id!)}
              className="h-9 w-9 text-destructive"
              aria-label={`Delete ${project.projectName}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Team Members */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
          <UserGroupIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="truncate">
            {(() => {
              const lead = project.teamMembers?.find((m) => m.isTeamLead);
              const members = project.teamMembers || [];
              return (
                <>
                  {lead && (
                    <div className="flex items-center gap-1 text-warning font-medium">
                      <span>★</span>
                      <span className="truncate">{lead.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">TL</span>
                    </div>
                  )}
                  <div className="truncate">
                    {members.slice(0, 3).map((m) => m.name).join(', ')}
                    {members.length > 3 && ` +${members.length - 3} more`}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-foreground h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {totalMilestones > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <CheckCircleIcon className="w-3.5 h-3.5 text-success" />
              <span>
                {completedMilestones}/{totalMilestones} milestones
              </span>
            </div>
          )}
        </div>

        {/* Footer: Value + Invoice */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-border">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <CurrencyRupeeIcon className="w-4 h-4" />
            {formatCurrency(project.projectValue || 0)}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <DocumentTextIcon className="w-3.5 h-3.5" />
            {project.invoice?.raised ? (
              <span className="text-success font-medium">
                Invoice raised
                {project.invoice.amount
                  ? ` · ${formatCurrency(project.invoice.amount)}`
                  : ''}
              </span>
            ) : (
              <span className="text-muted-foreground">No invoice</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
