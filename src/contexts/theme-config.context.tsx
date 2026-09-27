"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import {
  applyDarkOverrides,
  applyThemeConfig,
  DEFAULT_CONFIG,
  injectFontLinks,
  type ThemeConfig,
} from '@/lib/theme-config';

interface ThemeConfigContextValue {
  config: ThemeConfig;
  /** Saved values, for the "reset" button in the settings page. */
  saved: ThemeConfig;
  loading: boolean;
  /** Apply without persisting — live preview. */
  preview: (config: ThemeConfig) => void;
  save: (config: ThemeConfig) => Promise<void>;
  reload: () => Promise<void>;
}

const ThemeConfigContext = createContext<ThemeConfigContextValue | null>(null);

export function ThemeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((next: ThemeConfig) => {
    applyThemeConfig(next);
    applyDarkOverrides(next);
    injectFontLinks(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/theme-config', { cache: 'no-store' });
      const json = await res.json();
      const loaded = { ...DEFAULT_CONFIG, ...(json.data || {}) } as ThemeConfig;
      setSaved(loaded);
      setConfig(loaded);
      apply(loaded);
    } catch {
      // No config saved yet, or offline — the stylesheet defaults are already correct.
      apply(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Preview is transient: it must survive a reload of the page (the provider
  // re-fetches), so previews are not persisted — only `save` writes.
  const preview = useCallback(
    (next: ThemeConfig) => {
      setConfig(next);
      apply(next);
    },
    [apply]
  );

  const save = useCallback(
    async (next: ThemeConfig) => {
      const res = await authenticatedFetch('/api/theme-config', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save theme');
      }
      setSaved(next);
      setConfig(next);
      apply(next);
    },
    [apply]
  );

  return (
    <ThemeConfigContext.Provider value={{ config, saved, loading, preview, save, reload }}>
      {children}
    </ThemeConfigContext.Provider>
  );
}

export function useThemeConfig() {
  const ctx = useContext(ThemeConfigContext);
  if (!ctx) throw new Error('useThemeConfig must be used within ThemeConfigProvider');
  return ctx;
}