"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChecklistIcon, LogOutIcon, UserIcon } from "./icons";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const auth = useEnhancedAuth();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      // Just sign out - let onAuthStateChanged handle navigation
      await auth.signOut();
      // Navigation will happen automatically via AuthWrapper
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await auth.refreshUserData();
      console.log('User data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state if auth is not ready
  if (auth.loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="max-[1024px]:sr-only">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Default user info if not authenticated
  const displayName = auth.userProfile?.displayName || auth.user?.email || "User";
  const displayEmail = auth.user?.email || "user@example.com";
  const userInitials = displayName.charAt(0).toUpperCase();
  
  // Determine user role based on auth context which has the proper role hierarchy
  let userRole = "User";
  if (auth.claims?.role) {
    userRole = auth.claims.role.charAt(0).toUpperCase() + auth.claims.role.slice(1);
  } else if (auth.userProfile?.role) {
    userRole = auth.userProfile.role.charAt(0).toUpperCase() + auth.userProfile.role.slice(1);
  }

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          {auth.userProfile?.photoURL ? (
            <Image
              src={auth.userProfile.photoURL}
              className="size-12 rounded-full object-cover"
              alt={`Avatar of ${displayName}`}
              role="presentation"
              width={48}
              height={48}
            />
          ) : (
            <div className="size-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold shadow-sm">
              {userInitials}
            </div>
          )}
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{displayName}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          {auth.userProfile?.photoURL ? (
            <Image
              src={auth.userProfile.photoURL}
              className="size-12 rounded-full object-cover"
              alt={`Avatar for ${displayName}`}
              role="presentation"
              width={48}
              height={48}
            />
          ) : (
            <div className="size-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {userInitials}
            </div>
          )}

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {displayName}
            </div>

            <div className="leading-none text-gray-6">{displayEmail}</div>
            
            <div className="text-xs text-primary font-medium">
              {userRole}
            </div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white cursor-pointer"
          >
            <UserIcon />
        
            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href="/my-tasks"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white cursor-pointer"
          >
            <ChecklistIcon />

            <span className="mr-auto text-base font-medium">Personal Tasks</span>
          </Link>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hidden md:flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>

            <span className="text-base font-medium">
              {isRefreshing ? 'Refreshing...' : 'Refresh profile'}
            </span>
          </button>
        </div>
        
        <hr className="border-[#E8E8E8] dark:border-dark-3" />
        
        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOutIcon />
        
            <span className="text-base font-medium">
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
