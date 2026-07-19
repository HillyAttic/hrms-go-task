import { SVGProps } from "react";
import {
  House,
  ListChecks,
  FileCheck2,
  LayoutGrid,
  Kanban,
  ClipboardCheck,
  Building2,
  Users,
  UsersRound,
  RefreshCw,
  CircleCheckBig,
  ClipboardList,
  CalendarOff,
  CalendarRange,
  BarChart3,
  ShieldCheck,
  KeyRound,
  MapPin,
  Receipt,
  CalendarDays,
  Clock,
  Inbox,
  CircleCheck,
  ChevronUp as LucideChevronUp,
  ArrowLeft,
  Type,
  Table as LucideTable,
  PieChart as LucidePieChart,
  Grid2X2,
  LogIn,
  FileSpreadsheet,
  Settings,
  Lock as LucideLock,
  LockOpen as LucideLockOpen,
  FolderKanban,
} from "lucide-react";

export type PropsType = SVGProps<SVGSVGElement>;

type LucideWrapperProps = { className?: string; "aria-hidden"?: boolean | "true" | "false"; style?: React.CSSProperties };

function wrap(LucideIcon: React.ComponentType<LucideWrapperProps>) {
  return function WrappedIcon({ className, ...rest }: PropsType) {
    return <LucideIcon className={className} aria-hidden={(rest as any)["aria-hidden"]} />;
  };
}

export const HomeIcon = wrap(House);
export const TaskIcon = wrap(ListChecks);
export const ComplianceIcon = wrap(FileCheck2);
export const CategoriesIcon = wrap(LayoutGrid);
export const KanbanIcon = wrap(Kanban);
export const MyTasksIcon = wrap(ClipboardCheck);
export const ClientsIcon = wrap(Building2);
export const UsersIcon = wrap(Users);
export const TeamsIcon = wrap(UsersRound);
export const RecurringIcon = wrap(RefreshCw);
export const NonRecurringIcon = wrap(CircleCheckBig);
export const AttendanceSheetIcon = wrap(ClipboardList);
export const LeaveIcon = wrap(CalendarOff);
export const RosterIcon = wrap(CalendarRange);
export const ReportsIcon = wrap(BarChart3);
export const ShieldLockIcon = wrap(ShieldCheck);
export const KeyIcon = wrap(KeyRound);
export const MapPinIcon = wrap(MapPin);
export const InvoiceIcon = wrap(Receipt);
export const Calendar = wrap(CalendarDays);
export const ClockIcon = wrap(Clock);
export const TaskTrayIcon = wrap(Inbox);
export const CheckCircleIcon = wrap(CircleCheck);
export const Alphabet = wrap(Type);
export const Table = wrap(LucideTable);
export const PieChart = wrap(LucidePieChart);
export const FourCircle = wrap(Grid2X2);
export const Authentication = wrap(LogIn);
export const User = wrap(Users);
export const MISTrackerIcon = wrap(FileSpreadsheet);
export const SettingsIcon = wrap(Settings);
export const LockIcon = wrap(LucideLock);
export const LockOpenIcon = wrap(LucideLockOpen);
export const ProjectIcon = wrap(FolderKanban);

export function ChevronUp(props: PropsType) {
  const { className } = props;
  return <LucideChevronUp className={className} aria-hidden={(props as any)["aria-hidden"]} />;
}

export function ArrowLeftIcon(props: PropsType) {
  const { className } = props;
  return <ArrowLeft className={className} aria-hidden={(props as any)["aria-hidden"]} />;
}
