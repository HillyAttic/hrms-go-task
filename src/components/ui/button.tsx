import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The single button system.
 *
 * Height utilities (h-9 / h-10 / h-11 / w-10) are asserted by
 * src/__tests__/ui-button-touch-target.test.tsx — keep them verbatim.
 *
 * `accent` (lime) is the brand CTA; `default` is the solid black CTA. Both carry
 * the 2px outline + hard offset shadow that define the card/button language.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md border-2 border-border font-semibold',
    'transition-[transform,background-color,box-shadow] duration-150',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        // Brand CTA — lime surface, dark ink
        accent: 'bg-accent text-accent-foreground shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-0 active:shadow-none',
        // Solid black CTA
        default: 'bg-foreground text-background shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-0 active:shadow-none',
        primary: 'bg-foreground text-background shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-0 active:shadow-none',
        // Outlined on white
        secondary: 'bg-card text-foreground hover:bg-muted',
        outline: 'bg-card text-foreground hover:bg-muted',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-muted',
        danger: 'bg-destructive text-destructive-foreground shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-0 active:shadow-none',
        destructive: 'bg-destructive text-destructive-foreground shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-0 active:shadow-none',
        link: 'border-transparent bg-transparent text-foreground underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
