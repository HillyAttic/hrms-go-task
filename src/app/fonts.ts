/**
 * Global typefaces.
 *
 * Space Grotesk for display/headings, Inter for body copy — both self-hosted by
 * next/font at build time (no runtime network request, no layout shift).
 *
 * The CSS variables are consumed by tailwind.config.ts (`font-sans`, `font-display`),
 * and the className is applied on <html> in src/app/layout.tsx.
 */

import { Inter, Space_Grotesk } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable}`;
