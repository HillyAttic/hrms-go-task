import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Bars3BottomLeftIcon,
  PlusCircleIcon,
  UserGroupIcon,
  FolderIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  Squares2X2Icon,
  BuildingOfficeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  onCreateTask?: () => void;
  onViewTeam?: () => void;
  onViewAnalytics?: () => void;
  onManageProjects?: () => void;
  onViewRoster?: () => void;
  onViewReports?: () => void;
  onViewAttendance?: () => void;
  isAdminOrManager?: boolean;
  isManager?: boolean;
  isAdmin?: boolean;
  pendingInvoicesCount?: number;
  pendingLeaveApprovalsCount?: number;
}

export function QuickActions({
  onCreateTask,
  isAdminOrManager = false,
  isManager = false,
  isAdmin = false,
  pendingInvoicesCount = 0,
  pendingLeaveApprovalsCount = 0,
}: QuickActionsProps) {
  const router = useRouter();

  // Only show Quick Actions to admin/manager roles
  if (!isAdminOrManager) {
    return null;
  }

  const gradient = (from: string, to: string) =>
    `bg-gradient-to-r ${from} ${to} hover:brightness-110`;

  const actions = [
    { label: 'Create Task', icon: <PlusCircleIcon className="h-4 w-4 shrink-0" />, onClick: onCreateTask, color: gradient('from-[#0447FD]', 'to-[#7F1BFF]'), showForManager: true },
    { label: 'View Team', icon: <UserGroupIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/teams'), color: gradient('from-emerald-500', 'to-teal-600'), showForManager: false },
    { label: 'Pending Invoices', icon: <FolderIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/admin/pending-invoices'), color: gradient('from-indigo-500', 'to-violet-600'), showForManager: false, badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined },
    { label: 'View Roster', icon: <CalendarDaysIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/roster/view-schedule'), color: gradient('from-teal-500', 'to-cyan-600'), showForManager: false },
    { label: 'Reports', icon: <ClipboardDocumentCheckIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/reports'), color: gradient('from-cyan-500', 'to-sky-600'), showForManager: true },
    { label: 'Attendance Sheet', icon: <ClockIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/admin/attendance-roster'), color: gradient('from-pink-500', 'to-rose-600'), showForManager: true },
    { label: 'Leave Approvals', icon: <CheckCircleIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/admin/leave-approvals'), color: gradient('from-orange-500', 'to-amber-600'), showForManager: true, badge: pendingLeaveApprovalsCount > 0 ? pendingLeaveApprovalsCount : undefined },
    { label: 'Compliance', icon: <CalendarIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/calendar'), color: gradient('from-rose-500', 'to-red-600'), showForManager: false },
    { label: 'Kanban', icon: <Squares2X2Icon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/kanban'), color: gradient('from-fuchsia-500', 'to-purple-600'), showForManager: false },
    { label: 'Projects', icon: <BuildingOfficeIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/projects'), color: gradient('from-green-500', 'to-emerald-600'), showForManager: false },
    { label: 'Employees', icon: <UsersIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/employees'), color: gradient('from-violet-500', 'to-purple-600'), showForManager: false },
  ];

  const filteredActions = isManager && !isAdmin
    ? actions.filter((action) => action.showForManager)
    : actions;

  return (
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-slate-200/80 bg-white/70 p-5 shadow-[6px_6px_14px_rgba(148,163,199,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.55)]">
      <h3 className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-slate-900 dark:text-white">
        <Bars3BottomLeftIcon className="h-4 w-4 text-indigo-500/70" />
        Quick Actions
      </h3>
      <div className="mt-3.5 grid flex-1 grid-cols-2 content-start gap-2">
        {filteredActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`relative flex min-h-[34px] items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-center text-[11px] font-semibold leading-tight text-white shadow-[2px_2px_5px_rgba(148,163,199,0.45),-2px_-2px_5px_rgba(255,255,255,0.7)] transition-all active:shadow-[inset_2px_2px_4px_rgba(15,23,42,0.3)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.05)] 2xl:text-[11.5px] ${action.color}`}
          >
            {action.icon}
            <span className="min-w-0">{action.label}</span>
            {action.badge && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-1 ring-white/80">
                {action.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
