/**
 * THROWAWAY PROTOTYPE — React variants (R1–R5).
 * K1's layout (the /dashboard structure) with each variant's own theme.
 */

import { Shell } from './shell';

export function React1() {
  return <Shell theme="r1" subtitle="Operations overview · dense" label="React 1 · Dense dashboard" />;
}

export function React2() {
  return <Shell theme="r2" subtitle="Command center · live" label="React 2 · Command center" />;
}

export function React3() {
  return <Shell theme="r3" subtitle="Analytics workspace" label="React 3 · Analytics workspace" />;
}

export function React4() {
  return <Shell theme="r4" subtitle="edVenture workspace · tonal glass" label="React 4 · Tonal glass" />;
}

export function React5() {
  return <Shell theme="r5" subtitle="edVenture workspace · bento" label="React 5 · Bento" layout="bento" />;
}
