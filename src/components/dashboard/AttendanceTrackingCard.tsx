'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { authenticatedFetch } from '@/lib/api-client';
import {
  CalendarDays,
  Clock,
  History,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface AttendanceTrackingCardProps {
  userId?: string;
}

interface AttendanceStatus {
  isClockedIn: boolean;
  isOnBreak?: boolean;
  elapsedTime?: number;
}

type GeoState = 'granted' | 'denied' | 'prompt' | 'unsupported';

function formatDuration(ms?: number) {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const actionClass =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors md:text-xs';

const secondaryActionClass =
  `${actionClass} border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800`;

export function AttendanceTrackingCard({ userId }: AttendanceTrackingCardProps) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<GeoState>('prompt');

  const refresh = useCallback(async () => {
    // Location permission tells us whether geolocation can be used at all.
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unsupported');
    } else if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        setGeo(result.state as GeoState);
      } catch {
        setGeo('prompt');
      }
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await authenticatedFetch(
        `/api/attendance/status?employeeId=${encodeURIComponent(userId)}`,
      );
      if (res.ok) {
        setStatus(await res.json());
      } else {
        setStatus(null);
      }
    } catch (error) {
      console.error('Error loading attendance status:', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const geoBlocked = geo === 'denied' || geo === 'unsupported';
  const connected = !!status;

  return (
    <Card className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border-gray-100/80 p-5 shadow-sm dark:border-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-gray-900 dark:text-white">
              <Clock className="h-4 w-4 text-gray-400" />
              Attendance Tracking
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                connected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
              />
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Track time, manage leaves, and view history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/attendance?openLeaveModal=true"
            className={`${actionClass} bg-blue-600 text-white shadow-sm hover:bg-blue-700`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Apply Leave
          </Link>
          <Link href="/attendance?openWfhModal=true" className={secondaryActionClass}>
            <Clock className="h-3.5 w-3.5" />
            Apply WFH
          </Link>
          <Link href="/attendance/history" className={secondaryActionClass}>
            <History className="h-3.5 w-3.5" />
            History
          </Link>
        </div>
      </div>

      <div className="mt-4 flex min-h-[124px] flex-1 flex-col rounded-xl border border-gray-100 p-4 dark:border-gray-800">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
          <Clock className="h-3.5 w-3.5" />
          Attendance Tracker
        </div>

        <p className="mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              Loading attendance status...
            </span>
          ) : status?.isClockedIn ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              Clocked in{status.isOnBreak ? ' · on break' : ''} · {formatDuration(status.elapsedTime)}
            </span>
          ) : (
            'Not clocked in yet today.'
          )}
        </p>

        {geoBlocked && (
          <div className="mx-auto mt-3 flex max-w-sm items-start justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[10px] text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-400">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Location tracking is{' '}
              {geo === 'denied' ? 'disabled for your account' : 'not available on this device'}.
            </span>
          </div>
        )}

        <button
          onClick={refresh}
          disabled={loading}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>
    </Card>
  );
}
