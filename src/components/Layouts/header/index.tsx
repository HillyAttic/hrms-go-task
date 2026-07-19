"use client";

import { useResponsive } from "@/hooks/use-responsive";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { PWAInstallButton } from "./pwa-install-button";
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] dark:border-stroke-dark dark:bg-gray-dark md:px-5 md:py-5 2xl:px-10">
      {/* Mobile/Tablet Menu Button */}
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

      {/* Mobile Logo */}
      {isMobile && (
        <Link 
          href={"/"} 
          className={`
            ml-2 flex items-center justify-center
            max-[430px]:hidden min-[375px]:ml-4
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

      {/* Desktop Title */}
      <div className={`
        ${device.type === 'desktop' ? 'block' : 'hidden'}
        max-xl:hidden
      `}>
        <h1 className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
          Dashboard
        </h1>
        <p className="font-medium text-sm text-dark-4 dark:text-dark-6">
          edVenture Admin Dashboard
        </p>
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
