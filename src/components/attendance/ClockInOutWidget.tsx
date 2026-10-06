'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CurrentAttendanceStatus,
  ClockInData,
  ClockOutData,
  AttendanceRecord,
} from '@/types/attendance.types';
import { formatDuration } from '@/utils/time-calculations';
import { Clock, Coffee, LogIn, LogOut } from 'lucide-react';

interface ClockInOutWidgetProps {
  currentStatus: CurrentAttendanceStatus | null;
  onClockIn: (data: ClockInData) => Promise<AttendanceRecord | null>;
  onClockOut: (data: ClockOutData) => Promise<void>;
  onStartBreak: () => Promise<void>;
  onEndBreak: () => Promise<void>;
  loading: boolean;
}

export function ClockInOutWidget({
  currentStatus,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  loading,
}: ClockInOutWidgetProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!currentStatus?.isClockedIn) {
      setElapsedTime(0);
      setBreakTime(0);
      return;
    }

    const interval = setInterval(() => {
      if (currentStatus.clockInTime) {
        const now = new Date();
        const totalSeconds =
          (now.getTime() - currentStatus.clockInTime.getTime()) / 1000;
        
        // Calculate break time
        let currentBreakTime = currentStatus.breakDuration;
        if (currentStatus.isOnBreak && currentStatus.breakStartTime) {
          const breakElapsed =
            (now.getTime() - currentStatus.breakStartTime.getTime()) / 1000;
          currentBreakTime += breakElapsed;
        }

        setElapsedTime(totalSeconds - currentBreakTime);
        setBreakTime(currentBreakTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStatus]);

  const handleClockIn = async () => {
    try {
      console.log('Attempting to clock in...');
      const result = await onClockIn({
        timestamp: new Date(),
      });
      
      console.log('Clock in result:', result);
      
      // If result is null, it means user was already clocked in
      if (result === null) {
        // Optionally show a notification that user is already clocked in
        console.log('User was already clocked in');
      }
    } catch (error) {
      console.error('Clock in error:', error);
      console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
  };

  const handleClockOut = async () => {
    try {
      await onClockOut({
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Clock out error:', error);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Status Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-semibold">
              {currentStatus?.isClockedIn
                ? currentStatus.isOnBreak
                  ? 'On Break'
                  : 'Clocked In'
                : 'Not Clocked In'}
            </h3>
          </div>

          {currentStatus?.isClockedIn && (
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">
                {formatDuration(elapsedTime)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Work Time
              </div>
              {breakTime > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Break: {formatDuration(breakTime)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          {!currentStatus?.isClockedIn ? (
            <Button
              onClick={handleClockIn}
              disabled={loading}
              size="lg"
              className="h-14 text-lg"
              aria-label="Clock in"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Clock In
            </Button>
          ) : (
            <>
              {!currentStatus.isOnBreak ? (
                <>
                  <Button
                    onClick={onStartBreak}
                    disabled={loading}
                    variant="outline"
                    size="lg"
                    className="h-14 text-lg"
                    aria-label="Start break"
                  >
                    <Coffee className="mr-2 h-5 w-5" />
                    Start Break
                  </Button>
                  <Button
                    onClick={handleClockOut}
                    disabled={loading}
                    size="lg"
                    className="h-14 text-lg"
                    aria-label="Clock out"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onEndBreak}
                  disabled={loading}
                  size="lg"
                  className="h-14 text-lg"
                  aria-label="End break"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  End Break
                </Button>
              )}
            </>
          )}
        </div>

        {/* Clock In Time */}
        {currentStatus?.clockInTime && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Clocked in at{' '}
            {currentStatus.clockInTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
