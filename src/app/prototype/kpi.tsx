/**
 * THROWAWAY PROTOTYPE — KPI variants (K2–K5).
 * K1's layout (the /dashboard structure) with each variant's own theme.
 */

import { Shell } from './shell';

export function Kpi2() {
  return <Shell theme="k2" subtitle="Strategy room · Q4 2026 scorecard" label="KPI 2 · Strategy room" />;
}

export function Kpi3() {
  return <Shell theme="k3" subtitle="Operations center · live" label="KPI 3 · Real-time ops" />;
}

export function Kpi4() {
  return <Shell theme="k4" subtitle="Growth · SaaS metrics · Nov 2026" label="KPI 4 · SaaS metrics" />;
}

export function Kpi5() {
  return <Shell theme="k5" subtitle="Board pack · Q4 2026" label="KPI 5 · Board pack" />;
}
