/**
 * Attendance Service
 * Handles all attendance-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceStats,
  CurrentAttendanceStatus,
  ClockInData,
  ClockOutData,
  BreakRecord,
  DateRange,
  TeamMemberAttendanceStatus,
} from '@/types/attendance.types';
import {
  calculateWorkHours,
  calculateOvertimeHours,
  calculateRegularHours,
  calculateTotalBreakDuration,
  calculateElapsedTime,
} from '@/utils/time-calculations';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';

// Create the Firebase service instance for attendance records
const attendanceFirebaseService =
  createFirebaseService<AttendanceRecord>('attendance-records');

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestamps(record: any): AttendanceRecord {
  // Helper to safely convert to Date
  const safeToDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value.toDate) return value.toDate();
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return {
    ...record,
    clockIn: safeToDate(record.clockIn) || new Date(),
    clockOut: safeToDate(record.clockOut),
    breaks: record.breaks?.map((b: any) => ({
      ...b,
      startTime: safeToDate(b.startTime) || new Date(),
      endTime: safeToDate(b.endTime),
    })) || [],
    createdAt: safeToDate(record.createdAt) || new Date(),
    updatedAt: safeToDate(record.updatedAt) || new Date(),
  };
}

/**
 * Attendance Service API
 */
// Helper function to validate and clean location data
function validateLocationData(location: any) {
  console.log('validateLocationData called with:', location);
  
  if (!location) {
    console.log('validateLocationData: location is null/undefined');
    return undefined;
  }
  
  // Check if both latitude and longitude are valid numbers
  if (location.latitude !== undefined && 
      location.longitude !== undefined && 
      typeof location.latitude === 'number' && 
      typeof location.longitude === 'number' &&
      !isNaN(location.latitude) && 
      !isNaN(location.longitude)) {
    const result: any = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    
    console.log('validateLocationData: Valid latitude/longitude format:', result);
    
    // Only add accuracy if it's a valid number
    if (location.accuracy !== undefined && typeof location.accuracy === 'number' && !isNaN(location.accuracy)) {
      result.accuracy = location.accuracy;
    }

    // Pass through placeholder flag
    if (location.placeholder === true) {
      result.placeholder = true;
    }

    return result;
  }

  // Additional check for location object with lat/lng properties
  if (location.lat !== undefined &&
      location.lng !== undefined && 
      typeof location.lat === 'number' && 
      typeof location.lng === 'number' &&
      !isNaN(location.lat) && 
      !isNaN(location.lng)) {
    const result: any = {
      latitude: location.lat,
      longitude: location.lng,
    };
    
    console.log('validateLocationData: Valid lat/lng format, converted to:', result);
    
    // Only add accuracy if it's a valid number
    if (location.accuracy !== undefined && typeof location.accuracy === 'number' && !isNaN(location.accuracy)) {
      result.accuracy = location.accuracy;
    }

    // Pass through placeholder flag
    if (location.placeholder === true) {
      result.placeholder = true;
    }

    return result;
  }

  console.log('validateLocationData: Invalid location format, returning undefined');
  return undefined;
}

export const attendanceService = {
  /**
   * Clock in an employee
   */
  async clockIn(data: ClockInData & { employeeId: string; employeeName: string }): Promise<AttendanceRecord | null> {
    try {
      console.log('Clock in attempt for employee:', data.employeeId);
      console.log('Clock in data received:', JSON.stringify(data, null, 2));
      console.log('Location data received:', data.location);
      
      // Check if user has already clocked in today (regardless of current status)
      const hasAlreadyClockedIn = await this.hasClockedInToday(data.employeeId);
      if (hasAlreadyClockedIn) {
        console.log('Employee has already clocked in today:', data.employeeId);
        // Return null to indicate already clocked in today
        return null;
      }
      
      // Also check if employee is already clocked in (active session)
      const currentStatus = await this.getCurrentStatus(data.employeeId);
      if (currentStatus.isClockedIn) {
        // Instead of throwing, return null to indicate already clocked in
        return null;
      }

      const validatedLocation = validateLocationData(data.location);
      console.log('Validated location data:', validatedLocation);
      
      const record: Omit<AttendanceRecord, 'id'> = {
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        clockIn: data.timestamp,
        breaks: [],
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        status: 'active',
        location: validatedLocation ? { clockIn: validatedLocation } : undefined,
        notes: data.notes ? { clockIn: data.notes } : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Creating attendance record with location:', record.location);
      
      return await attendanceFirebaseService.create(record);
    } catch (error) {
      console.error('Error in clockIn service:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      throw error;
    }
  },

  /**
   * Clock out an employee
   */
  async clockOut(recordId: string, data: ClockOutData): Promise<AttendanceRecord> {
    try {
      console.log('Clock out attempt for record:', recordId);
      console.log('Clock out data received:', JSON.stringify(data, null, 2));
      console.log('Clock out location data received:', data.location);
      
      let record = await attendanceFirebaseService.getById(recordId);
      if (!record) {
        throw new Error('Attendance record not found');
      }
      
      // Convert timestamps in the retrieved record
      record = convertTimestamps(record);

      if (record.clockOut) {
        throw new Error('Employee is already clocked out');
      }

      // Calculate hours
      const totalHours = calculateWorkHours(record.clockIn, data.timestamp, record.breaks);
      const overtimeHours = calculateOvertimeHours(totalHours);
      const regularHours = calculateRegularHours(totalHours, overtimeHours);

      const validatedClockOutLocation = validateLocationData(data.location);
      console.log('Validated clock out location:', validatedClockOutLocation);
      
      const updates: Partial<AttendanceRecord> = {
        clockOut: data.timestamp,
        totalHours,
        regularHours,
        overtimeHours,
        status: 'completed',
        location: record.location ? {
          ...record.location,
          clockOut: validatedClockOutLocation,
        } : validatedClockOutLocation ? {
          clockOut: validatedClockOutLocation
        } : undefined,
        notes: {
          ...record.notes,
          clockOut: data.notes,
        },
      };

      console.log('Updating attendance record with location:', updates.location);
      
      return await attendanceFirebaseService.update(recordId, updates);
    } catch (error) {
      console.error('Error in clockOut service:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      throw error;
    }
  },

  /**
   * Start a break
   */
  async startBreak(recordId: string): Promise<AttendanceRecord> {
    let record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }
    
    // Convert timestamps in the retrieved record
    record = convertTimestamps(record);

    if (record.clockOut) {
      throw new Error('Cannot start break after clocking out');
    }

    // Check if already on break
    const onBreak = record.breaks.some((b) => !b.endTime);
    if (onBreak) {
      throw new Error('Employee is already on break');
    }

    const newBreak: BreakRecord = {
      id: `break_${Date.now()}`,
      startTime: new Date(),
      duration: 0,
    };

    const updates: Partial<AttendanceRecord> = {
      breaks: [...record.breaks, newBreak],
    };

    return attendanceFirebaseService.update(recordId, updates);
  },

  /**
   * End a break
   */
  async endBreak(recordId: string): Promise<AttendanceRecord> {
    let record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }
    
    // Convert timestamps in the retrieved record
    record = convertTimestamps(record);

    // Find the active break
    const breakIndex = record.breaks.findIndex((b) => !b.endTime);
    if (breakIndex === -1) {
      throw new Error('No active break found');
    }

    const endTime = new Date();
    const updatedBreaks = [...record.breaks];
    updatedBreaks[breakIndex] = {
      ...updatedBreaks[breakIndex],
      endTime,
      duration: (endTime.getTime() - updatedBreaks[breakIndex].startTime.getTime()) / 1000,
    };

    const updates: Partial<AttendanceRecord> = {
      breaks: updatedBreaks,
    };

    return attendanceFirebaseService.update(recordId, updates);
  },

  /**
   * Get current attendance status for an employee
   */
  async getCurrentStatus(employeeId: string): Promise<CurrentAttendanceStatus> {
    console.log('getCurrentStatus called for employee:', employeeId);
    
    // Get today's start of day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    console.log('Querying records from:', startOfDay);

    // Query for ALL records today (not just active ones)
    let records = await attendanceFirebaseService.getAll({
      filters: [
        { field: 'employeeId', operator: '==', value: employeeId },
        { field: 'clockIn', operator: '>=', value: Timestamp.fromDate(startOfDay) },
      ],
    });
    
    console.log('Found records (all statuses):', records.length);
    
    // Convert timestamps in the retrieved records
    records = records.map(record => convertTimestamps(record));
    
    // Filter records that are from today (client-side filtering for end-of-day)
    const todayRecords = records.filter(record => {
      const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const recordStartOfDay = new Date(recordDate);
      recordStartOfDay.setHours(0, 0, 0, 0);
      return recordStartOfDay.getTime() === today.getTime();
    });

    console.log('Today records after filtering:', todayRecords.length);
    
    // Find the most recent record without a clock out (active session)
    const activeRecord = todayRecords.find(record => !record.clockOut);

    if (!activeRecord) {
      console.log('No active record found (no record without clockOut)');
      return {
        isClockedIn: false,
        isOnBreak: false,
        elapsedTime: 0,
        breakDuration: 0,
      };
    }

    console.log('Active record found:', activeRecord.id, 'Status:', activeRecord.status, 'ClockOut:', activeRecord.clockOut);
    
    const isOnBreak = activeRecord.breaks.some((b) => !b.endTime);
    const breakStartTime = isOnBreak
      ? activeRecord.breaks.find((b) => !b.endTime)?.startTime
      : undefined;

    const status = {
      isClockedIn: true,
      clockInTime: activeRecord.clockIn,
      isOnBreak,
      breakStartTime,
      elapsedTime: calculateElapsedTime(activeRecord.clockIn, activeRecord.breaks),
      breakDuration: calculateTotalBreakDuration(activeRecord.breaks),
      currentRecordId: activeRecord.id,
    };
    
    console.log('Returning status:', status);
    return status;
  },

  /**
   * Get attendance records with filters
   */
  async getAttendanceRecords(filters: AttendanceFilters): Promise<AttendanceRecord[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add employee filter
    if (filters.employeeId) {
      options.filters!.push({
        field: 'employeeId',
        operator: '==',
        value: filters.employeeId,
      });
    }

    // Add date range filters
    if (filters.startDate) {
      options.filters!.push({
        field: 'clockIn',
        operator: '>=',
        value: Timestamp.fromDate(filters.startDate),
      });
    }

    // Add status filter
    if (filters.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add pagination
    if (filters.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'clockIn';
    options.orderDirection = 'desc';

    let records = await attendanceFirebaseService.getAll(options);
    
    // Convert timestamps in the retrieved records
    records = records.map(record => convertTimestamps(record));
    
    // Apply end date filter client-side if provided to avoid composite index requirements
    if (filters.endDate !== undefined) {
      records = records.filter(record => {
        const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
        return recordDate <= filters.endDate!;
      });
    }
    
    return records;
  },

  /**
   * Get a single attendance record
   */
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    const record = await attendanceFirebaseService.getById(id);
    return record ? convertTimestamps(record) : null;
  },

  /**
   * Update an attendance record (manual edit)
   */
  async updateAttendanceRecord(
    id: string,
    data: Partial<AttendanceRecord>,
    editedBy: string,
    editReason: string
  ): Promise<AttendanceRecord> {
    const updates: Partial<AttendanceRecord> = {
      ...data,
      status: 'edited',
      editedBy,
      editReason,
    };

    // Recalculate hours if clock in/out or breaks changed
    if (data.clockIn || data.clockOut || data.breaks) {
      const record = await attendanceFirebaseService.getById(id);
      if (record) {
        // Convert timestamps in the retrieved record
        const convertedRecord = convertTimestamps(record);
        const clockIn = data.clockIn || convertedRecord.clockIn;
        const clockOut = data.clockOut || convertedRecord.clockOut;
        const breaks = data.breaks || convertedRecord.breaks;

        if (clockOut) {
          const totalHours = calculateWorkHours(clockIn, clockOut, breaks);
          const overtimeHours = calculateOvertimeHours(totalHours);
          const regularHours = calculateRegularHours(totalHours, overtimeHours);

          updates.totalHours = totalHours;
          updates.regularHours = regularHours;
          updates.overtimeHours = overtimeHours;
        }
      }
    }

    return attendanceFirebaseService.update(id, updates);
  },

  /**
   * Delete an attendance record
   */
  async deleteAttendanceRecord(id: string): Promise<void> {
    return attendanceFirebaseService.delete(id);
  },

  /**
   * Get attendance statistics for an employee
   */
  async getAttendanceStats(employeeId: string, period: DateRange): Promise<AttendanceStats> {
    const records = await this.getAttendanceRecords({
      employeeId,
      startDate: period.start,
      // endDate filter is handled client-side to avoid composite index requirements
      status: 'completed',
    });
    
    // Apply end date filter client-side
    const filteredRecords = records.filter(record => {
      const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
      return recordDate <= period.end;
    });

    const totalDays = filteredRecords.length;
    const totalHours = filteredRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const overtimeHours = filteredRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;

    // Calculate attendance rate (assuming 5-day work week)
    const daysBetween = Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedDays = Math.floor(daysBetween / 7) * 5 + (daysBetween % 7);
    const attendanceRate = expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0;

    return {
      totalDays,
      presentDays: totalDays,
      absentDays: Math.max(0, expectedDays - totalDays),
      leaveDays: 0, // Will be calculated from leave records
      totalHours,
      averageHours,
      overtimeHours,
      attendanceRate,
      punctualityRate: 100, // Will be calculated based on shift data
    };
  },

  /**
   * Get team attendance status for a specific date
   */
  async getTeamAttendanceStatus(
    teamId: string,
    date: Date
  ): Promise<TeamMemberAttendanceStatus[]> {
    // This would need to integrate with the employee service
    // For now, return empty array
    return [];
  },

  /**
   * Subscribe to real-time attendance status updates
   */
  subscribeToStatus(
    employeeId: string,
    callback: (status: CurrentAttendanceStatus) => void
  ): Unsubscribe {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'attendance-records'),
      where('employeeId', '==', employeeId),
      where('status', '==', 'active'),
      where('clockIn', '>=', Timestamp.fromDate(today))
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback({
          isClockedIn: false,
          isOnBreak: false,
          elapsedTime: 0,
          breakDuration: 0,
        });
        return;
      }

      const doc = snapshot.docs[0];
      const record = convertTimestamps({ id: doc.id, ...doc.data() });
      const isOnBreak = record.breaks.some((b) => !b.endTime);
      const breakStartTime = isOnBreak
        ? record.breaks.find((b) => !b.endTime)?.startTime
        : undefined;

      callback({
        isClockedIn: true,
        clockInTime: record.clockIn,
        isOnBreak,
        breakStartTime,
        elapsedTime: calculateElapsedTime(record.clockIn, record.breaks),
        breakDuration: calculateTotalBreakDuration(record.breaks),
        currentRecordId: record.id,
      });
    });
  },

  /**
   * Auto clock out employees at midnight
   */
  async autoClockOut(autoClockOutTime: string = '23:59'): Promise<void> {
    const [hours, minutes] = autoClockOutTime.split(':').map(Number);
    const clockOutTime = new Date();
    clockOutTime.setHours(hours, minutes, 59, 999);

    const activeRecords = await attendanceFirebaseService.getAll({
      filters: [{ field: 'status', operator: '==', value: 'active' }],
    });

    for (const record of activeRecords) {
      await this.clockOut(record.id!, {
        timestamp: clockOutTime,
        notes: 'Auto clock out',
      });
    }
  },

  /**
   * Check if employee has already clocked in today (regardless of clock out status)
   */
  async hasClockedInToday(employeeId: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const records = await attendanceFirebaseService.getAll({
      filters: [
        { field: 'employeeId', operator: '==', value: employeeId },
        { field: 'clockIn', operator: '>=', value: Timestamp.fromDate(startOfDay) },
      ],
    });
    
    // Convert timestamps in the retrieved records
    const convertedRecords = records.map(record => convertTimestamps(record));
    
    // Filter records that are from today
    const todayRecords = convertedRecords.filter(record => {
      const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const recordStartOfDay = new Date(recordDate);
      recordStartOfDay.setHours(0, 0, 0, 0);
      return recordStartOfDay.getTime() === today.getTime();
    });
    
    return todayRecords.length > 0;
  },

  /**
   * Cleanup duplicate attendance records for an employee
   */
  async cleanupDuplicateRecords(employeeId: string): Promise<void> {
    console.log('Starting cleanup for employee:', employeeId);
    
    // Get all records for the employee
    const allRecords = await attendanceFirebaseService.getAll({
      filters: [
        { field: 'employeeId', operator: '==', value: employeeId }
      ],
      orderByField: 'clockIn',
      orderDirection: 'asc'
    });
    
    console.log(`Found ${allRecords.length} total records for cleanup`);
    
    // Convert timestamps in the retrieved records
    const convertedRecords = allRecords.map(record => convertTimestamps(record));
    
    // Group records by date
    const recordsByDate = new Map<string, typeof convertedRecords>();
    
    convertedRecords.forEach(record => {
      try {
        const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
        
        // Skip records with invalid dates
        if (isNaN(recordDate.getTime())) {
          console.warn(`Skipping record ${record.id} with invalid date`);
          return;
        }
        
        const dateKey = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!recordsByDate.has(dateKey)) {
          recordsByDate.set(dateKey, []);
        }
        recordsByDate.get(dateKey)!.push(record);
      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
      }
    });
    
    console.log(`Grouped records into ${recordsByDate.size} dates`);
    
    // For each date, keep the first record and delete the rest
    for (const [date, records] of recordsByDate.entries()) {
      if (records.length > 1) {
        console.log(`Found ${records.length} records for ${date}, keeping first and deleting rest`);
        
        // Sort by clock in time to keep the earliest record
        const sortedRecords = records.sort((a, b) => {
          const aTime = (a.clockIn instanceof Date ? a.clockIn : new Date(a.clockIn)).getTime();
          const bTime = (b.clockIn instanceof Date ? b.clockIn : new Date(b.clockIn)).getTime();
          return aTime - bTime;
        });
        
        // Keep the first record, delete the rest
        for (let i = 1; i < sortedRecords.length; i++) {
          const recordToDelete = sortedRecords[i];
          console.log(`Deleting duplicate record: ${recordToDelete.id}`);
          try {
            await attendanceFirebaseService.delete(recordToDelete.id!);
            console.log(`Successfully deleted duplicate record: ${recordToDelete.id}`);
          } catch (error) {
            console.error(`Error deleting record ${recordToDelete.id}:`, error);
          }
        }
      }
    }
    
    console.log('Cleanup completed');
  },
};
