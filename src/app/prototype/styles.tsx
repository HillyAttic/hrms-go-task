/**
 * THROWAWAY PROTOTYPE — theme-style variants (S1–S9).
 * The ten styles from the design-skill collection, each applied to the same
 * /dashboard layout. R5 is the tenth (bento). Mock data only.
 */

import './styles.css';
import { Shell } from './shell';

export function Style1() {
  return <Shell theme="s1" subtitle="Material Design" label="Style · Material" />;
}

export function Style2() {
  return <Shell theme="s2" subtitle="Glassmorphism" label="Style · Glassmorphism" />;
}

export function Style3() {
  return <Shell theme="s3" subtitle="Neumorphism" label="Style · Neumorphism" />;
}

export function Style4() {
  return <Shell theme="s4" subtitle="Claymorphism" label="Style · Claymorphism" />;
}

export function Style5() {
  return <Shell theme="s5" subtitle="Skeumorphism" label="Style · Skeumorphism" />;
}

export function Style6() {
  return <Shell theme="s6" subtitle="Neobrutalism" label="Style · Neobrutalism" />;
}

export function Style7() {
  return <Shell theme="s7" subtitle="Brutalism" label="Style · Brutalism" />;
}

export function Style8() {
  return <Shell theme="s8" subtitle="Flat" label="Style · Flat" />;
}

export function Style9() {
  return <Shell theme="s9" subtitle="Minimal" label="Style · Minimal" />;
}
