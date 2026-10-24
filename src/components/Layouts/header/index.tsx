"use client";

import { useResponsive } from "@/hooks/use-responsive";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { PWAInstallButton } from "./pwa-install-button";
import { HeaderSearch } from "./search";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useModal } from "@/contexts/modal-context";

export function Header() {
  const { toggleSidebar, isMobile, isTablet } = useSidebarContext();
  const { device, isTouchDevice } = useResponsive();
  const { isModalOpen } = useModal();

  // Hide header when modal is open
  if (isModalOpen) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/60 bg-white/70 px-3 py-3 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#070C1C]/70 md:px-5 md:py-4 2xl:px-8">
      {/* Left: menu / mobile logo / page title */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={toggleSidebar}
          className={`
            rounded-lg border px-2 py-2 transition-colors
            dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A]
            ${(isMobile || isTablet) ? 'block' : 'hidden lg:hidden'}
            ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px] min-w-[36px]'}
          `}
          aria-label="Toggle Sidebar"
        >
          <MenuIcon />
        </button>

        {isMobile && (
          <Link
            href={"/"}
            className={`
              flex items-center justify-center
              max-[430px]:hidden min-[375px]:ml-1
              ${isTouchDevice ? 'min-h-[44px]' : ''}
            `}
          >
            <Image
              src={"/images/logo/logo-icon.svg"}
              width={32}
              height={32}
              alt="EdVentureHub Logo"
              className="h-8 w-8"
            />
          </Link>
        )}

        <div className={`${device.type === 'desktop' ? 'block' : 'hidden'} max-xl:hidden`}>
          <h1 className="text-lg font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            edVenture Admin Dashboard
          </p>
        </div>
      </div>

      {/* Center: global search */}
      <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
        <HeaderSearch />
      </div>
      <div className="flex-1 md:hidden" />

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <div className={isTouchDevice ? 'flex min-h-[44px] items-center' : ''}>
          <PWAInstallButton />
        </div>

        <div className={isTouchDevice ? 'flex min-h-[44px] items-center' : ''}>
          <ThemeToggleSwitch />
        </div>

        <div className={`${isTouchDevice ? 'flex min-h-[44px] items-center' : ''} hidden md:flex`}>
          <Notification />
        </div>

        <div className={`shrink-0 ${isTouchDevice ? 'flex min-h-[44px] items-center' : ''}`}>
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
