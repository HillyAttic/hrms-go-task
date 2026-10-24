'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, History, LogIn, LogOut, RefreshCw } from 'lucide-react';

interface AttendanceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

type RecordStatus = 'active' | 'completed' | 'incomplete';

interface AttendanceRecordApi {
  id: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status?: RecordStatus;
  totalHours?: number;
}

/** How many records the dashboard card surfaces; the full list lives on /attendance/history. */
const PREVIEW_LIMIT = 15;

const formatDay = (value: string) => {
  const date = new Date(value);
  return isNaN(date.getTime())
    ? 'Invalid date'
    : date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (record: AttendanceRecordApi) => {
  const clockIn = record.clockIn ? new Date(record.clockIn).getTime() : NaN;
  const clockOut = record.clockOut ? new Date(record.clockOut).getTime() : NaN;

  let minutes: number;
  if (!isNaN(clockIn) && !isNaN(clockOut) && clockOut > clockIn) {
    minutes = Math.floor((clockOut - clockIn) / 60000);
  } else if (typeof record.totalHours === 'number' && record.totalHours > 0) {
    minutes = Math.round(record.totalHours * 60);
  } else {
    return record.clockOut ? '—' : 'In progress';
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};

const statusMeta = (record: AttendanceRecordApi) => {
  if (record.clockOut) {
    return {
      label: 'Completed',
      className:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (record.clockIn) {
    return {
      label: 'Active',
      className: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
      dot: 'bg-sky-500',
    };
  }
  return {
    label: 'Incomplete',
    className:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  };
};

export function AttendanceHistoryModal({
  open,
  onOpenChange,
  userId,
}: AttendanceHistoryModalProps) {
  const [records, setRecords] = useState<AttendanceRecordApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `/api/attendance/records?employeeId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error('Failed to load attendance history');
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading attendance history:', err);
      setRecords([]);
      setError(err?.message || 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch every time the dialog opens so the list is never stale.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const visibleRecords = useMemo(() => records.slice(0, PREVIEW_LIMIT), [records]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-0 backdrop-blur-2xl sm:max-w-2xl dark:border-white/10 dark:bg-[#0B1430]/90">
        {/* Header - fixed */}
        <DialogHeader className="shrink-0 space-y-0 border-b border-white/60 px-6 pb-5 pr-14 pt-6 dark:border-white/10">
          <div className="flex flex-col">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <History className="h-[18px] w-[18px] text-gray-400" />
              Attendance History
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your most recent clock-in and clock-out records.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Records - scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-[#0447FD]" />
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Loading attendance records...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
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
          ) : visibleRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                No attendance records yet
              </p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                Clock in from the Attendance Tracker to start your history
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleRecords.map((record) => {
                const status = statusMeta(record);
                return (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-colors hover:border-indigo-200/80 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/30 dark:hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDay(record.clockIn ?? '')}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <LogIn className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="truncate">{formatTime(record.clockIn)}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                        <span className="truncate">{formatTime(record.clockOut)}</span>
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {formatDuration(record)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer - fixed */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/60 bg-white/40 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {loading && records.length > 0 ? (
              'Refreshing...'
            ) : (
              <>
                Showing{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {visibleRecords.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-200">
                  {records.length}
                </span>{' '}
                {records.length === 1 ? 'record' : 'records'}
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
