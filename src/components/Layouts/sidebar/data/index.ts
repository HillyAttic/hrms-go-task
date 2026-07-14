import * as Icons from "../icons";

// Navigation data with role-based access control
export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "Tasks",
        url: "/tasks",
        icon: Icons.TaskTrayIcon,
        items: [],
      },
      {
        title: "Compliance",
        url: "/calendar",
        icon: Icons.ComplianceIcon,
        items: [],
        hideOnMobile: true, // Hide on mobile view
      },
      {
        title: "Categories",
        url: "/categories",
        icon: Icons.CategoriesIcon,
        items: [],
        hideOnMobile: true, // Hide on mobile view
      },
      {
        title: "Kanban",
        url: "/kanban",
        icon: Icons.KanbanIcon,
        items: [],
        hideOnMobile: true, // Hide on mobile view
      },
      {
        title: "Personal Tasks",
        url: "/my-tasks",
        icon: Icons.MyTasksIcon,
        items: [],
        // Available to all authenticated users
      },

    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        title: "Non-Recurring",
        url: "/tasks/non-recurring",
        icon: Icons.NonRecurringIcon,
        items: [],
      },
      {
        title: "Teams",
        url: "/teams",
        icon: Icons.TeamsIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "Employees",
        url: "/employees",
        icon: Icons.User,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "Attendance",
        url: "/attendance",
        icon: Icons.ClockIcon,
        items: [],
      },
      {
        title: "Attendance Tray",
        url: "/attendance/tray",
        icon: Icons.ClockIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "Apply Leave",
        url: "/attendance?openLeaveModal=true",
        icon: Icons.LeaveIcon,
        items: [],
      },
      {
        title: "View Roster",
        url: "/roster/view-schedule",
        icon: Icons.RosterIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "Update Roster",
        url: "/roster/update-schedule",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Reports",
        url: "/reports",
        icon: Icons.ReportsIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Only managers and admins can see this
      },
      {
        title: "MIS Tracker",
        url: "/mis-tracker",
        icon: Icons.MISTrackerIcon,
        items: [],
        dynamicVisibility: true, // Visibility controlled by MIS config
      },
    ],
  },
  {
    label: "ADMIN",
    items: [
      {
        title: "Leave Approvals",
        url: "/admin/leave-approvals",
        icon: Icons.CheckCircleIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Managers see their assigned employees' requests
      },
      {
        title: "WFH Approvals",
        url: "/admin/leave-approvals?tab=wfh",
        icon: Icons.CheckCircleIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Managers see their assigned employees' requests
      },
      {
        title: "Attendance Sheet",
        url: "/admin/attendance-roster",
        icon: Icons.AttendanceSheetIcon,
        items: [],
        requiresRole: ['admin', 'manager'], // Managers see their assigned employees' attendance
      },
      {
        title: "Manager Hierarchy",
        url: "/admin/manager-hierarchy",
        icon: Icons.UsersIcon,
        items: [],
        requiresRole: ['admin'], // Only admins can manage hierarchies
      },
      {
        title: "Pending Invoices",
        url: "/admin/pending-invoices",
        icon: Icons.InvoiceIcon,
        items: [],
        requiresRole: ['admin'],
      },
      // Authentication menu item hidden - users can access auth pages directly via URL if needed
      // {
      //   title: "Authentication",
      //   icon: Icons.Authentication,
      //   items: [
      //     {
      //       title: "Sign In",
      //       url: "/auth/sign-in",
      //     },
      //     {
      //       title: "Sign Up",
      //       url: "/auth/signup",
      //     },
      //     {
      //       title: "Forgot Password",
      //       url: "/auth/forgot-password",
      //     },
      //   ],
      // },
    ],
  },
  {
    label: "EXCLUSIVITY",
    items: [
      {
        title: "Access Vault",
        url: "/access-vault",
        icon: Icons.KeyIcon,
        items: [],
      },
      {
        title: "Password Manager",
        url: "/admin/password-manager",
        icon: Icons.ShieldLockIcon,
        items: [],
      },
      {
        title: "Clients",
        url: "/clients",
        icon: Icons.ClientsIcon,
        items: [],
      },
      {
        title: "Recurring",
        url: "/tasks/recurring",
        icon: Icons.RecurringIcon,
        items: [],
      },
      {
        title: "Client Visits",
        url: "/admin/client-visits",
        icon: Icons.MapPinIcon,
        items: [],
      },
      {
        title: "Client Access",
        url: "/admin/client-access",
        icon: Icons.ClientsIcon,
        items: [],
      },
      {
        title: "Form Builder",
        url: "/forms/builder",
        icon: Icons.TaskTrayIcon,
        items: [],
      },
      {
        title: "MIS Accessibility",
        url: "/admin/mis-accessibility",
        icon: Icons.SettingsIcon,
        items: [],
      },
    ],
  },
];
