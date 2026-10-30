"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  CalendarDays,
  ChevronRight,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

export interface CalendarViewTarget {
  id: string;
  name: string;
  email?: string;
  role?: string;
  photoURL?: string;
}

interface CalendarUserPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the employee/manager whose calendar the admin wants to open. */
  onSelect: (target: CalendarViewTarget) => void;
  /** The admin's own account, offered as a shortcut at the top of the list. */
  currentUser?: CalendarViewTarget | null;
}

interface EmployeeOption {
  id: string;
  employeeId?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  department?: string;
  photoURL?: string;
}

const roleChip = (role?: string) =>
  role === "Manager"
    ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
    : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300";

/**
 * Admin-only picker shown before the attendance calendar so an admin can choose
 * whose calendar to look at. Employees and managers are listed; called from the
 * dashboard "View Calendar" CTA.
 */
export function CalendarUserPickerModal({
  open,
  onOpenChange,
  onSelect,
  currentUser,
}: CalendarUserPickerModalProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin SDK route: returns every user with their role (Manager/Admin/Employee).
      const res = await authenticatedFetch("/api/employees?limit=1000");
      if (!res.ok) throw new Error("Failed to load employees");
      const data = await res.json();
      const list: EmployeeOption[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setEmployees(list);
    } catch (err: any) {
      console.error("Error loading employees for calendar picker:", err);
      setEmployees([]);
      setError(err?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on every open so newly added employees appear without a reload.
  useEffect(() => {
    if (open) {
      setSearch("");
      load();
    }
  }, [open, load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((emp) => emp.status !== "resigned")
      .filter((emp) => emp.role === "Manager" || emp.role === "Employee")
      .filter((emp) => {
        if (!q) return true;
        return [emp.name, emp.email, emp.employeeId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [employees, search]);

  const managers = useMemo(
    () => visible.filter((emp) => emp.role === "Manager"),
    [visible],
  );
  const staff = useMemo(
    () => visible.filter((emp) => emp.role !== "Manager"),
    [visible],
  );

  const select = (emp: EmployeeOption) =>
    onSelect({
      id: emp.id,
      name: emp.name || emp.email || "Employee",
      email: emp.email,
      role: emp.role,
      photoURL: emp.photoURL,
    });

  const renderRow = (emp: EmployeeOption) => (
    <li key={emp.id}>
      <button
        type="button"
        onClick={() => select(emp)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-3.5 py-2.5 text-left shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-colors hover:border-indigo-200/80 hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/30 dark:hover:bg-white/[0.08]"
      >
        <UserAvatar
          src={emp.photoURL}
          alt={emp.name || "Employee"}
          className="h-9 w-9 rounded-xl"
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {emp.name || emp.email || "Unnamed"}
            </span>
            {emp.role && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleChip(emp.role)}`}
              >
                {emp.role}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
            {[emp.email, emp.employeeId, emp.department]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
      </button>
    </li>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-0 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90 sm:max-w-3xl landscape:max-h-[92vh]">
        {/* Header - fixed */}
        <DialogHeader className="shrink-0 space-y-0 border-b border-white/60 px-6 pb-5 pr-14 pt-6 dark:border-white/10">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Users className="h-[18px] w-[18px] text-gray-400" />
            View an employee calendar
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-500 dark:text-gray-400 [@media(max-height:560px)]:hidden">
            Pick an employee or manager to open their attendance calendar.
          </DialogDescription>

          <div className="relative !mt-6 [@media(max-height:560px)]:!mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or employee ID"
              aria-label="Search employees and managers"
              className="h-10 w-full rounded-md border border-slate-200/80 bg-white/70 pl-9 pr-3 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            />
          </div>
        </DialogHeader>

        {/* People - scrollable; two columns once the dialog is wide (landscape) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3 [@media(max-height:560px)]:py-2">
          {loading && employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-[#0447FD]" />
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Loading employees...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
              <button
                type="button"
                onClick={load}
                className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {currentUser && (
                <div className="mb-3">
                  <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    You
                  </p>
                  <ul>
                    <li>
                      <button
                        type="button"
                        onClick={() => onSelect(currentUser)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-3.5 py-2.5 text-left transition-colors hover:bg-indigo-50 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15"
                      >
                        <UserAvatar
                          src={currentUser.photoURL}
                          alt={currentUser.name}
                          className="h-9 w-9 rounded-xl bg-white/80 dark:bg-white/10"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-indigo-700 dark:text-indigo-200">
                            My own calendar
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-indigo-500/80 dark:text-indigo-300/70">
                            {currentUser.email || currentUser.name}
                          </span>
                        </span>
                        <CalendarDays className="h-4 w-4 shrink-0 text-indigo-400" />
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {search
                      ? "No one matches that search"
                      : "No employees or managers found"}
                  </p>
                </div>
              ) : (
                <>
                  {managers.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Managers ({managers.length})
                      </p>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {managers.map(renderRow)}
                      </ul>
                    </div>
                  )}

                  {staff.length > 0 && (
                    <div className="mb-1">
                      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Employees ({staff.length})
                      </p>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {staff.map(renderRow)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer - fixed */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/60 bg-white/40 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {loading && employees.length > 0 ? (
              "Refreshing..."
            ) : (
              <>
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {visible.length}
                </span>{" "}
                {visible.length === 1 ? "person" : "people"} available
              </>
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            loading={loading}
            className="rounded-xl"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
