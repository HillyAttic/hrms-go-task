import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 dark:from-[#0447FD] dark:to-[#7F1BFF]',
        default: 'bg-gradient-to-r from-[#0447FD] to-[#7F1BFF] text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 dark:from-[#0447FD] dark:to-[#7F1BFF]',
        secondary: 'bg-white/60 text-slate-700 backdrop-blur hover:bg-white/90 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15',
        danger: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 hover:brightness-110',
        destructive: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 hover:brightness-110',
        outline: 'border border-white/60 bg-white/50 text-slate-700 backdrop-blur hover:bg-white/80 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white',
        ghost: 'hover:bg-white/70 text-slate-700 hover:text-slate-900 dark:hover:bg-white/10 dark:text-slate-200 dark:hover:text-white',
        link: 'underline-offset-4 hover:underline text-indigo-600 dark:text-indigo-400',
      },
      size: {
        default: 'h-10 py-2 px-4', // 40px height
        sm: 'h-9 px-3 rounded-md', // 36px height - use sparingly
        md: 'h-10 py-2 px-4', // 40px height
        lg: 'h-11 px-8 rounded-md', // 44px height - meets touch target requirement
        icon: 'h-10 w-10', // 40px - adequate for touch
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
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };