/**
 * Attendance Admin Service
 * Server-side attendance operations using Firebase Admin SDK.
 * Use this in API routes instead of attendanceService (which uses the client SDK).
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const COLLECTION = 'attendance-records';

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeToDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value.toDate) return value.toDate();
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
}

function convertTimestamps(data: any, id: string) {
    return {
        id,
        ...data,
        clockIn: safeToDate(data.clockIn) ?? new Date(),
        clockOut: safeToDate(data.clockOut),
        breaks: (data.breaks ?? []).map((b: any) => ({
            ...b,
            startTime: safeToDate(b.startTime) ?? new Date(),
            endTime: safeToDate(b.endTime),
        })),
        createdAt: safeToDate(data.createdAt) ?? new Date(),
        updatedAt: safeToDate(data.updatedAt) ?? new Date(),
    };
}

function validateLocation(location: any) {
    if (!location) return undefined;
    // Defense in depth: reject placeholder payloads even if a buggy client sends them
    if (location.placeholder === true) return undefined;
    const lat = location.latitude ?? location.lat;
    const lng = location.longitude ?? location.lng;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        const result: any = { latitude: lat, longitude: lng };
        if (typeof location.accuracy === 'number' && !isNaN(location.accuracy)) {
            result.accuracy = location.accuracy;
        }
        return result;
    }
    return undefined;
}

function calculateWorkHours(clockIn: Date, clockOut: Date, breaks: any[]): number {
    const totalMs = clockOut.getTime() - clockIn.getTime();
    const breakMs = breaks.reduce((sum: number, b: any) => {
        if (b.startTime && b.endTime) {
            const start = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
            const end = b.endTime instanceof Date ? b.endTime : new Date(b.endTime);
            return sum + (end.getTime() - start.getTime());
        }
        return sum;
    }, 0);
    return Math.max(0, (totalMs - breakMs) / (1000 * 60 * 60));
}

function calculateOvertimeHours(totalHours: number, standardHours = 8): number {
    return Math.max(0, totalHours - standardHours);
}

function calculateRegularHours(totalHours: number, overtimeHours: number): number {
    return Math.max(0, totalHours - overtimeHours);
}

function calculateElapsedTime(clockIn: Date, breaks: any[]): number {
    const now = new Date();
    const totalMs = now.getTime() - clockIn.getTime();
    const breakMs = breaks.reduce((sum: number, b: any) => {
        if (b.startTime && b.endTime) {
            const start = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
            const end = b.endTime instanceof Date ? b.endTime : new Date(b.endTime);
            return sum + (end.getTime() - start.getTime());
        }
        if (b.startTime && !b.endTime) {
            const start = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
            return sum + (now.getTime() - start.getTime());
        }
        return sum;
    }, 0);
    return Math.max(0, (totalMs - breakMs) / 1000);
}

function calculateTotalBreakDuration(breaks: any[]): number {
    return breaks.reduce((sum: number, b: any) => {
        if (b.startTime && b.endTime) {
            const start = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
            const end = b.endTime instanceof Date ? b.endTime : new Date(b.endTime);
            return sum + (end.getTime() - start.getTime()) / 1000;
        }
        return sum;
    }, 0);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const attendanceAdminService = {
    /**
     * Check if employee has already clocked in today
     */
    async hasClockedInToday(employeeId: string): Promise<boolean> {
        // Use a 30-hour lookback window to safely catch clock-ins across timezones
        const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000);

        const snapshot = await adminDb
            .collection(COLLECTION)
            .where('employeeId', '==', employeeId)
            .where('clockIn', '>=', Timestamp.fromDate(cutoff))
            .get();

        if (snapshot.empty) return false;

        // Filter to ensure the record actually belongs to TODAY in the user's timezone (IST)
        const formatter = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = formatter.format(new Date());

        return snapshot.docs.some((doc) => {
            const data = doc.data();
            const clockIn = data.clockIn?.toDate ? data.clockIn.toDate() : new Date(data.clockIn);
            if (!clockIn || isNaN(clockIn.getTime())) return false;
            return formatter.format(clockIn) === todayStr;
        });
    },

    /**
     * Get current attendance status for an employee
     */
    async getCurrentStatus(employeeId: string) {
        // Use a 30-hour lookback window to safely catch clock-ins across timezones
        const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000);

        const snapshot = await adminDb
            .collection(COLLECTION)
            .where('employeeId', '==', employeeId)
            .where('clockIn', '>=', Timestamp.fromDate(cutoff))
            .get();

        // Filter to ensure the record actually belongs to TODAY in the user's timezone (IST)
        const formatter = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = formatter.format(new Date());

        const todayRecords = snapshot.docs
            .map((doc) => convertTimestamps(doc.data(), doc.id))
            .filter((record) => {
                const clockIn = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
                if (isNaN(clockIn.getTime())) return false;
                return formatter.format(clockIn) === todayStr;
            });

        const activeRecord = todayRecords.find((r) => !r.clockOut);

        if (!activeRecord) {
            return { isClockedIn: false, isOnBreak: false, elapsedTime: 0, breakDuration: 0 };
        }

        const isOnBreak = activeRecord.breaks.some((b: any) => !b.endTime);
        const breakStartTime = isOnBreak
            ? activeRecord.breaks.find((b: any) => !b.endTime)?.startTime
            : undefined;

        return {
            isClockedIn: true,
            clockInTime: activeRecord.clockIn,
            isOnBreak,
            breakStartTime,
            elapsedTime: calculateElapsedTime(activeRecord.clockIn, activeRecord.breaks),
            breakDuration: calculateTotalBreakDuration(activeRecord.breaks),
            currentRecordId: activeRecord.id,
        };
    },

    /**
     * Clock in an employee
     */
    async clockIn(data: {
        employeeId: string;
        employeeName: string;
        timestamp: Date;
        location?: any;
        notes?: string;
    }) {
        const alreadyClockedIn = await this.hasClockedInToday(data.employeeId);
        if (alreadyClockedIn) return null;

        const status = await this.getCurrentStatus(data.employeeId);
        if (status.isClockedIn) return null;

        const validatedLocation = validateLocation(data.location);
        const now = Timestamp.now();

        const record = {
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            clockIn: Timestamp.fromDate(data.timestamp),
            breaks: [],
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: 'active',
            location: validatedLocation ? { clockIn: validatedLocation } : null,
            notes: data.notes ? { clockIn: data.notes } : null,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await adminDb.collection(COLLECTION).add(record);
        const created = await docRef.get();
        return convertTimestamps(created.data()!, docRef.id);
    },

    /**
     * Clock out an employee
     */
    async clockOut(
        recordId: string,
        data: { timestamp: Date; location?: any; notes?: string }
    ) {
        const docRef = adminDb.collection(COLLECTION).doc(recordId);
        const doc = await docRef.get();

        if (!doc.exists) throw new Error('Attendance record not found');

        const record = convertTimestamps(doc.data()!, doc.id);

        if (record.clockOut) throw new Error('Employee is already clocked out');

        const totalHours = calculateWorkHours(record.clockIn, data.timestamp, record.breaks);
        const overtimeHours = calculateOvertimeHours(totalHours);
        const regularHours = calculateRegularHours(totalHours, overtimeHours);
        const validatedLocation = validateLocation(data.location);

        const updates: any = {
            clockOut: Timestamp.fromDate(data.timestamp),
            totalHours,
            regularHours,
            overtimeHours,
            status: 'completed',
            updatedAt: Timestamp.now(),
        };

        if (validatedLocation) {
            updates.location = {
                ...(record.location || {}),
                clockOut: validatedLocation,
            };
        }

        if (data.notes) {
            updates.notes = { ...(record.notes || {}), clockOut: data.notes };
        }

        await docRef.update(updates);
        const updated = await docRef.get();
        return convertTimestamps(updated.data()!, docRef.id);
    },

    /**
     * Start a break
     */
    async startBreak(recordId: string) {
        const docRef = adminDb.collection(COLLECTION).doc(recordId);
        const doc = await docRef.get();

        if (!doc.exists) throw new Error('Attendance record not found');

        const record = convertTimestamps(doc.data()!, doc.id);

        if (record.clockOut) throw new Error('Cannot start break after clocking out');
        if (record.breaks.some((b: any) => !b.endTime)) throw new Error('Employee is already on break');

        const newBreak = {
            id: `break_${Date.now()}`,
            startTime: Timestamp.now(),
            duration: 0,
        };

        await docRef.update({
            breaks: [...record.breaks.map((b: any) => ({
                ...b,
                startTime: b.startTime instanceof Date ? Timestamp.fromDate(b.startTime) : b.startTime,
                endTime: b.endTime instanceof Date ? Timestamp.fromDate(b.endTime) : (b.endTime ?? null),
            })), newBreak],
            updatedAt: Timestamp.now(),
        });

        const updated = await docRef.get();
        return convertTimestamps(updated.data()!, docRef.id);
    },

    /**
     * End a break
     */
    async endBreak(recordId: string) {
        const docRef = adminDb.collection(COLLECTION).doc(recordId);
        const doc = await docRef.get();

        if (!doc.exists) throw new Error('Attendance record not found');

        const record = convertTimestamps(doc.data()!, doc.id);

        const breakIndex = record.breaks.findIndex((b: any) => !b.endTime);
        if (breakIndex === -1) throw new Error('No active break found');

        const endTime = new Date();
        const updatedBreaks = record.breaks.map((b: any, i: number) => {
            if (i === breakIndex) {
                const startTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
                return {
                    ...b,
                    startTime: Timestamp.fromDate(startTime),
                    endTime: Timestamp.fromDate(endTime),
                    duration: (endTime.getTime() - startTime.getTime()) / 1000,
                };
            }
            return {
                ...b,
                startTime: b.startTime instanceof Date ? Timestamp.fromDate(b.startTime) : b.startTime,
                endTime: b.endTime instanceof Date ? Timestamp.fromDate(b.endTime) : (b.endTime ?? null),
            };
        });

        await docRef.update({ breaks: updatedBreaks, updatedAt: Timestamp.now() });
        const updated = await docRef.get();
        return convertTimestamps(updated.data()!, docRef.id);
    },

    /**
     * Delete an attendance record
     */
    async deleteAttendanceRecord(id: string): Promise<void> {
        await adminDb.collection(COLLECTION).doc(id).delete();
    },

    /**
     * Cleanup duplicate attendance records for an employee
     */
    async cleanupDuplicateRecords(employeeId: string): Promise<void> {
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where('employeeId', '==', employeeId)
            .orderBy('clockIn', 'asc')
            .get();

        const records = snapshot.docs.map((doc) => convertTimestamps(doc.data(), doc.id));

        // Group by local date (Asia/Kolkata) to avoid deleting valid late-night/early-morning shifts
        const byDate = new Map<string, typeof records>();
        for (const record of records) {
            const d = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
            if (isNaN(d.getTime())) continue;
            
            // Format to YYYY-MM-DD using IST timezone
            const formatter = new Intl.DateTimeFormat('en-CA', { 
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const key = formatter.format(d);
            
            if (!byDate.has(key)) byDate.set(key, []);
            byDate.get(key)!.push(record);
        }

        for (const [dateKey, dayRecords] of byDate.entries()) {
            if (dayRecords.length > 1) {
                const sorted = dayRecords.sort((a, b) => {
                    const at = (a.clockIn instanceof Date ? a.clockIn : new Date(a.clockIn)).getTime();
                    const bt = (b.clockIn instanceof Date ? b.clockIn : new Date(b.clockIn)).getTime();
                    return at - bt;
                });
                
                // Keep the FIRST record, delete subsequent ones
                for (let i = 1; i < sorted.length; i++) {
                    console.warn(`Deleting duplicate attendance record: ${sorted[i].id} for date ${dateKey}`);
                    await adminDb.collection(COLLECTION).doc(sorted[i].id).delete();
                }
            }
        }
    },
};
