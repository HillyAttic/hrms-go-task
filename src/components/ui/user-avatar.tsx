'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Bundled copy of the default avatar glyph
 * (https://www.edventurehub.com/icons/services/user-circle-svgrepo-com.svg), so the
 * fallback never depends on a network request.
 */
export const DEFAULT_USER_AVATAR = '/images/icons/user-circle-svgrepo-com.svg';

interface UserAvatarProps {
  /** Uploaded profile picture. Falls back to the default glyph when empty or broken. */
  src?: string | null;
  alt?: string;
  /** Frame sizing/shape, e.g. "h-9 w-9" or "size-12 rounded-full". */
  className?: string;
  /** Extra classes for the fallback glyph (sizing/padding). */
  iconClassName?: string;
}

/**
 * Avatar that shows the user's uploaded photo and otherwise the standard
 * user-circle icon — no initials.
 */
export function UserAvatar({ src, alt = '', className, iconClassName }: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(src) && !broken;

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100/80 dark:bg-white/10',
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={src as string}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <img
          src={DEFAULT_USER_AVATAR}
          alt={alt}
          aria-hidden={alt ? undefined : true}
          className={cn(
            'h-full w-full object-contain opacity-70 dark:invert dark:opacity-80',
            iconClassName,
          )}
        />
      )}
    </span>
  );
}
