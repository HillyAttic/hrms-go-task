'use client';

/**
 * THROWAWAY PROTOTYPE — /prototype
 * Ten dashboard directions: 5 KPI-driven (K1–K5) and 5 React/Stitch-dense (R1–R5).
 * K1 and R1 mirror the real /dashboard structure and palette; the rest explore
 * different visual systems while keeping the same operational content.
 * Mock data only. Remove this folder and the AuthWrapper bypass when done.
 */

import { useCallback, useEffect, useState } from 'react';
import './prototype.css';
import { Kpi1 } from './variants';
import { Kpi2, Kpi3, Kpi4, Kpi5 } from './kpi';
import { React1, React2, React3, React4, React5 } from './react';

const VARIANTS = [
  { key: 'K1', set: 'KPI', name: 'Executive summary', Component: Kpi1 },
  { key: 'K2', set: 'KPI', name: 'Strategy tree', Component: Kpi2 },
  { key: 'K3', set: 'KPI', name: 'Real-time ops', Component: Kpi3 },
  { key: 'K4', set: 'KPI', name: 'SaaS metrics', Component: Kpi4 },
  { key: 'K5', set: 'KPI', name: 'Board pack', Component: Kpi5 },
  { key: 'R1', set: 'React', name: 'Dense dashboard', Component: React1 },
  { key: 'R2', set: 'React', name: 'Command center', Component: React2 },
  { key: 'R3', set: 'React', name: 'Analytics workspace', Component: React3 },
  { key: 'R4', set: 'React', name: 'Tonal glass', Component: React4 },
  { key: 'R5', set: 'React', name: 'Bento', Component: React5 },
] as const;

export default function PrototypePage() {
  const [index, setIndex] = useState(0);

  const select = useCallback((nextIndex: number) => {
    const bounded = (nextIndex + VARIANTS.length) % VARIANTS.length;
    setIndex(bounded);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', VARIANTS[bounded].key);
    window.history.replaceState(null, '', url.toString());
  }, []);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
    const found = VARIANTS.findIndex((variant) => variant.key === key || (key === 'A' && variant.key === 'K1'));
    if (found >= 0) setIndex(found);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) return;
      event.preventDefault();
      select(index + (event.key === 'ArrowRight' ? 1 : -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, select]);

  const current = VARIANTS[index];
  const Active = current.Component;

  return (
    <div className="proto-shell">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      />

      <Active />

      <div className="proto-switch" role="group" aria-label="Prototype variant switcher">
        <button type="button" onClick={() => select(index - 1)} aria-label="Previous variant">←</button>
        <span className="proto-switch-group">{current.set}</span>
        <select
          className="proto-switch-select"
          value={current.key}
          onChange={(event) => select(VARIANTS.findIndex((variant) => variant.key === event.target.value))}
          aria-label="Choose prototype variant"
        >
          <optgroup label="KPI dashboards">
            {VARIANTS.filter((variant) => variant.set === 'KPI').map((variant) => (
              <option key={variant.key} value={variant.key}>{variant.key} · {variant.name}</option>
            ))}
          </optgroup>
          <optgroup label="React dashboards">
            {VARIANTS.filter((variant) => variant.set === 'React').map((variant) => (
              <option key={variant.key} value={variant.key}>{variant.key} · {variant.name}</option>
            ))}
          </optgroup>
        </select>
        <button type="button" onClick={() => select(index + 1)} aria-label="Next variant">→</button>
        <span className="proto-switch-hint" aria-hidden="true">← →</span>
      </div>
    </div>
  );
}
