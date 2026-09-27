'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocationMapModal } from './LocationMapModal';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  location?: {
    clockIn?: { latitude: number; longitude: number };
    clockOut?: { latitude: number; longitude: number };
  };
  totalHours: number;
  status: 'active' | 'completed' | 'incomplete';
  createdAt: Date;
  updatedAt: Date;
}

interface AttendanceHistoryListProps {
  userId: string;
  employeeName?: string;
  showHeader?: boolean;
  className?: string;
}

export function AttendanceHistoryList({ 
  userId, 
  employeeName,
  showHeader = true,
  className = ''
}: AttendanceHistoryListProps) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const itemsPerPage = 10;

  // State for location map modal
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; title: string } | null>(null);

  // Convert Firestore timestamp to Date
  const convertTimestamps = (record: any): AttendanceRecord => {
    // Helper function to safely convert timestamp
    const convertTimestamp = (timestamp: any): Date | undefined => {
      if (!timestamp) return undefined;
      
      try {
        // If it's already a Date object
        if (timestamp instanceof Date) {
          return timestamp;
        }
        
        // If it has toDate() method (Firestore Timestamp)
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        
        // If it's a Firestore Timestamp-like object with seconds
        if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
          return new Date(timestamp.seconds * 1000);
        }
        
        // If it's a string or number, try to create Date
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? undefined : date;
        }
        
        // Fallback
        return undefined;
      } catch (error) {
        console.error('Error converting timestamp:', error, timestamp);
        return undefined;
      }
    };
    
    return {
      ...record,
      clockIn: convertTimestamp(record.clockIn),
      clockOut: convertTimestamp(record.clockOut),
      createdAt: convertTimestamp(record.createdAt),
      updatedAt: convertTimestamp(record.updatedAt),
    };
  };

  const fetchAttendanceHistory = useCallback(async (page = 1) => {
    if (!userId) return;

    setLoading(true);
    
    try {
      let q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', userId),
        orderBy('clockIn', 'desc'),
        limit(page * itemsPerPage)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setAttendances([]);
        setHasMoreData(false);
      } else {
        const allRecords = snapshot.docs.map(doc => 
          convertTimestamps({ id: doc.id, ...doc.data() })
        );
        
        // Get the records for the current page
        const startIndex = (page - 1) * itemsPerPage;
        const pageRecords = allRecords.slice(startIndex, startIndex + itemsPerPage);
        
        setAttendances(pageRecords);
        
        // Check if there are more records
        setHasMoreData(allRecords.length > page * itemsPerPage);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [userId]);

  // Load initial data
  useEffect(() => {
    if (userId) {
      fetchAttendanceHistory();
    }
  }, [userId, fetchAttendanceHistory]);



  // Format time for display
  const formatTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    try {
      // Ensure we have a valid Date object
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Time';
      return validDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error, date);
      return 'Error';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    try {
      // Ensure we have a valid Date object
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Date';
      return validDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Error';
    }
  };

  // Calculate duration between clock in and clock out
  const calculateDuration = (clockIn: Date, clockOut?: Date) => {
    try {
      // Validate inputs
      if (!clockIn || isNaN(clockIn.getTime())) return 'Invalid Start Time';
      if (!clockOut) return 'In Progress';
      if (isNaN(clockOut.getTime())) return 'Invalid End Time';
      
      const diffMs = clockOut.getTime() - clockIn.getTime();
      
      // Handle negative durations
      if (diffMs < 0) return 'Negative Duration';
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error, { clockIn, clockOut });
      return 'Calculation Error';
    }
  };

  // Get status badge
  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.clockIn) {
      return <Badge variant="secondary">Not Clocked In</Badge>;
    } else if (record.clockOut) {
      return <Badge variant="default" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">Completed</Badge>;
    } else {
      return <Badge variant="default" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30">Active</Badge>;
    }
  };

  // Handle location click
  const handleLocationClick = (latitude: number, longitude: number, title: string) => {
    setSelectedLocation({ latitude, longitude, title });
    setShowMapModal(true);
  };

  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">User ID is required to load attendance history.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-4 sm:mb-6 px-4 sm:px-0">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Attendance History {employeeName && `for ${employeeName}`}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Historical attendance records with clock-in/clock-out times
          </p>
        </div>
      )}

      {attendances.length === 0 && !loading && !isInitialLoad ? (
        <Card className="text-center py-8 sm:py-12 mx-4 sm:mx-0">
          <CardContent>
            <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No Attendance Records</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              {employeeName ? `No attendance records found for ${employeeName}.` : 'No attendance records found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
          {attendances.map((record) => (
            <Card key={record.id} className="hover:shadow-hard transition-shadow">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      <span className="break-words">{formatDate(record.clockIn)}</span>
                    </CardTitle>
                    {employeeName && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {record.employeeName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(record)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Clock In Section */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Clock In</h4>
                      <p className="text-base sm:text-lg font-semibold text-foreground">{formatTime(record.clockIn)}</p>
                      {record.location?.clockIn && (
                        <button
                          onClick={() => handleLocationClick(
                            record.location!.clockIn!.latitude,
                            record.location!.clockIn!.longitude,
                            `Clock In Location - ${formatDate(record.clockIn)}`
                          )}
                          className="flex items-center gap-1 mt-1 text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                        >
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {record.location.clockIn.latitude.toFixed(4)}, {record.location.clockIn.longitude.toFixed(4)}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Clock Out Section */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 rotate-180" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Clock Out</h4>
                      <p className="text-base sm:text-lg font-semibold text-foreground">{formatTime(record.clockOut)}</p>
                      {record.location?.clockOut && (
                        <button
                          onClick={() => handleLocationClick(
                            record.location!.clockOut!.latitude,
                            record.location!.clockOut!.longitude,
                            `Clock Out Location - ${formatDate(record.clockIn)}`
                          )}
                          className="flex items-center gap-1 mt-1 text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                        >
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {record.location.clockOut.latitude.toFixed(4)}, {record.location.clockOut.longitude.toFixed(4)}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Duration and Stats */}
                <div className="mt-4 sm:mt-6 pt-4 border-t border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Duration:</span>
                        <span className="ml-2 text-xs sm:text-sm font-medium text-foreground">
                          {calculateDuration(record.clockIn, record.clockOut)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Total Hours:</span>
                        <span className="ml-2 text-xs sm:text-sm font-medium text-foreground">
                          {record.totalHours.toFixed(2)}h
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated: {record.updatedAt.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 sm:mt-8">
            <Button 
              onClick={() => {
                const prevPage = Math.max(1, currentPage - 1);
                setCurrentPage(prevPage);
                fetchAttendanceHistory(prevPage);
              }}
              disabled={currentPage <= 1 || loading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} {hasMoreData ? 'of many' : ''}
              </span>
            </div>
            
            <Button 
              onClick={() => {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                fetchAttendanceHistory(nextPage);
              }}
              disabled={!hasMoreData || loading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm sm:text-base text-muted-foreground">Loading records...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Location Map Modal */}
      {selectedLocation && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => {
            setShowMapModal(false);
            setSelectedLocation(null);
          }}
          latitude={selectedLocation.latitude}
          longitude={selectedLocation.longitude}
          title={selectedLocation.title}
        />
      )}
    </div>
  );
}