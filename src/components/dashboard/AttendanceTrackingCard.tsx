'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { authenticatedFetch } from '@/lib/api-client';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { leaveService } from '@/services/leave.service';
import { LeaveRequestModal } from '@/components/attendance/LeaveRequestModal';
import { WfhRequestModal } from '@/components/attendance/WfhRequestModal';
import {
  LeaveBalance,
  LeaveType,
  LeaveRequestFormData,
  WfhRequestFormData,
} from '@/types/attendance.types';
import { toast } from 'react-toastify';
import {
  CalendarDays,
  Clock,
  History,
  LogIn,
  LogOut,
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
  clockInTime?: string;
  currentRecordId?: string;
}

type GeoState = 'granted' | 'denied' | 'prompt' | 'unsupported';

function formatDuration(ms?: number) {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const actionClass =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors';

const secondaryActionClass =
  `${actionClass} border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800`;

export function AttendanceTrackingCard({ userId }: AttendanceTrackingCardProps) {
  const { user, userProfile } = useEnhancedAuth();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<GeoState>('prompt');
  const [requireLocation, setRequireLocation] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);

  // Leave / WFH state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWfhModal, setShowWfhModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchRequireLocation = useCallback(async (): Promise<boolean> => {
    if (!userId) return true;
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const snapshot = await getDoc(doc(db, 'users', userId));
      const required = snapshot.data()?.requireLocationTracking ?? true;
      setRequireLocation(required);
      return required;
    } catch {
      return true;
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    fetchRequireLocation();
  }, [refresh, fetchRequireLocation]);

  const getPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          setGeo(error.code === error.PERMISSION_DENIED ? 'denied' : 'prompt');
          reject(
            new Error(
              error.code === error.PERMISSION_DENIED
                ? 'Location access is blocked. Enable it in your browser to mark attendance.'
                : 'Could not get your location. Check GPS/network and try again.',
            ),
          );
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
      );
    });

  const resolveLocation = async () => {
    const required = await fetchRequireLocation();
    if (!required) return undefined;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Location is required but not available on this device.');
    }
    const position = await getPosition();
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  };

  const handleClockIn = async () => {
    if (!userId) return;
    setBusy('in');
    try {
      const location = await resolveLocation();
      const res = await authenticatedFetch('/api/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: userId,
          employeeName: userProfile?.displayName || user?.email || 'User',
          ...(location ? { location } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to clock in');
      toast.success('Clocked in');
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clock in');
    } finally {
      setBusy(null);
    }
  };

  const handleClockOut = async () => {
    if (!userId) return;
    setBusy('out');
    try {
      let recordId = status?.currentRecordId;
      if (!recordId) {
        const res = await authenticatedFetch(
          `/api/attendance/status?employeeId=${encodeURIComponent(userId)}`,
        );
        if (res.ok) recordId = (await res.json())?.currentRecordId;
      }
      if (!recordId) throw new Error('No active attendance record found');

      const location = await resolveLocation();
      const res = await authenticatedFetch('/api/attendance/clock-out', {
        method: 'POST',
        body: JSON.stringify({ recordId, ...(location ? { location } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to clock out');
      toast.success('Clocked out');
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clock out');
    } finally {
      setBusy(null);
    }
  };

  const openLeaveModal = async () => {
    setShowLeaveModal(true);
    try {
      const [types, balances] = await Promise.all([
        leaveService.getLeaveTypes(),
        userId ? leaveService.getLeaveBalances(userId) : Promise.resolve([]),
      ]);
      setLeaveTypes(types);
      setLeaveBalances(balances);
    } catch {
      toast.error('Failed to load leave data');
    }
  };

  const handleApplyLeave = async (data: LeaveRequestFormData) => {
    setSubmitting(true);
    try {
      await leaveService.createLeaveRequest(data);
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit leave request');
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyWfh = async (data: WfhRequestFormData) => {
    setSubmitting(true);
    try {
      await leaveService.createLeaveRequest({ ...data, leaveTypeId: 'wfh', halfDay: false });
      toast.success('WFH request submitted successfully');
      setShowWfhModal(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit WFH request');
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const geoBlocked = geo === 'denied' || geo === 'unsupported';
  const connected = !!status;
  const locationRequired = requireLocation !== false;

  return (
    <>
      <Card className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border-gray-100/80 p-5 shadow-sm dark:border-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
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

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openLeaveModal}
              className={`${actionClass} bg-blue-600 text-white shadow-sm hover:bg-blue-700`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Apply Leave
            </button>
            <button
              type="button"
              onClick={() => setShowWfhModal(true)}
              className={secondaryActionClass}
            >
              <Clock className="h-3.5 w-3.5" />
              Apply WFH
            </button>
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
                Clocked in{status.isOnBreak ? ' · on break' : ''}
                {status.clockInTime ? ` at ${formatTime(status.clockInTime)}` : ''}
                {status.elapsedTime ? ` · ${formatDuration(status.elapsedTime)}` : ''}
              </span>
            ) : (
              'Not clocked in yet today.'
            )}
          </p>

          {locationRequired && geoBlocked && (
            <div className="mx-auto mt-3 flex max-w-sm items-start justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[10px] text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {geo === 'denied'
                  ? 'Location access is blocked in your browser. Enable it to mark attendance.'
                  : 'Location is not available on this device.'}
              </span>
            </div>
          )}

          {!loading && status && (
            <button
              type="button"
              onClick={status.isClockedIn ? handleClockOut : handleClockIn}
              disabled={busy !== null}
              className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition-colors disabled:opacity-60 ${
                status.isClockedIn
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {busy ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {busy === 'in' ? 'Clocking in...' : 'Clocking out...'}
                </>
              ) : status.isClockedIn ? (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  Clock Out
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5" />
                  Clock In
                </>
              )}
            </button>
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

      <LeaveRequestModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        onSubmit={handleApplyLeave}
        leaveTypes={leaveTypes}
        leaveBalances={leaveBalances}
        loading={submitting}
      />

      <WfhRequestModal
        open={showWfhModal}
        onOpenChange={setShowWfhModal}
        onSubmit={handleApplyWfh}
        loading={submitting}
      />
    </>
  );
}
