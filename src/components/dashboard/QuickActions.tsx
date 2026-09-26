import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircleIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  Squares2X2Icon,
  BuildingOfficeIcon,
  UsersIcon
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
  onViewTeam,
  onViewAnalytics,
  onManageProjects,
  onViewRoster,
  onViewReports,
  onViewAttendance,
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
    {
      label: 'Create Task',
      icon: <PlusCircleIcon className="w-5 h-5" />,
      onClick: onCreateTask,
      color: 'bg-foreground hover:bg-foreground/90',
      showForManager: true
    },
    {
      label: 'View Team',
      icon: <UserGroupIcon className="w-5 h-5" />,
      onClick: () => router.push('/teams'),
      color: 'bg-green-600 hover:bg-green-700',
      showForManager: false
    },
    {
      label: 'Pending Invoices',
      icon: <FolderIcon className="w-5 h-5" />,
      onClick: () => router.push('/admin/pending-invoices'),
      color: 'bg-indigo-600 hover:bg-indigo-700',
      showForManager: false,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined
    },
    {
      label: 'View Roster',
      icon: <CalendarDaysIcon className="w-5 h-5" />,
      onClick: () => router.push('/roster/view-schedule'),
      color: 'bg-teal-600 hover:bg-teal-700',
      showForManager: false
    },
    {
      label: 'Reports',
      icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />,
      onClick: () => router.push('/reports'),
      color: 'bg-cyan-600 hover:bg-cyan-700',
      showForManager: true
    },
    {
      label: 'Attendance Sheet',
      icon: <ClockIcon className="w-5 h-5" />,
      onClick: () => router.push('/admin/attendance-roster'),
      color: 'bg-pink-600 hover:bg-pink-700',
      showForManager: true
    },
    {
      label: 'Leave Approvals',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      onClick: () => router.push('/admin/leave-approvals'),
      color: 'bg-orange-600 hover:bg-orange-700',
      showForManager: true,
      badge: pendingLeaveApprovalsCount > 0 ? pendingLeaveApprovalsCount : undefined
    },
    {
      label: 'Compliance',
      icon: <CalendarIcon className="w-5 h-5" />,
      onClick: () => router.push('/calendar'),
      color: 'bg-red-600 hover:bg-red-700',
      showForManager: false
    },
    {
      label: 'Kanban',
      icon: <Squares2X2Icon className="w-5 h-5" />,
      onClick: () => router.push('/kanban'),
      color: 'bg-yellow-600 hover:bg-yellow-700',
      showForManager: false
    },
    {
      label: 'Projects',
      icon: <BuildingOfficeIcon className="w-5 h-5" />,
      onClick: () => router.push('/projects'),
      color: 'bg-emerald-600 hover:bg-emerald-700',
      showForManager: false
    },
    {
      label: 'Employees',
      icon: <UsersIcon className="w-5 h-5" />,
      onClick: () => router.push('/employees'),
      color: 'bg-violet-600 hover:bg-violet-700',
      showForManager: false
    }
  ];

  // Filter actions based on role
  const filteredActions = isManager && !isAdmin 
    ? actions.filter(action => action.showForManager)
    : actions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {filteredActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              className={`${action.color} text-white flex items-center justify-center gap-2 py-3 relative`}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
              {action.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {action.badge}
                </span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
