'use client';

import React, { useEffect, useId, useState } from 'react';
import { BarChart3, Clock3, CheckCircle2, Sparkles } from 'lucide-react';

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
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EDF2FF] via-[#F1F0FF] to-[#F7F2FF] px-6 py-7 md:px-9 md:py-8 dark:from-indigo-950/50 dark:via-blue-950/40 dark:to-violet-950/30">
      {/* Layered wave background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${waveId}-a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C7D6FF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#DCD4FF" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={`${waveId}-b`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B9CBFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#CFC3FF" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M0,132 C170,70 330,168 520,120 C700,74 830,150 1010,104 C1090,84 1150,88 1200,96 L1200,200 L0,200 Z"
          fill={`url(#${waveId}-a)`}
        />
        <path
          d="M0,166 C200,120 360,186 560,154 C760,122 900,176 1080,140 C1130,130 1170,130 1200,134 L1200,200 L0,200 Z"
          fill={`url(#${waveId}-b)`}
        />
      </svg>

      {/* Soft highlight behind the illustration */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/50 blur-3xl dark:bg-white/5" />

      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900 md:text-[30px] dark:text-white">
            {greeting}, {name}!
          </h2>
          <p className="mt-1.5 text-[13px] text-slate-500 md:text-[15px] dark:text-slate-400">
            Let&apos;s achieve more together.
          </p>
        </div>

        {/* Decorative illustration: floating tool chips over a mini stats card. */}
        <div className="relative hidden h-[112px] w-[236px] shrink-0 md:block" aria-hidden="true">
          <div className="absolute right-1 top-0 h-[84px] w-[136px] rounded-xl bg-white/70 p-2.5 shadow-sm ring-1 ring-white/70 backdrop-blur-sm dark:bg-white/10 dark:ring-white/10">
            <div className="flex h-full items-end justify-between gap-1.5">
              {[38, 62, 30, 78, 50].map((height, index) => (
                <span
                  key={index}
                  className={`w-4 rounded-t-md ${
                    index === 3 ? 'bg-indigo-500' : 'bg-indigo-300/80'
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="absolute left-1 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <div className="absolute bottom-0 left-8 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
            <Clock3 className="h-[18px] w-[18px] text-orange-500" />
          </div>
          <div className="absolute bottom-2 left-24 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm dark:bg-white/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>

          <div className="absolute right-[132px] top-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>
    </section>
  );
}
