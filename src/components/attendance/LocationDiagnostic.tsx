'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { attendanceService } from '@/services/attendance.service';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

/**
 * Diagnostic component to check location data in Firestore
 * This is a temporary debugging tool
 */
export function LocationDiagnostic() {
  const auth = useEnhancedAuth();
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    if (!auth.user) return;
    
    setLoading(true);
    try {
      // Get today's records
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const records = await attendanceService.getAttendanceRecords({
        employeeId: auth.user.uid,
        startDate: startOfDay,
        limit: 5
      });
      
      console.log('Diagnostic - Raw records from Firestore:', records);
      
      setDiagnosticData({
        recordCount: records.length,
        records: records.map(r => ({
          id: r.id,
          clockIn: r.clockIn?.toString(),
          clockOut: r.clockOut?.toString(),
          location: r.location,
          locationClockIn: r.location?.clockIn,
          locationClockOut: r.location?.clockOut,
        }))
      });
    } catch (error) {
      console.error('Diagnostic error:', error);
      setDiagnosticData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  if (!auth.user) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4 border-2 border-yellow-400">
      <CardHeader>
        <CardTitle className="text-yellow-700">🔍 Location Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} disabled={loading}>
          {loading ? 'Running Diagnostic…' : 'Check Location Data'}
        </Button>
        
        {diagnosticData && (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto max-h-96">
            <pre className="text-xs">
              {JSON.stringify(diagnosticData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
