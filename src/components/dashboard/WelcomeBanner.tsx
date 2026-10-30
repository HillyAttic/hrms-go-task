'use client';

import React, { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import { Clock3 } from 'lucide-react';

interface WelcomeBannerProps {
  name: string;
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  // Resolved after mount so the server render and first client paint match.
  const [greeting, setGreeting] = useState('Hello');
  const waveId = useId().replace(/:/g, '');

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening');
  }, []);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-[#EDF2FF] via-[#F1F0FF] to-[#F8F1FF] px-6 py-7 shadow-[8px_8px_20px_rgba(148,163,199,0.4)] backdrop-blur-xl md:min-h-[172px] md:px-9 md:py-6 dark:border-white/10 dark:from-indigo-950/50 dark:via-blue-950/40 dark:to-violet-950/30 dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55)]">
      {/* Layered hills that fade in from the right side of the banner */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${waveId}-hill-a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9D8FF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E4DBFF" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={`${waveId}-hill-b`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D3DEFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#DCD0FF" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M180,220 C300,198 372,92 548,38 C700,-8 790,48 906,112 C1008,168 1120,190 1200,198 L1200,220 Z"
          fill={`url(#${waveId}-hill-a)`}
        />
        <path
          d="M330,220 C432,204 476,124 618,106 C756,88 836,150 962,178 C1062,200 1146,204 1200,206 L1200,220 Z"
          fill={`url(#${waveId}-hill-b)`}
        />
      </svg>

      {/* Soft highlight behind the illustration */}
      <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full bg-white/50 blur-3xl dark:bg-white/5" />

      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900 md:text-[30px] dark:text-white">
            {greeting}, {name}!
          </h2>
          <p className="mt-1.5 text-[13px] text-slate-500 md:text-[15px] dark:text-slate-400">
            Let&apos;s achieve more together.
          </p>
        </div>

        {/* Illustration: 3D bars + clock orb beside the person working at a laptop. */}
        <div className="relative hidden h-[140px] w-[320px] shrink-0 md:block" aria-hidden="true">
          <div className="absolute bottom-2 left-0 flex items-end gap-1.5">
            <span className="h-[22px] w-[11px] rounded-t-[3px] bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-500 shadow-[0_6px_10px_-4px_rgba(6,182,212,0.6)]" />
            <span className="h-[34px] w-[11px] rounded-t-[3px] bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500 shadow-[0_6px_10px_-4px_rgba(14,165,233,0.6)]" />
            <span className="h-[48px] w-[11px] rounded-t-[3px] bg-gradient-to-b from-blue-300 via-blue-400 to-blue-500 shadow-[0_8px_12px_-4px_rgba(59,130,246,0.6)]" />
          </div>

          <div className="absolute bottom-10 left-[30px] flex h-11 w-11 items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#C084FC_0%,#8B5CF6_55%,#6D28D9_100%)] text-white shadow-[0_10px_18px_-6px_rgba(109,40,217,0.55)] ring-[5px] ring-white/40 dark:ring-white/10">
            <Clock3 className="h-[19px] w-[19px]" strokeWidth={2.4} />
          </div>

          <Image
            src="/images/illustration/dashboard-illustration.png"
            alt=""
            width={640}
            height={391}
            priority
            className="absolute -bottom-8 right-0 h-[160px] w-auto object-contain drop-shadow-[0_10px_18px_rgba(80,90,180,0.18)]"
          />
        </div>
      </div>
    </section>
  );
}
