"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { BellIcon } from "./icons";
import {
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BellAlertIcon,
  TrashIcon,
  CalendarIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Simple time ago function
const timeAgo = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task':
      return <CheckCircleIcon className="w-5 h-5 text-blue-600" />;
    case 'attendance':
      return <ClockIcon className="w-5 h-5 text-green-600" />;
    case 'team':
      return <UserGroupIcon className="w-5 h-5 text-purple-600" />;
    case 'employee':
      return <UserGroupIcon className="w-5 h-5 text-orange-600" />;
    case 'leave_request':
      return <CalendarIcon className="w-5 h-5 text-blue-500" />;
    case 'leave_approved':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'leave_rejected':
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    default:
      return <BellAlertIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
  }
};

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const {
    notifications,
    unreadCount,
    loading,
    permissionGranted,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Request notification permission on first interaction
  useEffect(() => {
    if (isOpen && !permissionGranted && 'Notification' in window) {
      requestPermission();
    }
  }, [isOpen, permissionGranted, requestPermission]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border border-gray-100 bg-[#F8FAFC] text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="View Notifications"
      >
        <span className="relative">
          <BellIcon />

          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-gray-2 dark:border-dark-3"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-white px-3.5 py-3 shadow-md dark:border-dark-3 dark:bg-gray-dark min-[350px]:min-w-[24rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            Notifications
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <>
                <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
                  {unreadCount} new
                </span>
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary hover:underline"
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <BellIcon className="mx-auto mb-2 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
          </div>
        ) : (
          <>
            <ul className="mb-3 max-h-[23rem] space-y-1.5 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id} role="menuitem" className="relative group">
                  <Link
                    href={notification.data?.url || notification.actionUrl || '#'}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3 transition-colors",
                      !notification.read && "bg-blue-50 dark:bg-blue-900/10"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type || 'general')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <strong className={cn(
                          "block text-sm font-medium text-dark dark:text-white",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </strong>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5"></span>
                        )}
                      </div>

                      <p className="text-sm text-dark-5 dark:text-dark-6 line-clamp-2 mt-0.5">
                        {notification.body || notification.message}
                      </p>

                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id!)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete notification"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </button>
                  </Link>
                </li>
              ))}
            </ul>

            {notifications.length >= 20 && (
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
              >
                See all notifications
              </Link>
            )}
          </>
        )}

        {/* Push Notification Permission Banner */}
        {!permissionGranted && 'Notification' in window && notifications.length > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
              Enable push notifications to stay updated
            </p>
            <button
              onClick={requestPermission}
              className="w-full text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

