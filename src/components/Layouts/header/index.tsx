"use client";

import { useResponsive } from "@/hooks/use-responsive";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { PWAInstallButton } from "./pwa-install-button";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useModal } from "@/contexts/modal-context";
import { useThemeConfig } from "@/contexts/theme-config.context";

/** Derive a readable page title from the route, e.g. /admin/leave-approvals -> "Leave Approvals". */
function titleFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "Dashboard";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Header() {
  const { toggleSidebar, isMobile, isTablet } = useSidebarContext();
  const { device, isTouchDevice } = useResponsive();
  const { isModalOpen } = useModal();
  const { config } = useThemeConfig();
  const pathname = usePathname();

  const pageTitle = titleFromPath(pathname);

  return (
    <header
      className={`
        sticky top-0 z-30 flex items-center justify-between border-b-2 border-border
        bg-card px-4 py-4 transition-transform duration-200
        md:px-6 2xl:px-10
      `}
      style={{ minHeight: 'var(--header-height, 70px)' }}
      aria-hidden={isModalOpen}
    >
      {/* Mobile/Tablet Menu Button */}
      <button
        onClick={toggleSidebar}
        className={`
          rounded-md border-2 border-border bg-card p-2 text-foreground transition-colors hover:bg-muted
          focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45
          ${(isMobile || isTablet) ? 'block' : 'hidden lg:hidden'}
          ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px] min-w-[36px]'}
        `}
        aria-label="Toggle navigation"
      >
        <MenuIcon />
      </button>

      {/* Mobile Logo */}
      {isMobile && (
        <Link
          href={"/dashboard"}
          className={`
            ml-2 flex items-center justify-center
            max-[430px]:hidden min-[375px]:ml-4
            ${isTouchDevice ? 'min-h-[44px]' : ''}
          `}
        >
          <Image
            src={config.logoIcon || "/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt="EdVentureHub"
            className="h-8 w-8"
          />
        </Link>
      )}

      {/* Desktop page title — derived from the route so it is never stale */}
      <div className={`${device.type === 'desktop' ? 'block' : 'hidden'} max-xl:hidden`}>
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h1>
      </div>

      {/* Header Actions */}
      <div className={`
        flex flex-1 items-center justify-end gap-2
        ${device.type === 'mobile' ? 'min-[375px]:gap-3' : 'min-[375px]:gap-4'}
      `}>

        {/* PWA Install Button (Mobile Only) */}
        <div className={isTouchDevice ? 'min-h-[44px] flex items-center' : ''}>
          <PWAInstallButton />
        </div>

        {/* Theme Toggle */}
        <div className={isTouchDevice ? 'min-h-[44px] flex items-center' : ''}>
          <ThemeToggleSwitch />
        </div>

        {/* Notifications - Hidden on mobile, shown on tablet and desktop */}
        <div className={`${isTouchDevice ? 'min-h-[44px] flex items-center' : ''} md:flex hidden`}>
          <Notification />
        </div>

        {/* User Info */}
        <div className={`
          shrink-0
          ${isTouchDevice ? 'min-h-[44px] flex items-center' : ''}
        `}>
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
