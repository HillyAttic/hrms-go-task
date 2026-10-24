'use client';

import React, { useCallback, useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import type { CalendarViewTarget } from '@/components/attendance/CalendarUserPickerModal';

// Lazy-load the attendance calendar modal (heavy, client-only, pulls in Firestore).
const AttendanceCalendarModal = dynamic(
  () =>
    import('@/components/attendance/AttendanceCalendarModal').then(
      (mod) => mod.AttendanceCalendarModal,
    ),
  { ssr: false },
);

// Admin-only: choose whose calendar to open before the calendar itself loads.
const CalendarUserPickerModal = dynamic(
  () =>
    import('@/components/attendance/CalendarUserPickerModal').then(
      (mod) => mod.CalendarUserPickerModal,
    ),
  { ssr: false },
);

export function KanbanCTA() {
  const artId = useId().replace(/:/g, '');
  const { user, userProfile, isAdmin } = useEnhancedAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [target, setTarget] = useState<CalendarViewTarget | null>(null);

  const selfTarget = useMemo<CalendarViewTarget | null>(
    () =>
      user?.uid
        ? {
            id: user.uid,
            name: userProfile?.displayName || user.email || 'User',
            email: user.email || '',
            role: userProfile?.role,
            photoURL: userProfile?.photoURL || user.photoURL || undefined,
          }
        : null,
    [user, userProfile],
  );

  // Admins pick an employee/manager first; everyone else opens their own calendar.
  const handleViewCalendar = () => {
    if (isAdmin) {
      setShowPicker(true);
      return;
    }
    setTarget(selfTarget);
    setShowCalendar(true);
  };

  const handleSelect = (picked: CalendarViewTarget) => {
    setTarget(picked);
    setShowPicker(false);
    setShowCalendar(true);
  };

  const handleSwitchUser = useCallback(() => {
    setShowCalendar(false);
    setShowPicker(true);
  }, []);

  // The person whose calendar is open (the admin's own until they pick someone).
  const active = target ?? selfTarget;

  return (
    <section className="relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-3xl bg-[linear-gradient(100deg,#2A54F5_0%,#4640EE_42%,#6231E8_72%,#7A2BE3_100%)] px-7 py-7 text-white shadow-[8px_8px_20px_rgba(98,49,232,0.35),-6px_-6px_18px_rgba(255,255,255,0.9)] ring-1 ring-white/15 md:px-10 md:py-9 dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-6px_-6px_18px_rgba(255,255,255,0.04)] dark:ring-white/10">
      {/* Soft translucent waves rising from the bottom edge */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 600 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${artId}-wave-a`} x1="0" y1="1" x2="0.8" y2="0">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={`${artId}-wave-b`} x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        {/* Long sweep across the lower half */}
        <path
          d="M0,220 L0,178 C70,150 140,142 214,158 C300,177 366,200 436,206 C500,211 560,206 600,196 L600,220 Z"
          fill={`url(#${artId}-wave-a)`}
        />
        {/* Small foreground mound on the left */}
        <path
          d="M0,220 C38,202 92,196 140,204 C174,210 198,216 216,220 Z"
          fill={`url(#${artId}-wave-b)`}
        />
      </svg>

      <div className="relative z-10 flex flex-1 flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div className="max-w-[25rem]">
          <h3 className="text-[27px] font-bold leading-[1.15] tracking-tight md:text-[32px]">
            Stay on top of every task.
          </h3>
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/80 md:text-[15px]">
            Turn to smart tools and real-time updates to keep your work moving.
          </p>
        </div>

        <button
          type="button"
          onClick={handleViewCalendar}
          aria-haspopup="dialog"
          className="inline-flex shrink-0 items-center gap-2 self-end mb-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          View Calendar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Admin only: pick the employee/manager whose calendar to review */}
      {isAdmin && (
        <CalendarUserPickerModal
          open={showPicker}
          onOpenChange={setShowPicker}
          onSelect={handleSelect}
          currentUser={selfTarget}
        />
      )}

      {/* Attendance calendar for the selected person (own calendar for non-admins) */}
      {active && (
        <AttendanceCalendarModal
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          employeeId={active.id}
          employeeName={active.name}
          employeeEmail={active.email || ''}
          onSwitchUser={isAdmin ? handleSwitchUser : undefined}
          softUI
        />
      )}
    </section>
  );
}
