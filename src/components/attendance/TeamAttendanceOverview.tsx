'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamMemberAttendanceStatus } from '@/types/attendance.types';
import { Clock, Coffee, Plane, AlertCircle } from 'lucide-react';

interface TeamAttendanceOverviewProps {
  teamMembers: TeamMemberAttendanceStatus[];
  onEmployeeClick: (employeeId: string) => void;
  loading?: boolean;
}

export function TeamAttendanceOverview({
  teamMembers,
  onEmployeeClick,
  loading,
}: TeamAttendanceOverviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clocked-in':
        return <Clock className="h-4 w-4 text-success" />;
      case 'on-break':
        return <Coffee className="h-4 w-4 text-warning" />;
      case 'on-leave':
        return <Plane className="h-4 w-4 text-info" />;
      case 'absent':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'clocked-in': 'bg-success/15 text-success',
      'clocked-out': 'bg-muted text-foreground',
      'on-break': 'bg-warning/15 text-warning',
      'on-leave': 'bg-foreground text-background',
      'absent': 'bg-destructive/15 text-destructive',
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Team Attendance</h3>
      <div className="space-y-3">
        {teamMembers.map((member) => (
          <div
            key={member.employeeId}
            onClick={() => onEmployeeClick(member.employeeId)}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(member.status)}
              <div>
                <p className="font-medium">{member.employeeName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusBadge(member.status)}>
                    {member.status.replace('-', ' ')}
                  </Badge>
                  {member.isLate && (
                    <Badge variant="warning">Late</Badge>
                  )}
                  {member.isEarlyDeparture && (
                    <Badge variant="warning">Early</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              {member.clockInTime && (
                <p className="text-sm text-muted-foreground">
                  {member.clockInTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {member.currentHours > 0 && (
                <p className="text-sm font-medium">
                  {member.currentHours.toFixed(1)}h
                </p>
              )}
            </div>
          </div>
        ))}
        {teamMembers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No team members found
          </p>
        )}
      </div>
    </Card>
  );
}
