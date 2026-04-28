import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/notifications?userId=xxx
 * Fetch notifications for a user (server-side, bypasses Firestore rules)
 *
 * POST /api/notifications
 * Mark notification as read
 *
 * @deprecated This endpoint is deprecated as of 2026-04-28.
 * The notification system now uses real-time Firestore listeners via client SDK.
 * This route is kept for 1 sprint as a fallback and will be removed after monitoring.
 */
export async function GET(request: NextRequest) {
    console.warn('[DEPRECATED] /api/notifications GET endpoint - migrate to client-side onSnapshot listeners');

    try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

        const userId = request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Check if Firebase Admin is properly configured
        if (!adminDb) {
            console.warn('Firebase Admin not configured. Returning empty notifications.');
            return NextResponse.json({ notifications: [] }, { status: 200 });
        }

        const snapshot = await adminDb
            .collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const notifications = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                title: data.title || 'Notification',
                body: data.body || data.message || '',
                read: data.read || false,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                data: data.data || {},
                type: data.type || data.data?.type || 'general',
                actionUrl: data.data?.url || data.actionUrl || '/notifications',
            };
        });

        return NextResponse.json({ notifications }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);

        // If it's an index error, try without orderBy
        if (error.code === 9 || error.message?.includes('index')) {
            try {
                const userId = request.nextUrl.searchParams.get('userId')!;
                const snapshot = await adminDb
                    .collection('notifications')
                    .where('userId', '==', userId)
                    .limit(50)
                    .get();

                const notifications = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        userId: data.userId,
                        title: data.title || 'Notification',
                        body: data.body || data.message || '',
                        read: data.read || false,
                        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        data: data.data || {},
                        type: data.type || data.data?.type || 'general',
                        actionUrl: data.data?.url || data.actionUrl || '/notifications',
                    };
                });

                // Sort client-side
                notifications.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                return NextResponse.json({ notifications }, { status: 200 });
            } catch (fallbackError: any) {
                console.error('Fallback query also failed:', fallbackError);
                return NextResponse.json(
                    { error: 'Failed to fetch notifications', details: fallbackError.message },
                    { status: 500 }
                );
            }
        }

        // Return empty array instead of 500 error if credentials aren't configured
        console.warn('Returning empty notifications due to error:', error.message);
        return NextResponse.json({ notifications: [] }, { status: 200 });
    }
}

/**
 * POST /api/notifications
 * Mark notification as read or mark all as read
 *
 * @deprecated This endpoint is deprecated as of 2026-04-28.
 * The notification system now uses direct Firestore writes via client SDK.
 * This route is kept for 1 sprint as a fallback and will be removed after monitoring.
 */
export async function POST(request: NextRequest) {
    console.warn('[DEPRECATED] /api/notifications POST endpoint - migrate to direct Firestore writes');

    try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

        const { action, notificationId, userId } = await request.json();

        if (action === 'markAsRead' && notificationId) {
            await adminDb.collection('notifications').doc(notificationId).update({
                read: true,
                readAt: new Date(),
            });
            return NextResponse.json({ message: 'Marked as read' }, { status: 200 });
        }

        if (action === 'markAllAsRead' && userId) {
            const snapshot = await adminDb
                .collection('notifications')
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();

            const batch = adminDb.batch();
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { read: true, readAt: new Date() });
            });
            await batch.commit();

            return NextResponse.json(
                { message: `Marked ${snapshot.size} notifications as read` },
                { status: 200 }
            );
        }

        if (action === 'delete' && notificationId) {
            await adminDb.collection('notifications').doc(notificationId).delete();
            return NextResponse.json({ message: 'Deleted' }, { status: 200 });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('Error updating notification:', error);
        return NextResponse.json(
            { error: 'Failed to update notification', details: error.message },
            { status: 500 }
        );
    }
}
