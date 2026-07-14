'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useModal } from '@/contexts/modal-context';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocsFromServer,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocationMapModal } from '@/components/attendance/LocationMapModal';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  X,
  Check
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

export default function AttendanceHistoryPage() {
  const { user } = useEnhancedAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const itemsPerPage = 10;
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // State for location map modal
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; title: string } | null>(null);

  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (showDeleteModal || showMapModal) openModal();
    else closeModal();
  }, [showDeleteModal, showMapModal, openModal, closeModal]);

  // Delete functions
  const confirmDelete = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setRecordToDelete(null);
  };

  const deleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      setDeletingRecordId(recordToDelete.id);
      
      const response = await fetch(`/api/attendance/${recordToDelete.id}?t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        // Remove the deleted record from the local state
        setAttendances(attendances.filter(record => record.id !== recordToDelete.id));
        setShowDeleteModal(false);
        setRecordToDelete(null);
        
        // Refresh the data after a brief moment to ensure indexes are updated
        setTimeout(() => {
          if (user?.uid) {
            fetchAttendanceHistory(currentPage);
          }
        }, 500);
      } else {
        console.error('Failed to delete record:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    } finally {
      setDeletingRecordId(null);
    }
  };

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
    
    const convertedRecord = {
      ...record,
      clockIn: convertTimestamp(record.clockIn),
      clockOut: convertTimestamp(record.clockOut),
      createdAt: convertTimestamp(record.createdAt),
      updatedAt: convertTimestamp(record.updatedAt),
    };
    
    return convertedRecord;
  };

  const fetchAttendanceHistory = useCallback(async (page = 1) => {
    if (!user?.uid) return;

    setLoading(true);
    
    try {
      const fetchLimit = page * itemsPerPage + 1; // Fetch one extra to detect "has more"

      let q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', user.uid),
        orderBy('clockIn', 'desc'),
        limit(fetchLimit)
      );

      const snapshot = await getDocsFromServer(q);

      if (snapshot.empty) {
        setAttendances([]);
        setHasMoreData(false);
      } else {
        const allRecords = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          return convertTimestamps(data);
        });

        // Detect if more data exists (we fetched one extra record)
        const expectedLimit = page * itemsPerPage;
        const hasMore = allRecords.length > expectedLimit;

        // Trim to actual limit (remove the extra detection record)
        const trimmedRecords = hasMore ? allRecords.slice(0, expectedLimit) : allRecords;

        // Get the records for the current page
        const startIndex = (page - 1) * itemsPerPage;
        const pageRecords = trimmedRecords.slice(startIndex, startIndex + itemsPerPage);

        setAttendances(pageRecords);
        setHasMoreData(hasMore);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user?.uid]);

  // Load initial data
  useEffect(() => {
    if (user?.uid) {
      fetchAttendanceHistory();
    }
  }, [user?.uid, fetchAttendanceHistory]);



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

  // Format datetime for display
  const formatDateTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    try {
      // Ensure we have a valid Date object
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Date';
      return validDate.toLocaleString();
    } catch (error) {
      console.error('Error formatting datetime:', error, date);
      return 'Error';
    }
  };

  // Calculate duration between clock in and clock out
  const calculateDuration = React.useCallback((clockIn: Date, clockOut?: Date) => {
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
  }, []); // Empty dependency array to memoize the function

  // Get status badge
  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.clockIn) {
      return <Badge variant="secondary">Not Clocked In</Badge>;
    } else if (record.clockOut) {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    } else {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge>;
    }
  };

  // Handle location click
  const handleLocationClick = (latitude: number, longitude: number, title: string) => {
    setSelectedLocation({ latitude, longitude, title });
    setShowMapModal(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view attendance history.</p>
          <Button 
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign In to Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4">
      {/* Header Section - Mobile Responsive */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Attendance History</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">View your historical attendance records</p>
          </div>
          
          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAttendanceHistory(currentPage)}
              className="flex items-center gap-1"
            >
              <Loader2 className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>
      </div>

      {attendances.length === 0 && !loading && !isInitialLoad ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Attendance Records</h3>
            <p className="text-gray-600 dark:text-gray-400">You don't have any attendance records yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {attendances.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 pb-3 sm:pb-6">
                <div className="flex justify-between items-start gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-1 sm:gap-2 leading-tight sm:leading-normal pb-2 sm:pb-0 border-b sm:border-b-0 border-gray-200 dark:border-gray-700">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <span className="whitespace-nowrap text-sm sm:text-xl">{formatDate(record.clockIn)}</span>
                    </CardTitle>
                    <p className="hidden sm:block text-[9px] sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate ml-2.5 sm:ml-7">
                      {record.employeeName}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <div className="hidden sm:block">
                      {getStatusBadge(record)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(record)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2 h-7 w-7 sm:h-auto sm:w-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Clock In/Out Section - Now inside CardHeader on mobile */}
                <div className="mt-3 sm:mt-4">
                  <div className="flex gap-1.5 sm:grid sm:grid-cols-2 sm:gap-6">
                    {/* Clock In Section */}
                    <div className="flex items-start space-x-1 sm:space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                        <div className="w-7 h-5 sm:w-10 sm:h-10 rounded-lg sm:rounded-full bg-green-100 flex items-center justify-center">
                          <Clock className="w-2.5 h-2.5 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1 whitespace-nowrap">Clock In</h4>
                        <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">{formatTime(record.clockIn)}</p>
                        {record.location?.clockIn && (
                          <button
                            onClick={() => handleLocationClick(
                              record.location!.clockIn!.latitude,
                              record.location!.clockIn!.longitude,
                              `Clock In Location - ${formatDate(record.clockIn)}`
                            )}
                            className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <MapPin className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span className="text-xs sm:text-xs truncate">
                              <span className="sm:hidden">Map</span>
                              <span className="hidden sm:inline">{record.location.clockIn.latitude.toFixed(4)}, {record.location.clockIn.longitude.toFixed(4)}</span>
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Clock Out Section */}
                    <div className="flex items-start space-x-1 sm:space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                        <div className="w-7 h-5 sm:w-10 sm:h-10 rounded-lg sm:rounded-full bg-red-100 flex items-center justify-center">
                          <Clock className="w-2.5 h-2.5 sm:w-5 sm:h-5 text-red-600 rotate-180" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1 whitespace-nowrap">Clock Out</h4>
                        <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">{formatTime(record.clockOut)}</p>
                        {record.location?.clockOut && (
                          <button
                            onClick={() => handleLocationClick(
                              record.location!.clockOut!.latitude,
                              record.location!.clockOut!.longitude,
                              `Clock Out Location - ${formatDate(record.clockIn)}`
                            )}
                            className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <MapPin className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span className="text-xs sm:text-xs truncate">
                              <span className="sm:hidden">Map</span>
                              <span className="hidden sm:inline">{record.location.clockOut.latitude.toFixed(4)}, {record.location.clockOut.longitude.toFixed(4)}</span>
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Duration and Stats - Now inside CardHeader on mobile */}
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <div>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Duration:</span>
                        <span className="ml-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {calculateDuration(record.clockIn, record.clockOut)}
                        </span>
                      </div>
                      <div className="sm:hidden">
                        {getStatusBadge(record)}
                      </div>
                    </div>
                    <div className="hidden sm:block text-[8px] sm:text-xs text-gray-400">
                      Updated: {formatDateTime(record.updatedAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
          
          {/* Pagination Controls - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 mt-6 sm:mt-8">
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
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
                <span className="text-gray-600 dark:text-gray-400">Loading records...</span>
              </div>
            </div>
          )}
        </div>
      )}
    
      {/* Delete Confirmation Modal - Mobile Responsive */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-dark rounded-lg max-w-md w-full p-4 sm:p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Confirm Deletion</h3>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to delete this attendance record?
            </p>
            
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
              Date: {formatDate(recordToDelete.clockIn)}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={!!deletingRecordId}
                className="flex-1 w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                variant="destructive"
                onClick={deleteRecord}
                disabled={!!deletingRecordId}
                className="flex-1 w-full"
              >
                {deletingRecordId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
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