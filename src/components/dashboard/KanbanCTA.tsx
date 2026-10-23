import React, { useId } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function KanbanCTA() {
  const artId = useId().replace(/:/g, '');

  return (
    <section className="relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-3xl bg-[linear-gradient(100deg,#2A54F5_0%,#4640EE_42%,#6231E8_72%,#7A2BE3_100%)] px-7 py-7 text-white shadow-[0_24px_50px_-28px_rgba(98,49,232,0.75)] md:px-10 md:py-9">
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
        {/* Wide, low mound anchored to the right */}
        <path
          d="M250,220 C272,180 324,158 386,160 C450,162 498,186 522,220 Z"
          fill={`url(#${artId}-wave-b)`}
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

        <Link
          href="/kanban"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_6px_18px_-6px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:self-center"
        >
          View Board
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
