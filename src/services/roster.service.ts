/**
 * Roster Service
 * Handles all roster-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import {
  RosterEntry,
  RosterFilters,
  MonthlyRosterView,
  EmployeeRosterData,
  RosterActivity,
  getDaysInMonth,
} from '@/types/roster.types';
import { Timestamp } from 'firebase/firestore';

// Create the Firebase service instance for roster entries
const rosterFirebaseService = createFirebaseService<RosterEntry>('rosters');

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestamps(entry: any): RosterEntry {
  const safeToDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value.toDate) return value.toDate();
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return {
    ...entry,
    startDate: entry.startDate ? safeToDate(entry.startDate) : undefined,
    endDate: entry.endDate ? safeToDate(entry.endDate) : undefined,
    timeStart: entry.timeStart ? safeToDate(entry.timeStart) : undefined,
    timeEnd: entry.timeEnd ? safeToDate(entry.timeEnd) : undefined,
    createdAt: safeToDate(entry.createdAt) || new Date(),
    updatedAt: safeToDate(entry.updatedAt) || new Date(),
  };
}

/**
 * Calculate task duration in hours
 */
function calculateDuration(start?: Date | string, end?: Date | string): number | undefined {
  if (!start || !end) return undefined;
  const s = start instanceof Date ? start : new Date(start as string);
  const e = end instanceof Date ? end : new Date(end as string);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return undefined;
  return (e.getTime() - s.getTime()) / (1000 * 60 * 60);
}

/**
 * Get task color based on duration
 */
export function getTaskColor(task: RosterEntry): string {
  const duration = task.durationHours || calculateDuration(
    task.timeStart || task.startDate,
    task.timeEnd || task.endDate
  );
  
  if (!duration) return 'green'; // Not assigned
  if (duration < 8) return 'yellow'; // Short task
  return 'orange'; // Long task
}

/**
 * Roster Service API
 */
export const rosterService = {
  /**
   * Create a new roster entry
   */
  async createRosterEntry(data: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<RosterEntry> {
    // Validate based on task type
    if (data.taskType === 'multi') {
      if (!data.startDate || !data.endDate) {
        throw new Error('Start date and end date are required for multi tasks');
      }
      if (data.startDate > data.endDate) {
        throw new Error('Start date must be before end date');
      }
      // Check for overlapping entries for the same user
      const overlapping = await this.checkOverlap(data.userId, data.startDate, data.endDate);
      if (overlapping) {
        throw new Error('This schedule overlaps with an existing entry');
      }
    } else if (data.taskType === 'single') {
      if (!data.timeStart || !data.timeEnd) {
        throw new Error('Time start and time end are required for single tasks');
      }
      if (data.timeStart > data.timeEnd) {
        throw new Error('Start time must be before end time');
      }
      // Calculate duration and task date
      data.durationHours = calculateDuration(data.timeStart, data.timeEnd);
      data.taskDate = data.timeStart.toISOString().split('T')[0];
    }

    const entry: Omit<RosterEntry, 'id'> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await rosterFirebaseService.create(entry);
  },

  /**
   * Update a roster entry
   */
  async updateRosterEntry(id: string, data: Partial<RosterEntry>): Promise<RosterEntry> {
    const existing = await rosterFirebaseService.getById(id);
    if (!existing) {
      throw new Error('Roster entry not found');
    }

    const convertedExisting = convertTimestamps(existing);
    
    // Validate based on task type
    if (convertedExisting.taskType === 'multi') {
      if (data.startDate || data.endDate) {
        const startDate = data.startDate || convertedExisting.startDate!;
        const endDate = data.endDate || convertedExisting.endDate!;

        if (startDate > endDate) {
          throw new Error('Start date must be before end date');
        }

        // Check for overlapping entries (excluding current entry)
        const overlapping = await this.checkOverlap(
          convertedExisting.userId,
          startDate,
          endDate,
          id
        );
        if (overlapping) {
          throw new Error('This schedule overlaps with an existing entry');
        }
      }
    } else if (convertedExisting.taskType === 'single') {
      if (data.timeStart || data.timeEnd) {
        const timeStart = data.timeStart || convertedExisting.timeStart!;
        const timeEnd = data.timeEnd || convertedExisting.timeEnd!;

        if (timeStart > timeEnd) {
          throw new Error('Start time must be before end time');
        }

        // Recalculate duration and task date
        data.durationHours = calculateDuration(timeStart, timeEnd);
        data.taskDate = timeStart.toISOString().split('T')[0];
      }
    }

    const updates: Partial<RosterEntry> = {
      ...data,
      updatedAt: new Date(),
    };

    return await rosterFirebaseService.update(id, updates);
  },

  /**
   * Delete a roster entry
   */
  async deleteRosterEntry(id: string): Promise<void> {
    return await rosterFirebaseService.delete(id);
  },

  /**
   * Get roster entries with filters
   */
  async getRosterEntries(filters: RosterFilters): Promise<RosterEntry[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add user filter
    if (filters.userId) {
      options.filters!.push({
        field: 'userId',
        operator: '==',
        value: filters.userId,
      });
    }

    // Note: We can't filter by month/year in Firestore for single tasks
    // because they don't have these fields. We'll filter client-side instead.

    // Get all entries for the user
    let entries = await rosterFirebaseService.getAll(options);

    // Convert timestamps
    entries = entries.map(entry => convertTimestamps(entry));

    // Apply month/year filter client-side
    if (filters.month !== undefined && filters.year !== undefined) {
      entries = entries.filter(entry => {
        if (entry.taskType === 'multi') {
          // For multi tasks, check month and year fields
          return entry.month === filters.month && entry.year === filters.year;
        } else if (entry.taskType === 'single' && entry.timeStart) {
          // For single tasks, check if timeStart is in the specified month/year
          const taskDate = new Date(entry.timeStart);
          return taskDate.getMonth() + 1 === filters.month && taskDate.getFullYear() === filters.year;
        }
        return false;
      });
    }

    // Apply date range filters client-side
    if (filters.startDate) {
      entries = entries.filter(entry => {
        const startDate = entry.startDate || entry.timeStart;
        return startDate && startDate >= filters.startDate!;
      });
    }

    if (filters.endDate) {
      entries = entries.filter(entry => {
        const endDate = entry.endDate || entry.timeEnd;
        return endDate && endDate <= filters.endDate!;
      });
    }

    // Sort by start date/time
    entries.sort((a, b) => {
      const aStart = a.startDate || a.timeStart;
      const bStart = b.startDate || b.timeStart;
      if (!aStart || !bStart) return 0;
      return aStart.getTime() - bStart.getTime();
    });

    return entries;
  },

  /**
   * Get a single roster entry
   */
  async getRosterEntry(id: string): Promise<RosterEntry | null> {
    const entry = await rosterFirebaseService.getById(id);
    return entry ? convertTimestamps(entry) : null;
  },

  /**
   * Get monthly roster view for all employees (Admin/Manager)
   */
  async getMonthlyRosterView(month: number, year: number, userIds?: string[]): Promise<MonthlyRosterView> {
    // Calculate the date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month at end of day
    
    // Get all roster entries without ordering (since single tasks use timeStart, not startDate)
    // We'll sort client-side after fetching
    const allEntries = await rosterFirebaseService.getAll({});
    
    // Convert timestamps
    let entries = allEntries.map(entry => convertTimestamps(entry));
    
    // Filter entries that overlap with the current month
    entries = entries.filter(entry => {
      if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
        const entryStart = new Date(entry.startDate);
        const entryEnd = new Date(entry.endDate);
        return entryStart <= endOfMonth && entryEnd >= startOfMonth;
      } else if (entry.taskType === 'single' && entry.timeStart) {
        const taskStart = new Date(entry.timeStart);
        return taskStart >= startOfMonth && taskStart <= endOfMonth;
      }
      return false;
    });

    // Filter by user IDs if provided
    if (userIds && userIds.length > 0) {
      entries = entries.filter(entry => userIds.includes(entry.userId));
    }

    // Group entries by user
    const employeeMap = new Map<string, EmployeeRosterData>();

    entries.forEach(entry => {
      if (!employeeMap.has(entry.userId)) {
        employeeMap.set(entry.userId, {
          userId: entry.userId,
          userName: entry.userName,
          activities: [],
        });
      }

      const employee = employeeMap.get(entry.userId)!;
      
      if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
        // Calculate the start and end day within the current month
        const entryStart = new Date(entry.startDate);
        const entryEnd = new Date(entry.endDate);
        
        // Clamp the dates to the current month
        const displayStart = entryStart < startOfMonth ? startOfMonth : entryStart;
        const displayEnd = entryEnd > endOfMonth ? endOfMonth : entryEnd;
        
        employee.activities.push({
          id: entry.id!,
          taskType: entry.taskType,
          activityName: entry.activityName,
          startDate: entry.startDate,
          endDate: entry.endDate,
          startDay: displayStart.getUTCDate(),
          endDay: displayEnd.getUTCDate(),
          notes: entry.notes,
        });
      } else if (entry.taskType === 'single' && entry.timeStart && entry.timeEnd) {
        const taskStart = new Date(entry.timeStart);
        const taskEnd = new Date(entry.timeEnd);
        
        employee.activities.push({
          id: entry.id!,
          taskType: entry.taskType,
          clientName: entry.clientName,
          taskDetail: entry.taskDetail,
          startDate: entry.timeStart,
          endDate: entry.timeEnd,
          startDay: taskStart.getUTCDate(),
          endDay: taskEnd.getUTCDate(),
        });
      }
    });

    return {
      month,
      year,
      employees: Array.from(employeeMap.values()),
    };
  },

  /**
   * Get user's calendar events
   */
  async getUserCalendarEvents(userId: string, month: number, year: number): Promise<RosterEntry[]> {
    // Calculate the date range for the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month at end of day
    
    // Get all entries for this user
    const allEntries = await this.getRosterEntries({ userId });
    
    // Filter entries that overlap with the current month
    return allEntries.filter(entry => {
      if (entry.taskType === 'multi') {
        const entryStart = entry.startDate!;
        const entryEnd = entry.endDate!;
        return entryStart <= endOfMonth && entryEnd >= startOfMonth;
      } else {
        // Single tasks - check if timeStart is in the month
        const taskStart = entry.timeStart!;
        return taskStart >= startOfMonth && taskStart <= endOfMonth;
      }
    });
  },

  /**
   * Get tasks for a specific date
   */
  async getTasksForDate(userId: string, date: Date): Promise<RosterEntry[]> {
    const allEntries = await this.getRosterEntries({ userId });
    
    return allEntries.filter(entry => {
      if (entry.taskType === 'multi') {
        const entryStart = new Date(entry.startDate!);
        entryStart.setHours(0, 0, 0, 0);
        const entryEnd = new Date(entry.endDate!);
        entryEnd.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= entryStart && checkDate <= entryEnd;
      } else {
        const taskStart = new Date(entry.timeStart!);
        taskStart.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return taskStart.getTime() === checkDate.getTime();
      }
    });
  },

  /**
   * Check for overlapping roster entries
   */
  async checkOverlap(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<boolean> {
    const entries = await this.getRosterEntries({ userId });

    return entries.some(entry => {
      // Skip the entry being updated
      if (excludeId && entry.id === excludeId) {
        return false;
      }

      // Only check overlap for multi tasks with date ranges
      if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
        return (
          (startDate >= entry.startDate && startDate <= entry.endDate) ||
          (endDate >= entry.startDate && endDate <= entry.endDate) ||
          (startDate <= entry.startDate && endDate >= entry.endDate)
        );
      }
      
      return false;
    });
  },

  /**
   * Get roster entries for a date range (for calendar view)
   */
  async getRosterEntriesForDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RosterEntry[]> {
    return await this.getRosterEntries({
      userId,
      startDate,
      endDate,
    });
  },

  /**
   * Bulk create roster entries
   */
  async bulkCreateRosterEntries(entries: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<RosterEntry[]> {
    const created: RosterEntry[] = [];

    for (const entry of entries) {
      try {
        const result = await this.createRosterEntry(entry);
        created.push(result);
      } catch (error) {
        console.error('Error creating roster entry:', error);
        // Continue with other entries
      }
    }

    return created;
  },
};
