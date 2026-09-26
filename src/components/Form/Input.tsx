import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  required, 
  className = '',
  ...props 
}) => {
  return (
    <div className="mb-4">
      <label className="mb-2.5 block font-medium text-black dark:text-white">
        {label} {required && <span className="text-red">*</span>}
      </label>
      <input
        {...props}
        className={`w-full rounded-lg border border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-card dark:border-border dark:bg-input dark:focus:border-primary ${
          error ? '!border-red' : ''
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red">{error}</p>}
    </div>
  );
};