'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
}

interface TeamPerformanceChartProps {
  teamMembers: TeamMember[];
}

/** Number of members shown inside the dashboard card before "View All". */
const PREVIEW_ROWS = 5;

const totalTasksOf = (member: TeamMember) =>
  member.tasksCompleted + member.tasksInProgress + member.tasksPending;

/** Stacked workload bar: completed / in progress / pending. */
function WorkloadBar({ completed, inProgress, pending }: { completed: number; inProgress: number; pending: number }) {
  const total = completed + inProgress + pending;
  const width = (value: number) => (total > 0 ? `${(value / total) * 100}%` : '0%');

  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      title={`${completed} done, ${inProgress} in progress, ${pending} pending`}
    >
      {total > 0 && (
        <>
          <span className="h-full bg-emerald-500" style={{ width: width(completed) }} />
          <span className="h-full bg-orange-500" style={{ width: width(inProgress) }} />
          <span className="h-full bg-yellow-400" style={{ width: width(pending) }} />
        </>
      )}
    </div>
  );
}

interface PerformanceTableProps {
  members: TeamMember[];
  /** Tighter spacing/text used inside the dashboard card. */
  compact?: boolean;
  /** Pin the header row while the member list scrolls (modal only). */
  stickyHeader?: boolean;
}

/** Shared member workload table used by both the card preview and the "View All" dialog. */
function PerformanceTable({ members, compact = false, stickyHeader = false }: PerformanceTableProps) {
  const headText = compact ? 'text-[10px] sm:text-[11px]' : 'text-xs';
  const cellText = compact ? 'text-[12px]' : 'text-sm';
  const headPad = compact ? 'pb-2' : 'pb-3';
  const rowPad = compact ? 'py-2.5' : 'py-3.5';
  const sticky = stickyHeader ? 'sticky top-0 z-10 bg-white dark:bg-gray-dark' : undefined;
  const headBase = cn('font-semibold', headText, headPad, 'border-b border-gray-100 dark:border-gray-800', sticky);

  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[27%]" />
        <col className="w-[9%]" />
        <col className="w-[14%]" />
        <col className="w-[20%]" />
        <col className="w-[11%]" />
        <col className="w-[19%]" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={cn(headBase, 'pr-2 text-left text-gray-500 dark:text-gray-400')}>
            Name
          </th>
          <th scope="col" className={cn(headBase, 'px-1 text-center text-gray-500 dark:text-gray-400')}>
            Total
          </th>
          <th scope="col" className={cn(headBase, 'whitespace-nowrap px-1 text-center text-yellow-600 dark:text-yellow-400')}>
            Pending
          </th>
          <th scope="col" className={cn(headBase, 'whitespace-nowrap px-1 text-center text-orange-600 dark:text-orange-400')}>
            In Progress
          </th>
          <th scope="col" className={cn(headBase, 'whitespace-nowrap px-1 text-center text-green-600 dark:text-green-400')}>
            Done
          </th>
          <th scope="col" className={cn(headBase, 'pl-2 text-center text-gray-500 dark:text-gray-400')}>
            Chart
          </th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => {
          const totalTasks = totalTasksOf(member);

          return (
            <tr
              key={member.id}
              className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800/40"
            >
              <td className={cn('pr-2', rowPad)}>
                <span className={cn('block truncate font-medium text-gray-900 dark:text-gray-100', cellText)}>
                  {member.name}
                </span>
              </td>
              <td className={cn('px-1 text-center font-semibold text-gray-700 dark:text-gray-300', cellText, rowPad)}>
                {totalTasks}
              </td>
              <td className={cn('px-1 text-center font-medium text-yellow-600 dark:text-yellow-400', cellText, rowPad)}>
                {member.tasksPending}
              </td>
              <td className={cn('px-1 text-center font-medium text-orange-600 dark:text-orange-400', cellText, rowPad)}>
                {member.tasksInProgress}
              </td>
              <td className={cn('px-1 text-center font-medium text-green-600 dark:text-green-400', cellText, rowPad)}>
                {member.tasksCompleted}
              </td>
              <td className={cn('pl-2', rowPad)}>
                <WorkloadBar
                  completed={member.tasksCompleted}
                  inProgress={member.tasksInProgress}
                  pending={member.tasksPending}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function TeamPerformanceChart({ teamMembers }: TeamPerformanceChartProps) {
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Heaviest workload first so the card preview surfaces the busiest members.
  const sortedMembers = useMemo(
    () => [...(teamMembers || [])].sort((a, b) => totalTasksOf(b) - totalTasksOf(a)),
    [teamMembers]
  );

  const previewRows = sortedMembers.slice(0, PREVIEW_ROWS);

  const filteredMembers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return sortedMembers;
    return sortedMembers.filter((member) => member.name.toLowerCase().includes(term));
  }, [sortedMembers, searchQuery]);

  const handleOpenChange = (open: boolean) => {
    setIsViewAllOpen(open);
    if (!open) setSearchQuery('');
  };

  return (
    <>
      <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-gray-100/80 p-5 shadow-sm dark:border-gray-800">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-gray-900 dark:text-white">
            <Users className="h-4 w-4 text-gray-400" />
            Team Performance
          </h3>
          <button
            type="button"
            onClick={() => handleOpenChange(true)}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1 rounded text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:ring-offset-gray-dark"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {previewRows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
            <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              No team members with assigned tasks yet
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              Assign tasks to team members to see their performance here
            </p>
          </div>
        ) : (
          <div className="mt-3 min-h-0 w-full flex-1 overflow-x-auto">
            <PerformanceTable members={previewRows} compact />
          </div>
        )}
      </Card>

      <Dialog open={isViewAllOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border-gray-100 p-0 sm:max-w-3xl dark:border-gray-800">
          {/* Header - fixed */}
          <DialogHeader className="shrink-0 space-y-0 border-b border-gray-100 px-6 pb-5 pr-14 pt-6 dark:border-gray-800">
            {/* Single wrapper: DialogHeader's space-y utilities would otherwise override child margins */}
            <div className="flex flex-col">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Users className="h-[18px] w-[18px] text-gray-400" />
                Team Performance
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                All {sortedMembers.length} team {sortedMembers.length === 1 ? 'member' : 'members'} and their task workload
              </DialogDescription>

              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search team member..."
                  aria-label="Search team members"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Member list - scrollable */}
          <div className="min-h-0 flex-1 overflow-auto px-6 py-2">
            {sortedMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  No team members with assigned tasks yet
                </p>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  Assign tasks to team members to see their performance here
                </p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  No team members match &quot;{searchQuery.trim()}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="min-w-[480px]">
                <PerformanceTable members={filteredMembers} stickyHeader />
              </div>
            )}
          </div>

          {/* Footer - fixed */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/40">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Showing{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-200">{filteredMembers.length}</span> of{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-200">{sortedMembers.length}</span> members
            </p>
            <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
