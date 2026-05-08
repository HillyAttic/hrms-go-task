import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  body?: string;
  type: 'task' | 'attendance' | 'team' | 'employee' | 'system' | 'leave_request' | 'leave_approved' | 'leave_rejected';
  read: boolean;
  actionUrl?: string;
  data?: {
    url?: string;
    type?: string;
    taskId?: string;
  };
  metadata?: {
    taskId?: string;
    employeeId?: string;
    teamId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  readAt?: Date;
}

class NotificationService {
  private collectionName = 'notifications';

  /**
   * Get notifications for a specific user
   */
  async getUserNotifications(
    userId: string,
    limitCount: number = 20,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate(),
      })) as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          readAt: doc.data().readAt?.toDate(),
        })) as Notification[];

        callback(notifications);
      },
      (error) => {
        console.error('Notification snapshot error:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  }

  /**
   * Get user's FCM token from Firestore
   * Returns the token or null if not found
   */
  private async getUserFCMToken(userId: string): Promise<string | null> {
    try {
      const tokenDoc = await getDoc(doc(db, 'fcmTokens', userId));
      if (tokenDoc.exists()) {
        return tokenDoc.data().token || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting FCM token for user:', userId, error);
      return null;
    }
  }

  /**
   * Create a new notification
   * 
   * This writes to the 'notifications' collection in Firestore.
   * The Cloud Function `sendPushNotification` triggers on document creation
   * and sends the actual FCM push message.
   * 
   * IMPORTANT: We include the fcmToken in the document so the Cloud Function
   * can send the push notification. If no fcmToken is found, the Cloud Function
   * will also try to look up the token from the 'fcmTokens' collection.
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    try {
      // Retrieve the user's FCM token to include in the notification document
      const fcmToken = await this.getUserFCMToken(notification.userId);

      const notificationData: Record<string, any> = {
        ...notification,
        // Map 'message' to 'body' for the Cloud Function
        body: notification.message,
        title: notification.title,
        // Include FCM token so Cloud Function can send push notification
        fcmToken: fcmToken || null,
        // Include data fields for the push notification payload
        data: {
          url: notification.actionUrl || '/notifications',
          type: notification.type || 'general',
          taskId: notification.metadata?.taskId || '',
        },
        sent: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.collectionName), notificationData);

      console.log('Notification created with id:', docRef.id, 'fcmToken present:', !!fcmToken);

      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Helper: Create task notification
   */
  async notifyTaskAssigned(userId: string, taskTitle: string, taskId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'New Task Assigned',
      message: `You have been assigned to: ${taskTitle}`,
      type: 'task',
      read: false,
      actionUrl: `/tasks/${taskId}`,
      metadata: { taskId },
    });
  }

  /**
   * Helper: Create attendance notification
   */
  async notifyAttendanceReminder(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: 'Attendance Reminder',
      message: 'Don\'t forget to clock in for today',
      type: 'attendance',
      read: false,
      actionUrl: '/attendance',
    });
  }

  /**
   * Helper: Create team notification
   */
  async notifyTeamUpdate(userId: string, teamName: string, message: string, teamId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: `Team Update: ${teamName}`,
      message,
      type: 'team',
      read: false,
      actionUrl: `/teams`,
      metadata: { teamId },
    });
  }
}

export const notificationService = new NotificationService();
