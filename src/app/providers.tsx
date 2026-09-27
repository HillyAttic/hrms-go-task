"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider, useTheme } from "next-themes";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth.context";
import { NotificationProvider } from "@/contexts/notification.context";
import { ModalProvider } from "@/contexts/modal-context";
import { ThemeConfigProvider } from "@/contexts/theme-config.context";
import { NotificationPermissionPrompt } from "@/components/pwa/notification-permission-prompt";
import { IOSPWAPrompt } from "@/components/pwa/ios-pwa-prompt";
import { NotificationClickHandler } from "@/components/pwa/notification-click-handler";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <ThemeConfigProvider>
      <NotificationProvider>
        <EnhancedAuthProvider>
          <ModalProvider>
            <SidebarProvider>{children}</SidebarProvider>
            <NotificationPermissionPrompt />
            <IOSPWAPrompt />
            <NotificationClickHandler />
            <ThemedToasts />
          </ModalProvider>
        </EnhancedAuthProvider>
      </NotificationProvider>
      </ThemeConfigProvider>
    </ThemeProvider>
  );
}

/** Toasts follow the active theme; a hardcoded "light" left them bright in dark mode. */
function ThemedToasts() {
  const { resolvedTheme } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}