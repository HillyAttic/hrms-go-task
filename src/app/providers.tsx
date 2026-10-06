"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider, useTheme } from "next-themes";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth.context";
import { NotificationProvider } from "@/contexts/notification.context";
import { ModalProvider } from "@/contexts/modal-context";
import { NotificationPermissionPrompt } from "@/components/pwa/notification-permission-prompt";
import { IOSPWAPrompt } from "@/components/pwa/ios-pwa-prompt";
import { NotificationClickHandler } from "@/components/pwa/notification-click-handler";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/** Toasts must follow the active theme — a hardcoded "light" theme stays light in dark mode. */
function ThemedToastContainer() {
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <NotificationProvider>
        <EnhancedAuthProvider>
          <ModalProvider>
            <SidebarProvider>{children}</SidebarProvider>
            <NotificationPermissionPrompt />
            <IOSPWAPrompt />
            <NotificationClickHandler />
            <ThemedToastContainer />
          </ModalProvider>
        </EnhancedAuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}