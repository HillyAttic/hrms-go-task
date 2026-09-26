import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The single badge system. Replaces the per-page `bg-green-100 text-green-800`
 * colour maps.
 *
 * Status variants use a 15% tint of the semantic hue with the hue itself as text
 * — the tint keeps the badge quiet so it never competes with the lime brand accent.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted text-foreground',
        secondary: 'border-transparent bg-muted text-foreground',
        lime: 'border-border bg-accent text-accent-foreground',
        dark: 'border-transparent bg-dark text-white',
        success: 'border-transparent bg-success/15 text-success',
        warning: 'border-transparent bg-warning/15 text-warning',
        danger: 'border-transparent bg-destructive/15 text-destructive',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
        info: 'border-transparent bg-info/15 text-info',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  ariaLabel?: string;
}

function Badge({ className, variant, ariaLabel, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      role="status"
      aria-label={ariaLabel}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
