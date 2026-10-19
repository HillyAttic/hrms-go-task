'use client';

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type AuthFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Rendered in the field's leading gutter (see .auth-field in style.css). */
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
};

export function AuthField({
  label,
  icon,
  error,
  hint,
  type,
  className,
  ...inputProps
}: AuthFieldProps) {
  const id = useId();
  // Reveal toggle is opt-in on the type: only password fields get the eye.
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2.5 block text-[13px] font-semibold text-dark-4 dark:text-dark-6"
      >
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dark-6 dark:text-dark-5">
            {icon}
          </span>
        )}

        <input
          id={id}
          {...inputProps}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "auth-field text-[15px] font-medium text-dark dark:text-white",
            isPassword && "auth-field-action",
            error && "auth-field-invalid",
            className,
          )}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-dark-5 transition hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-dark-6"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1.75 11S5 4.75 11 4.75 20.25 11 20.25 11 17 17.25 11 17.25 1.75 11 1.75 11Z" />
              <circle cx="11" cy="11" r="3" />
              {revealed && <path d="M3 3l16 16" />}
            </svg>
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 pl-1 text-xs font-medium text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 pl-1 text-xs text-dark-5 dark:text-dark-6">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
