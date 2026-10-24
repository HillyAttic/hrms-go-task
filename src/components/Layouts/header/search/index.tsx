'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { NAV_DATA } from '../../sidebar/data';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';

export function HeaderSearch() {
  const router = useRouter();
  const { hasRole } = useAuthEnhanced();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Search the same navigation the sidebar shows, so results are always reachable.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return NAV_DATA.flatMap((section) => section.items)
      .filter((item: any) => item.url && (!item.requiresRole || hasRole(item.requiresRole)))
      .filter((item: any) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .map((item: any) => ({ title: item.title as string, url: item.url as string }));
  }, [hasRole]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return items.filter((item) => item.title.toLowerCase().includes(term)).slice(0, 6);
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const go = (url: string) => {
    setQuery('');
    setOpen(false);
    router.push(url);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (results[0]) go(results[0].url);
        }}
      >
        <div className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 transition-colors focus-within:border-blue-300 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800/60 dark:focus-within:border-blue-700 dark:focus-within:bg-gray-800">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search anything..."
            aria-label="Search pages"
            className="w-full min-w-0 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200"
          />
          <kbd className="hidden shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:block dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
            Ctrl K
          </kbd>
        </div>
      </form>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-dark">
          {results.map((item) => (
            <li key={item.url}>
              <button
                onClick={() => go(item.url)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Search className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
