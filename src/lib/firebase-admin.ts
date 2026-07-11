import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK initialization for Next.js server-side code
 * 
 * Uses environment variable FIREBASE_SERVICE_ACCOUNT_KEY which should contain
 * the full JSON service account key as a string.
 * 
 * If not available, falls back to default credentials (works in Cloud Functions,
 * GCP environments, and local dev with GOOGLE_APPLICATION_CREDENTIALS set).
 */
function initAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Try to use service account key from environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'hrms-82eb5',
                storageBucket: 'hrms-82eb5.firebasestorage.app',
            });
        } catch (error) {
            console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
        }
    }

    // Fallback: try individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || 'hrms-82eb5';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            projectId,
            storageBucket: 'hrms-82eb5.firebasestorage.app',
        });
    }

    // Last fallback: default credentials (works in GCP environments)
    console.warn('No Firebase Admin credentials found. Using default credentials.');
    return admin.initializeApp({
        projectId,
        storageBucket: 'hrms-82eb5.firebasestorage.app',
    });
}

export const adminApp = initAdmin();
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
export const adminMessaging = admin.messaging(adminApp);
export const adminStorage = admin.storage(adminApp);

export default admin;
