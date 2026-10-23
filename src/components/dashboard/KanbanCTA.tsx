import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function KanbanCTA() {
  return (
    <section className="relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-sm md:p-7">
      {/* Decorative shapes */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -bottom-24 left-16 h-56 w-56 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-xl" />
        <div className="absolute bottom-0 right-16 h-40 w-40 rounded-full bg-violet-300/20 blur-2xl" />
        <div className="absolute -bottom-10 left-1/2 h-36 w-36 rounded-full border border-white/10" />
      </div>

      <div className="relative z-10 max-w-md">
        <h3 className="text-2xl font-bold leading-tight md:text-[28px]">
          Stay on top of every task.
        </h3>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/80 md:text-sm">
          Turn to smart tools and real-time updates to keep your work moving.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {['Board view', 'Real-time sync', 'Team visibility'].map((label) => (
            <span
              key={label}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-inset ring-white/15"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-auto flex justify-end pt-6">
        <Link
          href="/kanban"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-blue-50 md:text-sm"
        >
          View Board
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
