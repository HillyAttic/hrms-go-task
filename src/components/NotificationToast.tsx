import React, { useEffect, useRef } from 'react';
import { useNotification } from '@/contexts/notification.context';

const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-yellow-500 text-black';
    case 'info':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-muted text-white';
  }
};

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📢';
  }
};

export const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotification();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close notification when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Don't close if clicking inside a notification
        const notificationElements = containerRef.current.querySelectorAll('.notification-item');
        if (!Array.from(notificationElements).some(el => el.contains(event.target as Node))) {
          // Close the most recent notification
          if (notifications.length > 0) {
            removeNotification(notifications[notifications.length - 1].id);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifications, removeNotification]);

  return (
    <div 
      ref={containerRef}
      className="fixed top-4 right-4 z-50 space-y-2"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-item ${getNotificationStyle(notification.type)} p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out max-w-sm min-w-max flex items-start animate-fadeIn`}
          onClick={() => removeNotification(notification.id)}
        >
          <span className="mr-2 text-lg">{getIcon(notification.type)}</span>
          <span className="flex-1">{notification.message}</span>
          <button 
            className="ml-2 text-lg hover:opacity-70 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};