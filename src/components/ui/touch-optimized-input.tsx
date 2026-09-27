"use client";

import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import React, { forwardRef } from "react";

interface TouchOptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touchTargetSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
}

export const TouchOptimizedInput = forwardRef<HTMLInputElement, TouchOptimizedInputProps>(
  ({ 
    label, 
    error, 
    touchTargetSize = 'md', 
    variant = 'default',
    className,
    ...props 
  }, ref) => {
    const { device, isTouchDevice } = useResponsive();

    const touchTargetSizes = {
      sm: isTouchDevice ? 'min-h-[44px]' : 'min-h-[36px]',
      md: isTouchDevice ? 'min-h-[48px]' : 'min-h-[40px]',
      lg: isTouchDevice ? 'min-h-[56px]' : 'min-h-[44px]'
    };

    const variantClasses = {
      default: 'border border-stroke bg-card dark:border-stroke-dark',
      filled: 'bg-muted border-0',
      outlined: 'border-2 border-primary bg-transparent'
    };

    const responsivePadding = device.type === 'mobile' 
      ? 'px-4 py-3' 
      : device.type === 'tablet' 
        ? 'px-5 py-3' 
        : 'px-6 py-3';

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg text-dark dark:text-white',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            'transition-all duration-200',
            touchTargetSizes[touchTargetSize],
            variantClasses[variant],
            responsivePadding,
            // Touch-specific styles
            isTouchDevice && 'touch-manipulation',
            // Mobile-specific adjustments
            device.type === 'mobile' && 'text-base', // Prevent zoom on iOS
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

TouchOptimizedInput.displayName = "TouchOptimizedInput";

interface TouchOptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  touchTargetSize?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const TouchOptimizedButton = forwardRef<HTMLButtonElement, TouchOptimizedButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    touchTargetSize = 'md',
    children, 
    className,
    ...props 
  }, ref) => {
    const { device, isTouchDevice } = useResponsive();

    const touchTargetSizes = {
      sm: isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px] min-w-[36px]',
      md: isTouchDevice ? 'min-h-[48px] min-w-[48px]' : 'min-h-[40px] min-w-[40px]',
      lg: isTouchDevice ? 'min-h-[56px] min-w-[56px]' : 'min-h-[44px] min-w-[44px]'
    };

    const variantClasses = {
      primary: 'bg-foreground text-background hover:bg-foreground/90 focus:ring-ring/30',
      secondary: 'bg-muted text-foreground hover:bg-muted/80 focus:ring-ring/30',
      outline: 'border-2 border-border text-foreground hover:bg-muted focus:ring-ring/30',
      ghost: 'text-foreground hover:bg-muted focus:ring-ring/30'
    };

    const sizeClasses = {
      sm: device.type === 'mobile' ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm',
      md: device.type === 'mobile' ? 'px-4 py-3 text-base' : 'px-6 py-3 text-base',
      lg: device.type === 'mobile' ? 'px-6 py-4 text-lg' : 'px-8 py-4 text-lg'
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium',
          'focus:outline-none focus:ring-2 transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          touchTargetSizes[touchTargetSize],
          variantClasses[variant],
          sizeClasses[size],
          // Touch-specific styles
          isTouchDevice && 'touch-manipulation active:scale-95',
          // Hover states only on non-touch devices
          !isTouchDevice && 'hover:shadow-hard',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TouchOptimizedButton.displayName = "TouchOptimizedButton";