import React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';

interface ProjectStatusBadgeProps {
  status: 'wip' | 'completed' | 'pending_approval';
  size?: 'sm' | 'md';
}

/**
 * Thin wrapper over the shared Badge so project status uses the one badge system.
 * `wip` maps to `info` (the semantic in-progress hue), not the old raw blue-100.
 */
const STATUS_CONFIG: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  wip: { label: 'WIP', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  pending_approval: { label: 'Pending Approval', variant: 'warning' },
};

export function ProjectStatusBadge({ status, size = 'sm' }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.wip;

  return (
    <Badge
      variant={config.variant}
      className={size === 'md' ? 'px-2.5 py-1 text-xs' : undefined}
    >
      {config.label}
    </Badge>
  );
}
