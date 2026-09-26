"use client"

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Text input.
 *
 * Previously this referenced `border-input bg-background ring-ring
 * placeholder:text-muted-foreground text-destructive`, none of which existed in
 * tailwind.config.ts — so it rendered with no border, no background and no
 * placeholder colour. Those tokens now resolve (see src/css/style.css).
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {props.required && <span className="text-destructive"> *</span>}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border-2 border-border bg-input px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-[13px] font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-[13px] text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
