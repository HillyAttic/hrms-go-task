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

  const actions = [
    { label: 'Create Task', icon: <PlusCircleIcon className="h-4 w-4 shrink-0" />, onClick: onCreateTask, color: 'bg-blue-600 hover:bg-blue-700', showForManager: true },
    { label: 'View Team', icon: <UserGroupIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/teams'), color: 'bg-green-600 hover:bg-green-700', showForManager: false },
    { label: 'Pending Invoices', icon: <FolderIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/admin/pending-invoices'), color: 'bg-indigo-600 hover:bg-indigo-700', showForManager: false, badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined },
    { label: 'View Roster', icon: <CalendarDaysIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/roster/view-schedule'), color: 'bg-teal-600 hover:bg-teal-700', showForManager: false },
    { label: 'Reports', icon: <ClipboardDocumentCheckIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/reports'), color: 'bg-cyan-600 hover:bg-cyan-700', showForManager: true },
    { label: 'Attendance Sheet', icon: <ClockIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/admin/attendance-roster'), color: 'bg-pink-600 hover:bg-pink-700', showForManager: true },
    { label: 'Leave Approvals', icon: <CheckCircleIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/admin/leave-approvals'), color: 'bg-orange-600 hover:bg-orange-700', showForManager: true, badge: pendingLeaveApprovalsCount > 0 ? pendingLeaveApprovalsCount : undefined },
    { label: 'Compliance', icon: <CalendarIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/calendar'), color: 'bg-red-600 hover:bg-red-700', showForManager: false },
    { label: 'Kanban', icon: <Squares2X2Icon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/kanban'), color: 'bg-yellow-600 hover:bg-yellow-700', showForManager: false },
    { label: 'Projects', icon: <BuildingOfficeIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/projects'), color: 'bg-emerald-600 hover:bg-emerald-700', showForManager: false },
    { label: 'Employees', icon: <UsersIcon className="h-4 w-4 shrink-0" />, onClick: () => router.push('/employees'), color: 'bg-violet-600 hover:bg-violet-700', showForManager: false },
  ];

  const filteredActions = isManager && !isAdmin
    ? actions.filter((action) => action.showForManager)
    : actions;

  return (
    <Card className="flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border-gray-100/80 p-5 shadow-sm dark:border-gray-800">
      <h3 className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-gray-900 dark:text-white">
        <Bars3BottomLeftIcon className="h-4 w-4 text-gray-400" />
        Quick Actions
      </h3>
      <div className="mt-3.5 grid flex-1 grid-cols-2 content-start gap-2">
        {filteredActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`relative flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold leading-tight text-white shadow-sm transition-colors 2xl:text-[11.5px] ${action.color}`}
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
