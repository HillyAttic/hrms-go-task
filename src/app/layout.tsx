import "@/css/satoshi.css";
import "@/css/style.css";
import "@/css/mobile-responsive.css";

import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { Header } from "@/components/Layouts/header";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { ServiceWorkerProvider } from "./service-worker-provider";
import { AuthWrapper } from "@/components/Auth/AuthWrapper";
import { PWASplashScreen } from "@/components/pwa/pwa-splash-screen";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    template: "%s | JPCO",
    default: "JPCO",
  },
  description:
    "JPCO admin dashboard toolkit with 200+ templates, UI components, and integrations for fast dashboard development.",
  manifest: "/manifest.json",
  icons: {
    apple: '/images/logo/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JPCO Dashboard",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5750F1" },
    { media: "(prefers-color-scheme: dark)", color: "#020d1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        {/* CRITICAL: Suppress Chrome's "Tap to copy the URL" mini-infobar notification.
            This MUST run before React hydrates to catch the beforeinstallprompt event early.
            Chrome fires this event when it detects a PWA-eligible manifest, and if not
            intercepted with preventDefault(), it shows the mini-infobar notification. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaInstallPrompt = e;
              });
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <ServiceWorkerProvider>
            <PWASplashScreen />

            {/* Skip to main content link for keyboard navigation */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] bg-primary text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Skip to main content
            </a>

            <NextTopLoader color="#5750F1" showSpinner={false} />

            <AuthWrapper>
              {children}
            </AuthWrapper>
          </ServiceWorkerProvider>
        </Providers>
      </body>
    </html>
  );
}
