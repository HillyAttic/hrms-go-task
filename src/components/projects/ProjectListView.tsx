import React from 'react';
import { Project } from '@/services/project.service';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="custom-scrollbar bg-card rounded-lg border-2 border-border overflow-x-auto shadow-hard">
      <table className="w-full text-[13px]">
        <thead className="bg-muted border-b-2 border-border sticky top-0 z-10">
          <tr>
            {/* Frozen-left cells carry z-20 so they sit above the rest of the sticky header. */}
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-10 sticky left-0 z-20 bg-muted">
              {onToggleSelectAll && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-2 border-border accent-ring"
                  aria-label="Select all projects"
                />
              )}
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap sticky left-10 z-20 bg-muted" style={{ minWidth: '80px' }}>
              Project ID
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '180px' }}>
              Project Name
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '140px' }}>
              Team
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '120px' }}>
              Client SPOC
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '100px' }}>
              Start Date
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '100px' }}>
              End Date
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '100px' }}>
              Status
            </th>
            <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '110px' }}>
              Value (₹)
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '120px' }}>
              Invoice
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" style={{ minWidth: '140px' }}>
              Progress
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap sticky right-0 z-20 bg-muted" style={{ minWidth: '80px' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-border">
          {projects.map((project) => (
            <tr key={project.id} className="group hover:bg-muted transition-colors">
              {/* Checkbox */}
              <td className="px-3 py-2.5 w-10 sticky left-0 z-[1] bg-card group-hover:bg-muted">
                {onToggleSelection && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(project.id!)}
                    onChange={() => onToggleSelection(project.id!)}
                    className="w-4 h-4 rounded border-2 border-border accent-ring"
                    aria-label={`Select ${project.projectName}`}
                  />
                )}
              </td>

              {/* Project ID */}
              <td className="px-3 py-2.5 text-[13px] font-mono text-muted-foreground font-medium sticky left-10 z-[1] bg-card group-hover:bg-muted">
                {project.projectNumber}
              </td>

              {/* Project Name */}
              <td className="px-3 py-2.5 text-[13px] font-medium text-foreground">
                <div className="truncate" title={project.projectName}>
                  {project.projectName}
                </div>
              </td>

              {/* Team */}
              <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                <div className="truncate" title={project.teamMembers?.map((m) => m.name).join(', ')}>
                  {(() => {
                    const lead = project.teamMembers?.find((m) => m.isTeamLead);
                    const members = project.teamMembers || [];
                    return (
                      <>
                        {lead && (
                          <span className="inline-flex items-center gap-0.5 text-warning font-medium">
                            ★ {lead.name}
                          </span>
                        )}
                        {members.length > 0 && (
                          <span className={lead ? 'text-muted-foreground ml-1' : ''}>
                            ({members.length} {members.length === 1 ? 'member' : 'members'})
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </td>

              {/* Client SPOC */}
              <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                {project.clientSpoc?.name || '—'}
              </td>

              {/* Start Date */}
              <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                {formatDate(project.startDate)}
              </td>

              {/* End Date */}
              <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                {formatDate(project.endDate)}
              </td>

              {/* Status */}
              <td className="px-3 py-2.5 text-center">
                <ProjectStatusBadge status={project.status} />
              </td>

              {/* Value */}
              <td className="px-3 py-2.5 text-[13px] text-foreground text-right font-medium">
                {formatCurrency(project.projectValue || 0)}
              </td>

              {/* Invoice */}
              <td className="px-3 py-2.5 text-center">
                <Badge variant={project.invoice?.raised ? 'success' : 'default'}>
                  {project.invoice?.raised
                    ? `Raised${project.invoice.amount ? ` · ₹${project.invoice.amount.toLocaleString('en-IN')}` : ''}`
                    : 'No'}
                </Badge>
              </td>

              {/* Progress */}
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
                    <div
                      className="bg-foreground h-1.5 rounded-full transition-all"
                      style={{ width: `${project.progress?.percentage ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {project.progress?.percentage ?? 0}%
                  </span>
                </div>
              </td>

              {/* Actions */}
              <td className="px-3 py-2.5 sticky right-0 z-[1] bg-card group-hover:bg-muted">
                <div className="flex items-center gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(project)}
                    className="h-8 w-8"
                    aria-label="Edit project"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(project.id!)}
                    className="h-8 w-8 text-destructive"
                    aria-label="Delete project"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
