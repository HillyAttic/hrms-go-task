'use client';

import Image from "next/image";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Card width utilities. Pages with taller forms pass a wider max-width. */
  className?: string;
};

/**
 * Shell for the unauthenticated auth screens.
 *
 * The canvas is `fixed` rather than a wrapper: AuthWrapper's <main> is
 * max-width-capped and centred, so an in-flow canvas leaves bare seams down
 * both sides on viewports wider than that cap. The content div's min-height
 * subtracts AuthWrapper's padding (p-4 / md:p-6 / 2xl:p-10) so it fills the
 * viewport exactly without overflowing it.
 */
export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <>
      <div className="auth-neu-canvas fixed inset-0" aria-hidden="true" />

      <div className="relative flex min-h-[calc(100dvh-2rem)] items-center justify-center md:min-h-[calc(100dvh-3rem)] 2xl:min-h-[calc(100dvh-5rem)]">
        <div
          className={cn(
            "auth-neu-card w-full rounded-[2rem] p-7 sm:p-10",
            className ?? "max-w-[440px]",
          )}
        >
          <header className="auth-card-header mb-8 flex flex-col items-center text-center">
            <div className="auth-card-logo auth-neu-well mb-6 flex size-20 items-center justify-center rounded-[1.75rem]">
              {/* logo-512.png is the mark pre-cut to transparency; the
                  /images/logo/*.svg files are a base64 PNG with a white matte. */}
              <Image
                src={"/images/logo/logo-512.png"}
                alt="EdVentureHub"
                width={56}
                height={56}
                priority
                className="size-14 object-contain"
              />
            </div>

            <h1 className="auth-card-title text-2xl font-bold tracking-tight text-dark dark:text-white">
              {title}
            </h1>
            <p className="auth-card-subtitle mt-2 text-sm font-medium text-dark-4 dark:text-dark-6">
              {subtitle}
            </p>
          </header>

          {children}
        </div>
      </div>
    </>
  );
}

/** Shared link styling for the small "back to sign in" rows. */
export const authLinkClass =
  "rounded font-medium text-dark-4 transition hover:text-primary " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "dark:text-dark-6 dark:hover:text-primary";
