import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function KanbanCTA() {
  return (
    <section className="relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-2xl bg-[linear-gradient(100deg,#2A54F5_0%,#4640EE_42%,#6231E8_72%,#7A2BE3_100%)] px-7 py-7 text-white shadow-sm md:px-10 md:py-9">
      {/* Organic translucent blobs matching the reference artwork */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="kanban-cta-blob" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* Left hill */}
        <path d="M58,160 C64,134 88,118 116,118 C146,118 168,136 174,160 Z" fill="url(#kanban-cta-blob)" />
        {/* Centre hill */}
        <path d="M142,160 C150,114 186,88 228,88 C276,88 310,120 318,160 Z" fill="url(#kanban-cta-blob)" />
        {/* Large right mass */}
        <path
          d="M276,160 C272,132 276,102 292,82 C306,64 328,52 352,52 C380,52 398,74 402,96 L402,160 Z"
          fill="url(#kanban-cta-blob)"
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
