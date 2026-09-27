/**
 * Runtime theme overrides.
 *
 * The tokens in `src/css/style.css` are the defaults. This module lets an admin
 * override a subset of them from /admin/theme-setting without a rebuild: the
 * config is stored in Firestore (`settings/theme`) and applied as inline custom
 * properties on <html>, which beat the stylesheet because inline > stylesheet.
 *
 * Colours are stored as "#rrggbb" (what an <input type="color"> gives us) and
 * converted to the space-separated RGB channels the tokens expect, so Tailwind's
 * alpha modifier (`bg-primary/90`) keeps working.
 */

export const FONTS = [
  { label: 'Inter (default)', value: 'Inter' },
  { label: 'Space Grotesk', value: 'Space Grotesk' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'Source Sans 3', value: 'Source Sans 3' },
  { label: 'Work Sans', value: 'Work Sans' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'IBM Plex Sans', value: 'IBM Plex Sans' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Georgia', value: 'Georgia' },
] as const;

interface ColorToken {
  key: string;
  label: string;
  hint?: string;
}

/** Editable colour tokens, grouped for the settings UI. `key` is the CSS var minus `--`. */
export const COLOR_GROUPS: { label: string; tokens: ColorToken[] }[] = [
  {
    label: 'Brand',
    tokens: [
      { key: 'primary', label: 'Primary', hint: 'Choose a colour dark enough to read under white text — it is also used for focus rings in dark mode.' },
      { key: 'primary-foreground', label: 'On primary' },
      { key: 'accent', label: 'Accent', hint: 'Used for the active sidebar item.' },
      { key: 'accent-foreground', label: 'On accent' },
    ],
  },
  {
    label: 'Surfaces',
    tokens: [
      { key: 'background', label: 'Background' },
      { key: 'surface', label: 'Page surface' },
      { key: 'card', label: 'Card' },
      { key: 'card-foreground', label: 'On card' },
      { key: 'foreground', label: 'Text' },
      { key: 'muted', label: 'Muted' },
      { key: 'muted-foreground', label: 'Muted text' },
      { key: 'border', label: 'Border' },
      { key: 'input', label: 'Input' },
      { key: 'ring', label: 'Focus ring' },
      { key: 'secondary', label: 'Secondary' },
      { key: 'secondary-foreground', label: 'On secondary' },
    ],
  },
  {
    label: 'Status',
    tokens: [
      { key: 'destructive', label: 'Danger' },
      { key: 'success', label: 'Success' },
      { key: 'warning', label: 'Warning' },
      { key: 'info', label: 'Info' },
    ],
  },
];

export const COLOR_KEYS = COLOR_GROUPS.flatMap((g) => g.tokens.map((t) => t.key));

export interface ThemeConfig {
  /** Vars set on <html> for both light and dark. */
  base: Record<string, string>;
  /** Surcharges applied while `.dark` is active; falls back to `base`. */
  dark: Record<string, string>;
  fontSans?: string;
  fontDisplay?: string;
  /** Root font size in px — everything is rem-based, so this scales the whole UI. */
  fontScale?: number;
  /** Layout knobs. */
  radius?: number;
  sidebarWidth?: number;
  headerHeight?: number;
  logoLight?: string;
  logoDark?: string;
  logoIcon?: string;
}

export const FONT_SCALE_STEPS = [14, 15, 16, 17, 18] as const;
export const RADIUS_STEPS = [0, 4, 8, 12, 16, 20, 24] as const;

export const DEFAULT_CONFIG: ThemeConfig = {
  base: {},
  dark: {},
  fontSans: 'Inter',
  fontDisplay: 'Space Grotesk',
  fontScale: 16,
  radius: 20,
  sidebarWidth: 290,
  headerHeight: 70,
};

export const hexToRgbChannels = (hex: string): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/**
 * The values the app currently resolves, as hex — what the settings page seeds its
 * pickers with, so an untouched token shows its real colour rather than #000000.
 *
 * Dark values are read off a throwaway element carrying `.dark`: custom properties
 * resolve on the element that declares them, so this reports the dark palette even
 * while the viewer is in light mode. It also picks up the admin's saved `.dark`
 * overrides, which is the point — this reports truth, not the stylesheet defaults.
 */
export function readTokenPalette(): { base: Record<string, string>; dark: Record<string, string> } {
  if (typeof document === 'undefined') return { base: {}, dark: {} };

  const probe = document.createElement('div');
  probe.className = 'dark';
  probe.style.display = 'none';
  document.body.appendChild(probe);

  const base: Record<string, string> = {};
  const dark: Record<string, string> = {};
  const rootStyle = getComputedStyle(document.documentElement);
  const probeStyle = getComputedStyle(probe);
  for (const key of COLOR_KEYS) {
    base[key] = channelsToHex(rootStyle.getPropertyValue(`--${key}`).trim());
    dark[key] = channelsToHex(probeStyle.getPropertyValue(`--${key}`).trim());
  }

  probe.remove();
  return { base, dark };
}

export function channelsToHex(value: string): string {
  const [r, g, b] = value.replace(/,/g, ' ').split(/\s+/).map(Number);
  if ([r, g, b].some((n) => !Number.isFinite(n))) return '#000000';
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

const googleFontHref = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;

/**
 * Apply a config to the live document. Called on every change for instant preview
 * and once on load by ThemeConfigProvider.
 */
export function applyThemeConfig(config: ThemeConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const { base = {}, dark = {} } = config;

  // Base values only. Dark-mode values need to lose to nothing and win over these,
  // so they go in a `.dark` stylesheet rule with !important (applyDarkOverrides) —
  // inline style otherwise beats any stylesheet rule, .dark included.
  for (const key of COLOR_KEYS) {
    if (base[key]) root.setProperty(`--${key}`, hexToRgbChannels(base[key]));
    else root.removeProperty(`--${key}`);
  }

  if (config.fontScale) root.setProperty('--font-scale', `${config.fontScale}px`);
  if (config.radius != null) root.setProperty('--radius', `${config.radius}px`);
  if (config.sidebarWidth) root.setProperty('--sidebar-width', `${config.sidebarWidth}px`);
  if (config.headerHeight) root.setProperty('--header-height', `${config.headerHeight}px`);

  for (const [name, family] of [
    ['--font-sans-override', config.fontSans],
    ['--font-display-override', config.fontDisplay],
  ] as const) {
    if (family) root.setProperty(name, `"${family}"`);
    else root.removeProperty(name);
  }
}

/** Inject the Google Fonts stylesheet for whichever families the config asks for. */
export function injectFontLinks(config: ThemeConfig) {
  if (typeof document === 'undefined') return;
  for (const family of [config.fontSans, config.fontDisplay]) {
    if (!family || family === 'Inter' || family === 'Space Grotesk') continue; // self-hosted by next/font
    const id = `theme-font-${family.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = googleFontHref(family);
    document.head.appendChild(link);
  }
}

/** Wire the `dark:` overrides into the `.dark` block by writing a style element. */
export function applyDarkOverrides(config: ThemeConfig) {
  if (typeof document === 'undefined') return;
  const id = 'theme-dark-overrides';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  const rules = Object.entries(config.dark || {})
    .filter(([key, hex]) => COLOR_KEYS.includes(key) && hex)
    .map(([key, hex]) => `--${key}: ${hexToRgbChannels(hex)} !important;`);
  el.textContent = rules.length ? `.dark{${rules.join('')}}` : '';
}