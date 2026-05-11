import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/notifications/debug
 * Debug endpoint to check notification setup
 *
 * POST /api/notifications/debug
 * Test: write a leave notification to verify Firestore write works
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Admin only');
    }

    const userId = authResult.user.uid;

    // Write a test leave notification directly using sendNotification
    const { sendNotification } = await import('@/lib/notifications/send-notification');

    console.log(`[debug] ========== TEST LEAVE NOTIFICATION START ==========`);
    console.log(`[debug] Writing test leave notification for user: ${userId}`);

    const result = await sendNotification({
      userIds: [userId],
      title: 'Test Leave Request',
      body: 'This is a test leave notification to verify Firestore write works.',
      data: { url: '/attendance', type: 'leave_request' },
    });

    console.log(`[debug] Result:`, {
      sent: result.sent.length,
      errors: result.errors.length,
      totalTime: result.totalTime,
    });
    console.log(`[debug] ========== TEST LEAVE NOTIFICATION END ==========`);

    return NextResponse.json({
      message: 'Test leave notification sent',
      result: {
        sent: result.sent,
        errors: result.errors,
        totalTime: `${result.totalTime}ms`,
      },
    });
  } catch (error: any) {
    console.error('[debug] Test notification error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userId = authResult.user.uid;
    const userRole = authResult.user.claims.role;

    console.log('[Debug] Checking notification setup for user:', userId);

    // Check if user has FCM token
    const tokenDoc = await adminDb.collection('fcmTokens').doc(userId).get();
    const hasToken = tokenDoc.exists;
    const tokenData = tokenDoc.exists ? tokenDoc.data() : null;

    // Get all FCM tokens (admin only)
    let allTokens = null;
    if (userRole === 'admin') {
      const tokensSnapshot = await adminDb.collection('fcmTokens').get();
      allTokens = tokensSnapshot.docs.map(doc => ({
        userId: doc.id,
        platform: doc.data().platform,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || 'unknown',
        hasToken: !!doc.data().token,
      }));
    }

    // Check recent notifications (increased limit to 50)
    const notificationsSnapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const recentNotifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      type: doc.data().type || 'unknown',
      sent: doc.data().sent,
      sentDirect: doc.data().sentDirect || false,
      error: doc.data().error,
      read: doc.data().read,
      actionUrl: doc.data().actionUrl,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown',
    }));

    // Count notifications by type
    const typeCounts: Record<string, number> = {};
    recentNotifications.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    // Check for leave-specific notifications across ALL users (admin only)
    let leaveNotificationsGlobal: any = null;
    if (userRole === 'admin') {
      try {
        const leaveNotifSnapshot = await adminDb
          .collection('notifications')
          .where('type', 'in', ['leave_request', 'leave_approved', 'leave_rejected'])
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();

        leaveNotificationsGlobal = leaveNotifSnapshot.docs.map(doc => ({
          id: doc.id,
          userId: doc.data().userId,
          title: doc.data().title,
          type: doc.data().type,
          sent: doc.data().sent,
          sentDirect: doc.data().sentDirect || false,
          read: doc.data().read,
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown',
        }));
      } catch (indexError: any) {
        // Fallback: query without orderBy (no index required)
        try {
          const leaveNotifSnapshot = await adminDb
            .collection('notifications')
            .where('type', 'in', ['leave_request', 'leave_approved', 'leave_rejected'])
            .limit(10)
            .get();

          leaveNotificationsGlobal = leaveNotifSnapshot.docs.map(doc => ({
            id: doc.id,
            userId: doc.data().userId,
            title: doc.data().title,
            type: doc.data().type,
            sent: doc.data().sent,
            sentDirect: doc.data().sentDirect || false,
            read: doc.data().read,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown',
          }));
        } catch {
          leaveNotificationsGlobal = { error: indexError.message };
        }
      }
    }

    const debugInfo = {
      user: {
        id: userId,
        role: userRole,
      },
      fcmToken: {
        registered: hasToken,
        platform: tokenData?.platform || 'none',
        lastUpdated: tokenData?.updatedAt?.toDate?.()?.toISOString() || 'never',
      },
      notificationStats: {
        total: recentNotifications.length,
        typeCounts,
      },
      recentNotifications,
      leaveNotificationsGlobal: userRole === 'admin' ? leaveNotificationsGlobal : 'Admin only',
      allTokens: userRole === 'admin' ? allTokens : 'Admin only',
      vapidKeyConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerPath: '/firebase-messaging-sw.js',
    };

    console.log('[Debug] Notification setup:', debugInfo);

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Debug check failed', details: error.message },
      { status: 500 }
    );
  }
}
