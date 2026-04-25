import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/task-completions/batch
 * Fetch completion stats for multiple recurring tasks in a single request
 * Reduces N API calls to 1-2 batched calls
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { taskIds } = await request.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds array is required' },
        { status: 400 }
      );
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Firestore 'in' query has a limit of 10 items, so we need to batch
    const batchSize = 10;
    const batches: string[][] = [];

    for (let i = 0; i < taskIds.length; i += batchSize) {
      batches.push(taskIds.slice(i, i + batchSize));
    }

    // Fetch completions for all batches in parallel
    const allCompletions = await Promise.all(
      batches.map(async (batch) => {
        const snapshot = await adminDb
          .collection('task-completions')
          .where('recurringTaskId', 'in', batch)
          .get();

        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      })
    );

    // Flatten all completions
    const completions = allCompletions.flat();

    // Group completions by taskId and calculate stats
    const statsByTaskId: Record<string, {
      totalClients: number;
      completedClients: number;
      completionRate: number;
      completions: any[];
    }> = {};

    taskIds.forEach(taskId => {
      const taskCompletions = completions.filter(c => c.recurringTaskId === taskId);
      const completedCount = taskCompletions.filter(c => c.isCompleted).length;
      const totalCount = taskCompletions.length;

      statsByTaskId[taskId] = {
        totalClients: totalCount,
        completedClients: completedCount,
        completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
        completions: taskCompletions
      };
    });

    return NextResponse.json({
      success: true,
      stats: statsByTaskId,
      totalCompletions: completions.length
    });

  } catch (error) {
    console.error('[Batch Task Completions API] Error:', error);
    return handleApiError(error);
  }
});
