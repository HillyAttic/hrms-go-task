'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'react-toastify';
import { Loader2, RotateCcw, Save, Upload, X } from 'lucide-react';
import { useThemeConfig } from '@/contexts/theme-config.context';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import {
  COLOR_GROUPS,
  DEFAULT_CONFIG,
  FONTS,
  FONT_SCALE_STEPS,
  RADIUS_STEPS,
  readTokenPalette,
  type ThemeConfig,
} from '@/lib/theme-config';
import { cn } from '@/lib/utils';

const cardClass = 'bg-card rounded-xl border border-border p-5 shadow-sm';

export default function ThemeSettingPage() {
  const { isAdmin, loading: authLoading } = useAuthEnhanced();
  const { config, saved, preview, save, loading } = useThemeConfig();
  const [draft, setDraft] = useState<ThemeConfig>(config);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Seed the draft once the saved config arrives, and never again — otherwise an
  // in-flight edit would be clobbered by a background reload.
  const seeded = useRef(false);
  useEffect(() => {
    if (!loading && !seeded.current) {
      seeded.current = true;
      setDraft(config);
    }
  }, [loading, config]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const update = (patch: Partial<ThemeConfig>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    preview(next); // live preview across the whole app
  };

  const setColor = (mode: 'base' | 'dark', key: string, hex: string | null) => {
    const modeColors = { ...(draft[mode] || {}) };
    if (hex) modeColors[key] = hex;
    else delete modeColors[key];
    update({ [mode]: modeColors } as Partial<ThemeConfig>);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(draft);
      toast.success('Theme applied');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_CONFIG);
    preview(DEFAULT_CONFIG);
    toast.info('Reset to defaults — press Save to make it permanent');
  };

  const uploadLogo = async (kind: 'logoLight' | 'logoDark' | 'logoIcon', file: File) => {
    setUploading(kind);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      const res = await authenticatedFetch('/api/theme-config/upload', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Upload failed');
      update({ [kind]: json.url } as Partial<ThemeConfig>);
      toast.success('Logo uploaded — press Save to apply');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={cn(cardClass, 'text-sm text-muted-foreground')}>
        Only administrators can change the theme.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Theme Setting
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes preview instantly for you. Nothing affects other users until you save.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>

      <LogoSection draft={draft} uploading={uploading} onUpload={uploadLogo} onClear={(k) => update({ [k]: undefined } as Partial<ThemeConfig>)} />

      <BrandAndSurfaces draft={draft} onColor={setColor} />

      <TypographySection draft={draft} update={update} />

      <LayoutSection draft={draft} update={update} />
    </div>
  );
}

/* ------------------------------------------------------------------ sections */

function SectionCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={cardClass}>
      <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BrandAndSurfaces({
  draft,
  onColor,
}: {
  draft: ThemeConfig;
  onColor: (mode: 'base' | 'dark', key: string, hex: string | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = useState<'base' | 'dark'>('base');
  useEffect(() => {
    setMode(resolvedTheme === 'dark' ? 'dark' : 'base');
  }, [resolvedTheme]);

  // Seed the pickers from what the app currently renders, so an untouched token
  // shows its real colour. Deliberately not written into the draft — the draft
  // stays empty until a token is actually changed, which keeps "Save changes"
  // disabled and avoids persisting 19 values the admin never opened.
  const [resolved, setResolved] = useState<{ base: Record<string, string>; dark: Record<string, string> }>({
    base: {},
    dark: {},
  });
  useEffect(() => setResolved(readTokenPalette()), []);

  const colors = (draft[mode] || {}) as Record<string, string>;

  return (
    <SectionCard
      title="Colours"
      hint={
        mode === 'base'
          ? 'Applied in light mode. Click a swatch to open the colour picker.'
          : 'Applied only in dark mode. A token left unset falls back to its light value.'
      }
    >
      <div className="mb-4 inline-flex rounded-xl border border-border p-1">
        {(['base', 'dark'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium',
              mode === m ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground'
            )}
          >
            {m === 'base' ? 'Light mode' : 'Dark mode'}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {COLOR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tokens.map((token) => {
                const value = colors[token.key] ?? resolved[mode]?.[token.key] ?? '#000000';
                return (
                  // The native colour input is left in the DOM for the OS picker but
                  // painted invisible over a swatch we draw: Chrome renders its own
                  // control (circle, slashed box) which ignores our radius and border.
                  // The swatch keeps a fixed 6px radius so it stays legible when the
                  // corner-radius setting is at either extreme.
                  <label
                    key={token.key}
                    title={token.hint}
                    className="flex cursor-pointer items-center gap-3"
                  >
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border">
                      <span className="absolute inset-0" style={{ background: value }} />
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => onColor(mode, token.key, e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label={token.label}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {token.label}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {value}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TypographySection({
  draft,
  update,
}: {
  draft: ThemeConfig;
  update: (patch: Partial<ThemeConfig>) => void;
}) {
  return (
    <SectionCard title="Typography" hint="Fonts load from Google Fonts on the fly; the size scales every rem-based measurement in the app.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-foreground">Body font</span>
          <select
            value={draft.fontSans}
            onChange={(e) => update({ fontSans: e.target.value })}
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-foreground">Heading font</span>
          <select
            value={draft.fontDisplay}
            onChange={(e) => update({ fontDisplay: e.target.value })}
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Base font size — {draft.fontScale ?? 16}px
        </span>
        <div className="inline-flex flex-wrap gap-2">
          {FONT_SCALE_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => update({ fontScale: step })}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium',
                draft.fontScale === step
                  ? 'border-border bg-accent font-semibold text-accent-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {step}px
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function LayoutSection({
  draft,
  update,
}: {
  draft: ThemeConfig;
  update: (patch: Partial<ThemeConfig>) => void;
}) {
  const sliders = [
    { key: 'sidebarWidth', label: 'Sidebar width', min: 200, max: 400, step: 10, unit: 'px' },
    { key: 'headerHeight', label: 'Header height', min: 56, max: 120, step: 2, unit: 'px' },
  ] as const;

  return (
    <SectionCard title="Layout" hint="Corner rounding and the size of the persistent chrome.">
      <div className="grid gap-5 sm:grid-cols-2">
        {sliders.map((s) => (
          <label key={s.key} className="text-sm">
            <span className="mb-1.5 block font-medium text-foreground">
              {s.label} — {draft[s.key] ?? s.min}
              {s.unit}
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={draft[s.key] ?? s.min}
              onChange={(e) => update({ [s.key]: Number(e.target.value) } as Partial<ThemeConfig>)}
              className="w-full accent-primary"
            />
          </label>
        ))}
      </div>

      <div className="mt-5">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Corner radius</span>
        <div className="inline-flex flex-wrap gap-2">
          {RADIUS_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => update({ radius: step })}
              className={cn(
                'h-10 w-10 border text-xs font-medium',
                draft.radius === step
                  ? 'border-border bg-accent font-semibold text-accent-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
              style={{ borderRadius: `${step}px` }}
              title={`${step}px`}
            >
              {step}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function LogoSection({
  draft,
  uploading,
  onUpload,
  onClear,
}: {
  draft: ThemeConfig;
  uploading: string | null;
  onUpload: (kind: 'logoLight' | 'logoDark' | 'logoIcon', file: File) => void;
  onClear: (kind: 'logoLight' | 'logoDark' | 'logoIcon') => void;
}) {
  const rows = [
    { key: 'logoLight', label: 'Logo (light mode)', fallback: '/images/branding_edVenture-5.png' },
    { key: 'logoDark', label: 'Logo (dark mode)', fallback: '/images/dark-mode.png' },
    { key: 'logoIcon', label: 'Compact icon (mobile header)', fallback: '/images/logo/logo-icon.svg' },
  ] as const;

  return (
    <SectionCard title="Logo" hint="PNG, JPEG, WebP or SVG up to 512 KB. Leave empty to use the built-in artwork.">
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((row) => {
          const url = draft[row.key];
          return (
            <div key={row.key} className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{row.label}</p>
              <div className="mb-3 flex h-16 items-center justify-center rounded-lg bg-muted p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url || row.fallback} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex gap-2">
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted">
                  {uploading === row.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(row.key, file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {url && (
                  <button
                    onClick={() => onClear(row.key)}
                    className="rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted"
                    aria-label={`Remove ${row.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}