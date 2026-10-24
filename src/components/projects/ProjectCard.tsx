import React from 'react';
import { Project } from '@/services/project.service';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import {
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  /**
   * Bento tile style:
   * - featured: rich showcase tile with milestones, progress ring and value footer
   * - wide: 2x1 horizontal tile
   * - compact: standard 1x1 tile (default)
   */
  variant?: 'compact' | 'wide' | 'featured';
  /** Scale modifier for the featured tile: 'sm' renders the same layout tighter */
  size?: 'md' | 'sm';
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

/** Compact Indian formatting for headline numbers (₹1.25 Cr / ₹45 L) */
const formatCurrencyShort = (amount: number) => {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  return formatCurrency(amount || 0);
};

const toDate = (d: any): Date | null => {
  if (!d) return null;
  return d instanceof Date ? d : typeof d?.toDate === 'function' ? d.toDate() : new Date(d);
};

const formatDate = (date: any) => {
  const d = toDate(date);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Brand-tinted initials avatar for a team member */
function MemberAvatar({ name, isLead, size = 'md' }: { name: string; isLead?: boolean; size?: 'sm' | 'md' }) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dims = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div
      title={name}
      className={`${dims} flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white ${
        isLead
          ? 'bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] ring-2 ring-amber-300 dark:ring-amber-400/70'
          : 'bg-gradient-to-br from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800'
      }`}
    >
      {initials || '?'}
    </div>
  );
}

/** Circular SVG progress ring */
function ProgressRing({ value, size = 96, stroke = 8 }: { value: number; size?: number; stroke?: number }) {
  const gradientId = `bento-progress-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="fill-none stroke-gray-200/80 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none stroke-[url(#${gradientId})] transition-all duration-500`}
        />
      </svg>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0447FD" />
            <stop offset="100%" stopColor="#7F1BFF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white tabular-nums">
        {value}%
      </span>
    </div>
  );
}

/** Linear progress bar with brand gradient */
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-gray-200/80 dark:bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function InvoicePill({ project }: { project: Project }) {
  return project.invoice?.raised ? (
    <div className="text-right min-w-0">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        Invoiced{project.invoice.amount ? ` · ${formatCurrencyShort(project.invoice.amount)}` : ''}
      </span>
      {(project.invoice.invoiceNumber || project.invoice.raisedAt) && (
        <p
          className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 truncate"
          title={project.invoice.invoiceNumber}
        >
          {project.invoice.invoiceNumber || 'Invoice'}
          {project.invoice.raisedAt ? ` · ${formatDate(project.invoice.raisedAt)}` : ''}
        </p>
      )}
    </div>
  ) : (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200/70 dark:bg-white/5 dark:text-gray-400 dark:border-white/10">
      No invoice
    </span>
  );
}

/** Client SPOC row; optionally shows email/phone inline (full contact always in tooltip) */
function ClientRow({ project, showContact = false, size = 'sm' }: { project: Project; showContact?: boolean; size?: 'sm' | 'md' }) {
  const spoc = project.clientSpoc;
  const contact = [spoc?.email, spoc?.phone].filter(Boolean).join(' · ');
  const textClass = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <div
      className={`flex items-center gap-1.5 ${textClass} text-slate-500 dark:text-gray-400 min-w-0`}
      title={contact || spoc?.name || undefined}
    >
      <BuildingOffice2Icon className={`${size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} flex-shrink-0`} />
      <span className="truncate">
        {spoc?.name || 'Client TBD'}
        {showContact && contact ? ` · ${contact}` : ''}
      </span>
    </div>
  );
}

/** Timeline row: start → end dates plus a days-left / overdue / delivered chip */
function TimelineRow({ project, size = 'sm' }: { project: Project; size?: 'sm' | 'md' }) {
  const start = toDate(project.startDate);
  const end = toDate(project.endDate);

  let chip: { label: string; cls: string } | null = null;
  if (project.status === 'completed') {
    chip = {
      label: 'Delivered',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    };
  } else if (end && !isNaN(end.getTime())) {
    const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
    chip =
      days < 0
        ? {
            label: `${-days}d overdue`,
            cls: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
          }
        : days <= 7
        ? {
            label: `${days}d left`,
            cls: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
          }
        : {
            label: `${days}d left`,
            cls: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
          };
  }

  const textClass = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${textClass} text-slate-500 dark:text-gray-400`}>
      <CalendarDaysIcon className={`${size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} flex-shrink-0`} />
      <span className="tabular-nums whitespace-nowrap">
        {start && !isNaN(start.getTime()) ? formatDate(project.startDate) : '—'}
        {' \u2192 '}
        {end && !isNaN(end.getTime()) ? formatDate(project.endDate) : 'ongoing'}
      </span>
      {chip && (
        <span
          className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chip.cls}`}
        >
          {chip.label}
        </span>
      )}
    </div>
  );
}

function CardActions({ project, onEdit, onDelete }: Pick<ProjectCardProps, 'project' | 'onEdit' | 'onDelete'>) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button
        onClick={() => onEdit(project)}
        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        aria-label={`Edit ${project.projectName}`}
      >
        <PencilSquareIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(project.id!)}
        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        aria-label={`Delete ${project.projectName}`}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ProjectCard({ project, onEdit, onDelete, variant = 'compact', size = 'md' }: ProjectCardProps) {
  const progress = project.progress?.percentage ?? 0;
  const completedMilestones =
    project.progress?.milestones?.filter((m) => m.completed).length ?? 0;
  const totalMilestones = project.progress?.milestones?.length ?? 0;
  const lead = project.teamMembers?.find((m) => m.isTeamLead);
  const members = project.teamMembers || [];

  const shellClass = variant === 'wide' ? 'col-span-2' : '';

  /* ── Featured: 2×1 showcase tile ─────────────────────────────────── */
  if (variant === 'featured') {
    const sm = size === 'sm';
    return (
      <Card className={`group relative overflow-hidden hover:shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 ${shellClass}`}>
        {/* Decorative gradient wash */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br from-[#0447FD]/15 to-[#7F1BFF]/15 blur-2xl" />
        <CardContent className={`h-full flex flex-col ${sm ? 'p-4' : 'p-5'}`}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {project.projectNumber}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <CardActions project={project} onEdit={onEdit} onDelete={onDelete} />
          </div>

          <h3 className={`font-bold tracking-tight text-slate-900 dark:text-white leading-tight line-clamp-1 ${sm ? 'text-lg mb-1' : 'text-xl mb-1.5'}`}>
            {project.projectName}
          </h3>
          <div className={`space-y-1 ${sm ? 'mb-3' : 'mb-4'}`}>
            <ClientRow project={project} showContact />
            <TimelineRow project={project} />
            {lead && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <span>★</span> Led by {lead.name}
              </p>
            )}
          </div>

          {/* Milestones + progress ring */}
          <div className={`flex items-center ${sm ? 'gap-4 mb-3' : 'gap-5 mb-4'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">
                <span>Milestones</span>
                <span className="tabular-nums">{completedMilestones}/{totalMilestones} done</span>
              </div>
              {totalMilestones > 0 ? (
                <ul className="space-y-1">
                  {project.progress.milestones.slice(0, 3).map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-xs min-w-0">
                      <CheckCircleIcon
                        className={`w-3.5 h-3.5 flex-shrink-0 ${m.completed ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                      />
                      <span className={`truncate ${m.completed ? 'text-slate-500 dark:text-gray-500 line-through' : 'text-slate-800 dark:text-gray-200'}`}>
                        {m.title}
                      </span>
                    </li>
                  ))}
                  {totalMilestones > 3 && (
                    <li className="text-[11px] text-slate-400 dark:text-gray-500 pl-5">
                      +{totalMilestones - 3} more
                    </li>
                  )}
                </ul>
              ) : (
                <ProgressBar value={progress} />
              )}
            </div>
            <ProgressRing value={progress} size={sm ? 56 : 72} stroke={sm ? 6 : 7} />
          </div>

          {/* Team strip */}
          <div className={`flex items-center gap-2 ${sm ? 'mb-2' : 'mb-3'}`}>
            <div className="flex -space-x-2.5">
              {members.slice(0, 6).map((m, i) => (
                <MemberAvatar key={m.uid || i} name={m.name} isLead={m.isTeamLead} size="sm" />
              ))}
              {members.length > 6 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-gray-100 text-gray-600 border-2 border-white dark:bg-white/10 dark:text-gray-300 dark:border-[#0B1430]">
                  +{members.length - 6}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between mt-auto border-t border-white/60 dark:border-white/10 ${sm ? 'pt-2.5' : 'pt-3'}`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-gray-500 font-semibold">Project value</p>
              <p className={`font-bold bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] bg-clip-text text-transparent ${sm ? 'text-base' : 'text-lg'}`}>
                {formatCurrencyShort(project.projectValue || 0)}
              </p>
            </div>
            <InvoicePill project={project} />
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Wide: 2×1 horizontal tile ───────────────────────────────────── */
  if (variant === 'wide') {
    return (
      <Card className={`group relative overflow-hidden hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-all duration-300 ${shellClass}`}>
        <CardContent className="p-5 flex gap-5 h-full">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {project.projectNumber}
              </span>
              <ProjectStatusBadge status={project.status} />
              <div className="ml-auto">
                <CardActions project={project} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {project.projectName}
            </h3>
            <div className="space-y-1 mb-3">
              <ClientRow project={project} />
              <TimelineRow project={project} />
            </div>
            <div className="mt-auto flex -space-x-2">
              {members.slice(0, 5).map((m, i) => (
                <MemberAvatar key={m.uid || i} name={m.name} isLead={m.isTeamLead} size="sm" />
              ))}
              {members.length > 5 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-gray-100 text-gray-600 border-2 border-white dark:bg-white/10 dark:text-gray-300 dark:border-[#0B1430]">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
          <div className="w-40 flex-shrink-0 flex flex-col justify-between pl-5 border-l border-white/60 dark:border-white/10">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 mb-1.5">
                <span>Progress</span>
                <span className="font-semibold tabular-nums">{progress}%</span>
              </div>
              <ProgressBar value={progress} />
              {totalMilestones > 0 && (
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1.5">
                  {completedMilestones}/{totalMilestones} milestones
                </p>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {formatCurrencyShort(project.projectValue || 0)}
              </p>
              <InvoicePill project={project} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Compact: standard 1×1 tile ──────────────────────────────────── */
  return (
    <Card className="group relative overflow-hidden hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-all duration-300">
      <CardContent className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {project.projectNumber}
            </span>
            <ProjectStatusBadge status={project.status} />
          </div>
          <CardActions project={project} onEdit={onEdit} onDelete={onDelete} />
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate mb-1">
          {project.projectName}
        </h3>
        <div className="space-y-1 mb-4">
          <ClientRow project={project} />
          <TimelineRow project={project} />
        </div>

        <div className="flex items-center gap-2 mb-4 mt-auto">
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m, i) => (
              <MemberAvatar key={m.uid || i} name={m.name} isLead={m.isTeamLead} size="sm" />
            ))}
            {members.length > 4 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-gray-100 text-gray-600 border-2 border-white dark:bg-white/10 dark:text-gray-300 dark:border-[#0B1430]">
                +{members.length - 4}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 mb-1.5">
            <span>Progress</span>
            <span className="font-semibold tabular-nums">
              {progress}%
              {totalMilestones > 0 && ` · ${completedMilestones}/${totalMilestones} tasks`}
            </span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/60 dark:border-white/10">
          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
            {formatCurrencyShort(project.projectValue || 0)}
          </span>
          <InvoicePill project={project} />
        </div>
      </CardContent>
    </Card>
  );
}
