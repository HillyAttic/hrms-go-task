import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TeamMember {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
}

interface TeamPerformanceChartProps {
  teamMembers: TeamMember[];
}

// Mini pie chart component for each employee
function MiniPieChart({ completed, inProgress, pending }: { completed: number; inProgress: number; pending: number }) {
  const total = completed + inProgress + pending;
  
  if (total === 0) {
    return (
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
        <span className="text-[8px] sm:text-xs text-muted-foreground">No</span>
      </div>
    );
  }

  const completedPercent = (completed / total) * 100;
  const inProgressPercent = (inProgress / total) * 100;
  const pendingPercent = (pending / total) * 100;

  // Calculate angles for pie chart
  const completedAngle = (completedPercent / 100) * 360;
  const inProgressAngle = (inProgressPercent / 100) * 360;
  const pendingAngle = (pendingPercent / 100) * 360;

  // Semantic tokens rather than raw hex so the chart follows light/dark.
  // Keeps the original green/orange mapping; "pending" becomes neutral grey
  // rather than a third hue, per the restrained status palette.
  const gradient = `conic-gradient(
    from 0deg,
    rgb(var(--success)) 0deg ${completedAngle}deg,
    rgb(var(--warning)) ${completedAngle}deg ${completedAngle + inProgressAngle}deg,
    rgb(var(--muted-foreground)) ${completedAngle + inProgressAngle}deg ${completedAngle + inProgressAngle + pendingAngle}deg
  )`;

  return (
    <div 
      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0"
      style={{ background: gradient }}
      title={`Completed: ${completed}, In Progress: ${inProgress}, Pending: ${pending}`}
    />
  );
}

export function TeamPerformanceChart({ teamMembers }: TeamPerformanceChartProps) {
  console.log('[TeamPerformanceChart] Rendering with teamMembers:', teamMembers?.length || 0);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col space-y-1.5 p-3 sm:p-6">
        <CardTitle className="text-lg sm:text-2xl font-semibold leading-none tracking-tight">Team Performance</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0 pb-3 sm:p-6 sm:pt-0">
        {!teamMembers || teamMembers.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-muted-foreground mb-2">No team members with assigned tasks yet</p>
            <p className="text-xs text-muted-foreground">Assign tasks to team members to see their performance here</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-2 px-1.5 sm:px-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-center py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      Total
                    </th>
                    <th className="text-center py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-semibold text-warning uppercase tracking-wide whitespace-nowrap">
                      Pending
                    </th>
                    <th className="text-center py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-semibold text-warning uppercase tracking-wide whitespace-nowrap">
                      In Progress
                    </th>
                    <th className="text-center py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-semibold text-success uppercase tracking-wide whitespace-nowrap">
                      Done
                    </th>
                    <th className="text-center py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      Chart
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => {
                    const totalTasks = member.tasksCompleted + member.tasksInProgress + member.tasksPending;
                    
                    return (
                      <tr 
                        key={member.id} 
                        className="border-b border-border/60 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-1.5 px-1.5 sm:px-2">
                          <span className="text-[10px] sm:text-xs font-medium text-foreground block break-words">
                            {member.name}
                          </span>
                        </td>
                        <td className="py-1.5 px-1 sm:px-2 text-center whitespace-nowrap">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{totalTasks}</span>
                        </td>
                        <td className="py-1.5 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-medium text-warning whitespace-nowrap">
                          {member.tasksPending}
                        </td>
                        <td className="py-1.5 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-medium text-warning whitespace-nowrap">
                          {member.tasksInProgress}
                        </td>
                        <td className="py-1.5 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-medium text-success whitespace-nowrap">
                          {member.tasksCompleted}
                        </td>
                        <td className="py-1.5 px-1 sm:px-2 whitespace-nowrap">
                          <div className="flex justify-center">
                            <MiniPieChart 
                              completed={member.tasksCompleted}
                              inProgress={member.tasksInProgress}
                              pending={member.tasksPending}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
