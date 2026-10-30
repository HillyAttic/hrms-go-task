'use client';

/**
 * THROWAWAY PROTOTYPE — /prototype
 * T1–T10: ten theme skins of one dashboard, matching
 * public/edVenture Dashboard Theme Showcase.png (opens on T1).
 * K1–K5 and R1–R5: earlier layout explorations; S1–S9: earlier theme skins.
 * Mock data only. Remove this folder and the AuthWrapper bypass when done.
 */

import { useCallback, useEffect, useState } from 'react';
import './prototype.css';
import { Kpi1 } from './variants';
import { Kpi2, Kpi3, Kpi4, Kpi5 } from './kpi';
import { React1, React2, React3, React4, React5 } from './react';
import { Style1, Style2, Style3, Style4, Style5, Style6, Style7, Style8, Style9 } from './styles';
import { Theme1, Theme2, Theme3, Theme4, Theme5, Theme6, Theme7, Theme8, Theme9, Theme10 } from './showcase';

const VARIANTS = [
  { key: 'T1', set: 'Showcase', name: 'Neumorphism (Soft UI)', Component: Theme1 },
  { key: 'T2', set: 'Showcase', name: 'Glassmorphism', Component: Theme2 },
  { key: 'T3', set: 'Showcase', name: 'Dark Mode (Modern)', Component: Theme3 },
  { key: 'T4', set: 'Showcase', name: 'Minimalism', Component: Theme4 },
  { key: 'T5', set: 'Showcase', name: 'Brutalist UI', Component: Theme5 },
  { key: 'T6', set: 'Showcase', name: 'Claymorphism', Component: Theme6 },
  { key: 'T7', set: 'Showcase', name: 'Material Design', Component: Theme7 },
  { key: 'T8', set: 'Showcase', name: 'Fluent Design', Component: Theme8 },
  { key: 'T9', set: 'Showcase', name: 'Aurora UI', Component: Theme9 },
  { key: 'T10', set: 'Showcase', name: 'Organic / Biomorphic UI', Component: Theme10 },
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
  { key: 'S1', set: 'Styles', name: 'Material', Component: Style1 },
  { key: 'S2', set: 'Styles', name: 'Glassmorphism', Component: Style2 },
  { key: 'S3', set: 'Styles', name: 'Neumorphism', Component: Style3 },
  { key: 'S4', set: 'Styles', name: 'Claymorphism', Component: Style4 },
  { key: 'S5', set: 'Styles', name: 'Skeumorphism', Component: Style5 },
  { key: 'S6', set: 'Styles', name: 'Neobrutalism', Component: Style6 },
  { key: 'S7', set: 'Styles', name: 'Brutalism', Component: Style7 },
  { key: 'S8', set: 'Styles', name: 'Flat', Component: Style8 },
  { key: 'S9', set: 'Styles', name: 'Minimal', Component: Style9 },
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
          <optgroup label="Theme showcase">
            {VARIANTS.filter((variant) => variant.set === 'Showcase').map((variant) => (
              <option key={variant.key} value={variant.key}>{variant.key} · {variant.name}</option>
            ))}
          </optgroup>
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
          <optgroup label="Theme styles">
            {VARIANTS.filter((variant) => variant.set === 'Styles').map((variant) => (
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
