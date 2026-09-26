import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  isLoading, 
  variant = 'primary',
  disabled,
  className = '',
  ...props 
}) => {
  const baseClasses = "flex w-full justify-center rounded-lg border font-medium transition hover:opacity-90";
  
  const variantClasses = {
    primary: "bg-foreground text-background border-border hover:bg-foreground/90",
    secondary: "bg-gray-200 text-black border-gray-200 hover:bg-gray-300 dark:bg-muted dark:text-white dark:border-border dark:hover:bg-card",
    danger: "bg-red text-white border-red hover:bg-opacity-90",
  };
  
  const sizeClasses = "py-3 px-8";
  const disabledClasses = disabled || isLoading 
    ? "!cursor-not-allowed opacity-70" 
    : "";
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${disabledClasses} ${className}`;
  
  return (
    <button 
      {...props} 
      disabled={disabled || isLoading}
      className={classes}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};