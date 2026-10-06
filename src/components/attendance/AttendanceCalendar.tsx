'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { CalendarDay } from '@/types/attendance.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttendanceCalendarProps {
  month: Date;
  days: CalendarDay[];
  onDateClick: (date: Date) => void;
  onMonthChange: (month: Date) => void;
}

export function AttendanceCalendar({
  month,
  days,
  onDateClick,
  onMonthChange,
}: AttendanceCalendarProps) {
  const getDayColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'leave':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'holiday':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'weekend':
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      default:
        return 'hover:bg-gray-100';
    }
  };

  const previousMonth = () => {
    const newMonth = new Date(month);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const nextMonth = () => {
    const newMonth = new Date(month);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 p-2">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => onDateClick(day.date)}
            className={`p-2 text-sm rounded-md transition-colors ${getDayColor(day.status)}`}
          >
            <div>{day.date.getDate()}</div>
            {day.hours !== undefined && (
              <div className="text-xs">{day.hours.toFixed(1)}h</div>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}          
