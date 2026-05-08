import { adminDb, adminMessaging } from '@/lib/firebase-admin';

/**
 * Send push notification to user(s) - FAST direct FCM delivery
 * 
 * This function:
 * 1. Sends FCM push notification DIRECTLY (no Cloud Function needed)
 * 2. Stores notification in Firestore for history (in parallel)
 * 
 * This eliminates the Cloud Function cold start delay (3-15 seconds)
 * making notifications nearly instant.
 */
export interface SendNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  data?: {
    url?: string;
    type?: string;
    taskId?: string;
    [key: string]: any;
  };
}

export interface SendNotificationResult {
  sent: Array<{ userId: string; messageId: string; deliveryTime: string }>;
  errors: Array<{ userId: string; error: string }>;
  totalTime: number;
}

export async function sendNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const startTime = Date.now();
  const { userIds, title, body, data } = params;

  console.log('[sendNotification] Request received:', {
    userIds,
    title,
    body,
    dataKeys: data ? Object.keys(data) : [],
  });

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds array is required');
  }

  if (!title || !body) {
    throw new Error('title and body are required');
  }

  const results: Array<{ userId: string; messageId: string; deliveryTime: string }> = [];
  const errors: Array<{ userId: string; error: string }> = [];

  // Process all users in parallel for maximum speed
  const promises = userIds.map(async (userId: string) => {
    try {
      console.log(`[sendNotification] Processing user: ${userId}`);
      
      // Get user's FCM token
      const tokenDoc = await adminDb.collection('fcmTokens').doc(userId).get();

      if (!tokenDoc.exists) {
        console.log(`[sendNotification] ❌ No FCM token found for user ${userId}`);
        errors.push({ userId, error: 'No FCM token' });

        // Still store notification in Firestore (without sending push)
        await adminDb.collection('notifications').add({
          userId,
          title,
          body,
          message: body,
          type: (data?.type as any) || 'system',
          actionUrl: data?.url,
          metadata: {
            taskId: data?.taskId,
          },
          data: data || {},
          read: false,
          sent: false,
          error: 'No FCM token',
          createdAt: new Date(),
        });
        return;
      }

      const fcmToken = tokenDoc.data()?.token;
      console.log(`[sendNotification] ✅ FCM token found for user ${userId}`);

      // Send FCM and store in Firestore IN PARALLEL
      const [fcmResult, firestoreResult] = await Promise.allSettled([
        // 1. Send FCM push notification directly
        // CRITICAL FIX: Use data-only payload for web (service worker handles display)
        // This ensures notifications work when app is closed/locked on Android
        adminMessaging.send({
          // Data payload - service worker will display this
          data: {
            title: title,
            body: body,
            icon: '/images/logo/logo-icon.svg',
            badge: '/images/logo/logo-icon.svg',
            url: data?.url || '/notifications',
            type: data?.type || 'general',
            taskId: data?.taskId || '',
            notificationId: `jpco-${Date.now()}`,
            timestamp: Date.now().toString(),
          },
          token: fcmToken,
          
          // Web push configuration (Chrome, Firefox, Edge)
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '86400', // 24 hours
            },
            fcmOptions: {
              link: data?.url || '/notifications',
            },
          },
          
          // Android configuration
          android: {
            priority: 'high' as const,
            // Use data-only for Android to ensure service worker handles it
            data: {
              title: title,
              body: body,
              icon: '/images/logo/logo-icon.svg',
              click_action: data?.url || '/notifications',
            },
          },
          
          // iOS configuration (requires notification payload)
          apns: {
            headers: {
              'apns-priority': '10',
              'apns-push-type': 'alert',
            },
            payload: {
              aps: {
                alert: {
                  title: title,
                  body: body,
                },
                sound: 'default',
                badge: 1,
                'mutable-content': 1,
              },
              // Custom data for iOS
              url: data?.url || '/notifications',
              type: data?.type || 'general',
              taskId: data?.taskId || '',
            },
          },
        }),

        // 2. Store notification in Firestore for history/UI
        adminDb.collection('notifications').add({
          userId,
          fcmToken,
          title,
          body,
          message: body,
          type: (data?.type as any) || 'system',
          actionUrl: data?.url,
          metadata: {
            taskId: data?.taskId,
          },
          data: data || {},
          read: false,
          sent: true,
          sentAt: new Date(),
          sentDirect: true, // Flag: sent directly, not via Cloud Function
          createdAt: new Date(),
        }),
      ]);

      if (fcmResult.status === 'fulfilled') {
        console.log(`[sendNotification] ✅ FCM sent to ${userId} in ${Date.now() - startTime}ms`);
        results.push({
          userId,
          messageId: fcmResult.value,
          deliveryTime: `${Date.now() - startTime}ms`,
        });
      } else {
        const error = fcmResult.reason;
        console.error(`[sendNotification] ❌ FCM failed for ${userId}:`, error.message);

        // Handle invalid/expired tokens
        if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
          // Clean up expired token
          await adminDb.collection('fcmTokens').doc(userId).delete();
          console.log(`[sendNotification] 🗑️ Cleaned up expired token for ${userId}`);
        }

        errors.push({ userId, error: error.message });
      }

      if (firestoreResult.status === 'rejected') {
        console.error(`[sendNotification] Firestore write failed for ${userId}:`, firestoreResult.reason);
      }

    } catch (error: any) {
      console.error(`[sendNotification] Error processing notification for ${userId}:`, error);
      errors.push({ userId, error: error.message });
    }
  });

  // Wait for all notifications to be processed
  await Promise.all(promises);

  const totalTime = Date.now() - startTime;
  console.log(`[sendNotification] 📬 Batch completed in ${totalTime}ms (${results.length} sent, ${errors.length} errors)`);

  return {
    sent: results,
    errors,
    totalTime,
  };
}
