import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/auth/profile - Get current user profile
 * Uses Admin SDK to bypass Firestore security rules.
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const data = userDoc.data()!;
    const userProfile = {
      uid: userDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };

    return NextResponse.json({ success: true, data: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
});

/**
 * PUT /api/auth/profile - Update current user profile
 * Uses Admin SDK to bypass Firestore security rules.
 */
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { displayName, department, phoneNumber } = body;

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const updates: any = {
      displayName: displayName.trim(),
      updatedAt: Timestamp.now(),
    };

    if (department !== undefined) updates.department = department?.trim() ?? null;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber?.trim() ?? null;

    await adminDb.collection('users').doc(userId).update(updates);

    const updatedDoc = await adminDb.collection('users').doc(userId).get();
    const data = updatedDoc.data()!;
    const updatedProfile = {
      uid: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
});

/**
 * POST /api/auth/profile - Upload profile photo
 * Uses Firebase Admin Storage to upload image and updates user's photoURL in Firestore.
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 });
    }

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueName = `profile-${userId}-${Date.now()}.${fileExtension}`;

    // Get bucket - explicitly specify bucket name
    const bucket = adminStorage.bucket('hrms-82eb5.firebasestorage.app');

    // Create file reference
    const fileRef = bucket.file(`profile-photos/${uniqueName}`);

    // Upload to Firebase Storage
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Get signed URL for public access
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Far future date
    });

    // Update user's photoURL in Firestore
    await adminDb.collection('users').doc(userId).update({
      photoURL: signedUrl,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      data: { photoURL: signedUrl },
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to upload profile photo: ${errorMessage}` }, { status: 500 });
  }
});