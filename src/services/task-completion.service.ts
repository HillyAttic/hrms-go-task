/**
 * Task Completion Service
 * Handles client-specific completion tracking for recurring tasks
 */

import { createFirebaseService } from './firebase.service';

export interface ClientTaskCompletion {
  id?: string;
  recurringTaskId: string;
  clientId: string;
  monthKey: string; // Format: "YYYY-MM" (e.g., "2025-04")
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  arnNumber?: string; // 15-digit ARN number
  arnName?: string; // Name of person who provided ARN
  remark?: string; // Remark text
  remarkBy?: string; // Name of person who provided remark
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the Firebase service instance for task completions
const taskCompletionFirebaseService = createFirebaseService<ClientTaskCompletion>('task-completions');

/**
 * Task Completion Service API
 */
export const taskCompletionService = {
  /**
   * Get all completions for a specific recurring task
   */
  async getByTaskId(recurringTaskId: string): Promise<ClientTaskCompletion[]> {
    return taskCompletionFirebaseService.getAll({
      filters: [
        {
          field: 'recurringTaskId',
          operator: '==',
          value: recurringTaskId,
        },
      ],
      forceServerFetch: true, // Always fetch from server to avoid cache issues
    });
  },

  /**
   * Get completions for a specific client and task
   */
  async getByClientAndTask(clientId: string, recurringTaskId: string): Promise<ClientTaskCompletion[]> {
    return taskCompletionFirebaseService.getAll({
      filters: [
        {
          field: 'clientId',
          operator: '==',
          value: clientId,
        },
        {
          field: 'recurringTaskId',
          operator: '==',
          value: recurringTaskId,
        },
      ],
      forceServerFetch: true, // Always fetch from server to avoid cache issues
    });
  },

  /**
   * Get completion for a specific client, task, and month
   */
  async getByClientTaskMonth(
    clientId: string,
    recurringTaskId: string,
    monthKey: string
  ): Promise<ClientTaskCompletion | null> {
    const completions = await taskCompletionFirebaseService.getAll({
      filters: [
        {
          field: 'clientId',
          operator: '==',
          value: clientId,
        },
        {
          field: 'recurringTaskId',
          operator: '==',
          value: recurringTaskId,
        },
        {
          field: 'monthKey',
          operator: '==',
          value: monthKey,
        },
      ],
      forceServerFetch: true, // Always fetch from server to avoid cache issues
    });

    return completions.length > 0 ? completions[0] : null;
  },

  /**
   * Mark a task as completed for a specific client and month
   */
  async markCompleted(
    recurringTaskId: string,
    clientId: string,
    monthKey: string,
    completedBy: string,
    arnNumber?: string,
    arnName?: string
  ): Promise<ClientTaskCompletion> {
    // Check if completion already exists
    const existing = await this.getByClientTaskMonth(clientId, recurringTaskId, monthKey);

    if (existing && existing.id) {
      // Update existing completion
      return taskCompletionFirebaseService.update(existing.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy,
        arnNumber,
        arnName,
      });
    } else {
      // Create new completion
      return taskCompletionFirebaseService.create({
        recurringTaskId,
        clientId,
        monthKey,
        isCompleted: true,
        completedAt: new Date(),
        completedBy,
        arnNumber,
        arnName,
      });
    }
  },

  /**
   * Mark a task as incomplete for a specific client and month
   */
  async markIncomplete(
    recurringTaskId: string,
    clientId: string,
    monthKey: string
  ): Promise<void> {
    const existing = await this.getByClientTaskMonth(clientId, recurringTaskId, monthKey);

    if (existing && existing.id) {
      await taskCompletionFirebaseService.delete(existing.id);
    }
  },

  /**
   * Toggle completion status
   */
  async toggleCompletion(
    recurringTaskId: string,
    clientId: string,
    monthKey: string,
    completedBy: string,
    arnNumber?: string,
    arnName?: string
  ): Promise<ClientTaskCompletion | null> {
    const existing = await this.getByClientTaskMonth(clientId, recurringTaskId, monthKey);

    if (existing && existing.id) {
      if (existing.isCompleted) {
        // Mark as incomplete (delete)
        await this.markIncomplete(recurringTaskId, clientId, monthKey);
        return null;
      } else {
        // Mark as completed
        return this.markCompleted(recurringTaskId, clientId, monthKey, completedBy, arnNumber, arnName);
      }
    } else {
      // Create new completion
      return this.markCompleted(recurringTaskId, clientId, monthKey, completedBy, arnNumber, arnName);
    }
  },

  /**
   * Get completion statistics for a task
   */
  async getTaskStats(recurringTaskId: string, totalClients: number, totalMonths: number) {
    const completions = await this.getByTaskId(recurringTaskId);
    const completed = completions.filter(c => c.isCompleted).length;
    const total = totalClients * totalMonths;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      percentage,
    };
  },

  /**
   * Bulk update completions for a task
   */
  async bulkUpdate(
    recurringTaskId: string,
    completions: Array<{ 
      clientId: string; 
      monthKey: string; 
      isCompleted: boolean;
      arnNumber?: string;
      arnName?: string;
    }>,
    completedBy: string
  ): Promise<void> {
    const promises = completions.map(({ clientId, monthKey, isCompleted, arnNumber, arnName }) => {
      if (isCompleted) {
        return this.markCompleted(recurringTaskId, clientId, monthKey, completedBy, arnNumber, arnName);
      } else {
        return this.markIncomplete(recurringTaskId, clientId, monthKey);
      }
    });

    await Promise.all(promises);
  },
};
