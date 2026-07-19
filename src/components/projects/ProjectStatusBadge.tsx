import React from 'react';

interface ProjectStatusBadgeProps {
  status: 'wip' | 'completed' | 'pending_approval';
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  wip: {
    label: 'WIP',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

export function ProjectStatusBadge({ status, size = 'sm' }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.wip;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-block font-medium rounded-full ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
