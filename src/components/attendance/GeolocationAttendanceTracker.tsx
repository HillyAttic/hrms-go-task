'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { attendanceService } from '@/services/attendance.service';
import { apiPost } from '@/lib/api-client';
import { 
  Clock, 
  MapPin, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  RotateCcw,
  ShieldAlert,
  Wifi
} from 'lucide-react';

interface LocationData {
  lat: number | null;
  lng: number | null;
  accuracy?: number;
}

interface AttendanceStatus {
  status: 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK' | 'loading' | 'error';
  data: any;
  error?: string;
}

export function GeolocationAttendanceTracker() {
  const auth = useEnhancedAuth();
  const [status, setStatus] = useState<AttendanceStatus>(() => {
    // Always initialize as loading - we'll fetch the real status from backend
    // Don't rely on localStorage for initial state to ensure we get current data
    return { 
      status: 'loading', 
      data: null 
    };
  });
  
  const [location, setLocation] = useState<LocationData>({ 
    lat: null, 
    lng: null 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [showLocationDeniedModal, setShowLocationDeniedModal] = useState(false);

  // Form submission tracking
  const [formSubmissionRequired, setFormSubmissionRequired] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [dailyFormId, setDailyFormId] = useState<string | null>(null);

  // Check if we're running in a secure context (HTTPS)
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

  // Detect if user is on mobile device
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    if (auth.user) {
      console.log('User authenticated, triggering cleanup and status load');
      // Clean up any duplicate records first (only on initial mount)
      cleanupDuplicateRecordsForUser(auth.user.uid);
      loadStatus();
      // Check location permission status
      checkLocationPermission();
    }
  }, [auth.user]);

  // Reload status when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && auth.user) {
        console.log('Page became visible, reloading status to check form submission');
        loadStatus();
      }
    };

    const handleFocus = () => {
      if (auth.user) {
        console.log('Window focused, reloading status to check form submission');
        loadStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Also load status immediately when component mounts
    if (auth.user) {
      console.log('Component mounted, loading status immediately');
      loadStatus();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [auth.user]);

  // Cleanup duplicate records for the current user
  const cleanupDuplicateRecordsForUser = async (employeeId: string) => {
    console.log('Attempting to cleanup duplicate records for:', employeeId);
    try {
      // Use authenticated API call instead of direct fetch
      await apiPost('/api/attendance/cleanup-duplicates', { employeeId });
      console.log('Duplicate records cleanup initiated');
    } catch (error: any) {
      console.error('Cleanup API failed:', error.message);
      // Don't show error to user since this is a background operation
    }
  };

  const loadStatus = async () => {
    if (!auth.user) return;

    try {
      console.log('Loading status for user:', auth.user.uid);
      setStatus({ status: 'loading', data: null });

      // Call the API endpoint instead of the client service to get form submission status
      const response = await fetch(`/api/attendance/status?employeeId=${auth.user.uid}`, {
        headers: {
          'Authorization': `Bearer ${await auth.user.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance status');
      }

      const result = await response.json();
      console.log('getCurrentStatus result:', result);

      // Update form submission status from API response
      if (result.formSubmissionRequired !== undefined) {
        console.log('Form submission status from API:', {
          required: result.formSubmissionRequired,
          submitted: result.formSubmitted,
          formId: result.dailyFormId
        });
        setFormSubmissionRequired(result.formSubmissionRequired);
        setFormSubmitted(result.formSubmitted || false);
        setDailyFormId(result.dailyFormId || null);
      } else {
        console.log('No form submission status in API response');
      }

      // Check if user has already clocked in today (even if they've clocked out)
      const hasClockedInToday = await attendanceService.hasClockedInToday(auth.user.uid);
      console.log('hasClockedInToday:', hasClockedInToday);

      // Map the service response to our status format
      let mappedStatus: AttendanceStatus['status'] = 'NOT_CLOCKED_IN';
      if (result.isClockedIn) {
        mappedStatus = result.isOnBreak ? 'ON_BREAK' : 'CLOCKED_IN';
        console.log('User is clocked in, status:', mappedStatus);
      } else if (!result.isClockedIn && hasClockedInToday) {
        // User has already clocked in today but is not currently clocked in
        mappedStatus = 'CLOCKED_OUT';
        console.log('User has clocked out for today');
      } else {
        console.log('User is not clocked in');
      }

      console.log('Final mapped status:', mappedStatus);
      console.log('Final form submission state - Required:', result.formSubmissionRequired, 'Submitted:', result.formSubmitted);

      setStatus({
        status: mappedStatus,
        data: result
      });
    } catch (err: any) {
      console.error('Error loading status:', err);
      setStatus({
        status: 'error',
        data: null,
        error: err.message || 'Failed to load attendance status'
      });
    }
  };

  // Clear cached attendance data (placeholder for future use)
  const clearCachedAttendance = () => {
    // No localStorage cleanup needed since we're not using it for initialization
    console.log('Clearing cached attendance data');
  };

  // Check location permission status
  const checkLocationPermission = async () => {
    if (!navigator.permissions) {
      console.log('Permissions API not supported');
      setPermissionStatus('unknown');
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      console.log('Location permission status:', result.state);
      setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
      
      // Listen for permission changes
      result.addEventListener('change', () => {
        console.log('Permission status changed to:', result.state);
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        // Clear error when permission is granted
        if (result.state === 'granted') {
          setError('');
          setShowLocationDeniedModal(false); // Hide modal when permission granted
        } else if (result.state === 'denied') {
          setShowLocationDeniedModal(true); // Show modal when permission denied
        }
      });
    } catch (err) {
      console.error('Error checking location permission:', err);
      setPermissionStatus('unknown');
    }
  };

  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      // Check if we're in a secure context
      if (!isSecureContext) {
        reject(new Error('Location access requires a secure connection (HTTPS). Please access this application via HTTPS or localhost.'));
        return;
      }
      
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('=== GEOLOCATION DATA ===');
          console.log('Raw position object:', position);
          console.log('Latitude:', position.coords.latitude);
          console.log('Longitude:', position.coords.longitude);
          console.log('Accuracy:', position.coords.accuracy, 'meters');
          console.log('Altitude:', position.coords.altitude);
          console.log('Altitude Accuracy:', position.coords.altitudeAccuracy);
          console.log('Heading:', position.coords.heading);
          console.log('Speed:', position.coords.speed);
          console.log('Timestamp:', new Date(position.timestamp).toISOString());
          console.log('========================');
          
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          // Only include accuracy if it's a valid number
          if (position.coords.accuracy !== undefined && 
              typeof position.coords.accuracy === 'number' && 
              !isNaN(position.coords.accuracy)) {
            locationData.accuracy = position.coords.accuracy;
          }
          
          // Warn if accuracy is poor (more than 50 meters)
          if (position.coords.accuracy && position.coords.accuracy > 50) {
            console.warn('⚠️ Location accuracy is poor:', position.coords.accuracy, 'meters');
            console.warn('Consider waiting for better GPS signal');
          }
          
          // Update permission status on success
          setPermissionStatus('granted');
          resolve(locationData);
        },
        (error) => {
          console.error('=== GEOLOCATION ERROR ===');
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('========================');
          
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setPermissionStatus('denied');
              setShowLocationDeniedModal(true); // Show persistent modal
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. This may be due to using an insecure connection (HTTP). Please use HTTPS.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please check your GPS signal and try again. Make sure you are in an area with good satellite visibility.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true, // Force GPS instead of WiFi/cell tower
          timeout: 30000, // 30 seconds timeout
          maximumAge: 0 // Don't use cached location - always get fresh coordinates
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!auth.user) return;

    setLoading(true);
    setError('');
    
    try {
      console.log('Starting clock in process...');
      const loc = await getCurrentLocation();
      console.log('Location obtained - Raw:', loc);
      console.log('Location lat:', loc.lat, 'lng:', loc.lng);
      console.log('Location accuracy:', loc.accuracy, 'meters');
      setLocation(loc);
      
      // Validate location before sending
      if (!loc.lat || !loc.lng || isNaN(loc.lat) || isNaN(loc.lng)) {
        throw new Error('Invalid location data captured. Please try again.');
      }
      
      // Warn if accuracy is poor but still allow clock in
      if (loc.accuracy && loc.accuracy > 100) {
        console.warn('⚠️ Poor GPS accuracy detected:', loc.accuracy, 'meters');
        setError(`Warning: GPS accuracy is ${Math.round(loc.accuracy)}m. For better accuracy, move to an open area with clear sky view.`);
        // Don't throw error, just warn
      }
      
      const locationData = {
        latitude: loc.lat,
        longitude: loc.lng,
        accuracy: loc.accuracy
      };
      
      console.log('Sending location data to service:', locationData);
      console.log('Expected location: Lat 28.637959, Lng 77.285334');
      console.log('Captured location: Lat', loc.lat, ', Lng', loc.lng);
      console.log('Difference: Lat', Math.abs(28.637959 - loc.lat).toFixed(6), ', Lng', Math.abs(77.285334 - loc.lng).toFixed(6));
      
      const record = await attendanceService.clockIn({
        employeeId: auth.user.uid,
        employeeName: auth.userProfile?.displayName || auth.user.email || 'User',
        timestamp: new Date(),
        location: locationData
      });
      
      console.log('Clock in result:', record);
      
      if (record === null) {
        // User was already clocked in, just refresh the status
        console.log('User already clocked in, refreshing status');
        setError('You are already clocked in for today');
        await loadStatus();
      } else {
        // Successfully clocked in, wait a bit for Firestore to propagate, then refresh
        console.log('Clock in successful, waiting for Firestore propagation...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for Firestore
        console.log('Refreshing status after clock in...');
        await loadStatus();
      }
    } catch (err: any) {
      console.error('Geolocation tracker clock in error:', err);
      setError(err.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely format clock in time
  const formatClockInTime = (clockInTime: any): string => {
    try {
      // Convert to Date object if it's not already
      const date = clockInTime instanceof Date ? clockInTime : new Date(clockInTime);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      // Format as time only (HH:MM:SS)
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting clock in time:', error);
      return 'Time unavailable';
    }
  };

  const handleClockOut = async () => {
    if (!auth.user) return;

    // Get current record ID from status or fetch it
    let recordId = status.data?.currentRecordId;
    if (!recordId) {
      try {
        const currentStatus = await attendanceService.getCurrentStatus(auth.user.uid);
        recordId = currentStatus.currentRecordId;
      } catch (err) {
        setError('Could not find current attendance record');
        return;
      }
    }

    if (!recordId) {
      setError('No active attendance record found');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const loc = await getCurrentLocation();
      console.log('Clock out - Location obtained - Raw:', loc);
      console.log('Clock out - Location lat:', loc.lat, 'lng:', loc.lng);
      setLocation(loc);
      
      // Validate location before sending
      if (!loc.lat || !loc.lng || isNaN(loc.lat) || isNaN(loc.lng)) {
        throw new Error('Invalid location data captured. Please try again.');
      }
      
      const locationData = {
        latitude: loc.lat,
        longitude: loc.lng,
        accuracy: loc.accuracy
      };
      
      console.log('Sending clock out location data to service:', locationData);
      
      await attendanceService.clockOut(recordId, {
        timestamp: new Date(),
        location: locationData
      });
      
      // Refresh status to ensure UI is in sync with backend
      await loadStatus();
      
      // Brief pause to ensure smooth UI transition
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (err: any) {
      // Parse error response to check for form submission requirement
      let errorData;
      try {
        errorData = JSON.parse(err.message);
      } catch {
        errorData = { message: err.message };
      }

      if (errorData.requiresFormSubmission || errorData.message?.includes('Form Submission Required')) {
        setError(
          '⚠️ Form Submission Required\n\nPlease submit today\'s MIS form before clocking out. You can find the form on your dashboard.'
        );
      } else if (err.message && err.message.includes('MIS form')) {
        setError('⚠️ Please submit today\'s MIS form before clocking out. You can find the form on your dashboard.');
      } else {
        setError(err.message || 'Failed to clock out');
      }
    } finally {
      setLoading(false);
    }
  };

  // Component cleanup
  useEffect(() => {
    return () => {
      // Cleanup logic when component unmounts
      console.log('GeolocationAttendanceTracker unmounted');
    };
  }, []);

  // Listen for form submission events from dashboard
  useEffect(() => {
    const handleFormSubmitted = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.formId === dailyFormId) {
        console.log('Form submitted event received, updating state');
        setFormSubmitted(true);
        setError(''); // Clear any form-related errors
      }
    };

    window.addEventListener('formSubmitted', handleFormSubmitted);
    return () => {
      window.removeEventListener('formSubmitted', handleFormSubmitted);
    };
  }, [dailyFormId]);

  const getStatusMessage = () => {
    switch (status.status) {
      case 'loading':
        return 'Loading attendance status...';
      case 'NOT_CLOCKED_IN':
        return 'Ready to clock in';
      case 'CLOCKED_IN':
        return 'Currently clocked in';
      case 'ON_BREAK':
        return 'On break';
      case 'CLOCKED_OUT':
        return 'Clocked out for today';
      case 'error':
        return status.error || 'Error loading status';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'CLOCKED_IN':
        return 'text-green-600';
      case 'ON_BREAK':
        return 'text-yellow-600';
      case 'CLOCKED_OUT':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (auth.loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading authentication...</p>
        </CardContent>
      </Card>
    );
  }

  if (!auth.user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Authentication Required</p>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to use attendance tracking</p>
        </CardContent>
      </Card>
    );
  }
  
  // Check if we're in an insecure context and warn the user
  if (!isSecureContext) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-6 w-6" />
            <h3 className="font-semibold">Security Warning</h3>
          </div>
          
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>Location access requires a secure connection (HTTPS).</p>
            <p>Please access this application via:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>HTTPS protocol (https://yourdomain.com)</li>
              <li>Localhost (http://localhost:3000)</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-2 text-blue-600 pt-2">
            <Wifi className="h-5 w-5" />
            <p className="text-sm">
              Current connection: <span className="font-mono">{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="text-center">
          <div className={`flex items-center justify-center gap-2 mb-2`}>
            {status.status === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : status.status === 'CLOCKED_IN' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : status.status === 'ON_BREAK' ? (
              <Coffee className="h-5 w-5 text-yellow-500" />
            ) : status.status === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </span>
          </div>
          
          {status.data?.clockInTime && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Clocked in at {formatClockInTime(status.data.clockInTime)}
            </p>
          )}
          
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
              
              {/* Show permission instructions if location was denied */}
              {permissionStatus === 'denied' && (
                <div className="mt-3 text-left space-y-2">
                  {/* Desktop Instructions */}
                  {!isMobileDevice() && (
                    <>
                      <p className="text-xs font-semibold text-red-800">To enable location access:</p>
                      <ol className="text-xs text-red-700 space-y-1 list-decimal pl-4">
                        <li>Open your browser and navigate to https://jpcopanel.vercel.app/. Then, click the tune (settings) icon in the address bar.</li>
                        <li>Find "Location" in the permissions list</li>
                        <li>Change it from "Block" to "Allow"</li>
                        <li>Click the "Retry" button below</li>
                      </ol>
                      
                      {/* Visual reference images */}
                      <div className="mt-3 p-2 bg-white dark:bg-gray-dark rounded border border-red-300">
                        <p className="text-xs text-red-800 font-medium mb-2">Visual Guide:</p>
                        <div className="space-y-2">
                          <img 
                            src="/images/icons/tune_icon_chrome.webp" 
                            alt="Step 1: Click the lock icon in browser address bar"
                            className="w-full rounded border border-gray-200 dark:border-gray-700"
                          />
                          <img 
                            src="/images/icons/location_allow.jpg" 
                            alt="Step 2: Allow location access"
                            className="w-full rounded border border-gray-200 dark:border-gray-700"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Mobile Instructions */}
                  {isMobileDevice() && (
                    <>
                      <p className="text-xs font-semibold text-red-800">Steps to fix on mobile devices:</p>
                      <ol className="text-xs text-red-700 space-y-1 list-decimal pl-4">                      
                        <li>Enable location access manually on your mobile device</li>
                        <li>Return to this page and click "Retry" below</li>
                      </ol>
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>Note:</strong> You may need to close and reopen your app after changing settings.
                        </p>
                      </div>
                    </>
                  )}
                  
                  <Button
                    onClick={() => {
                      setError('');
                      checkLocationPermission();
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Location Info - Hidden as per user request */}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status.status === 'NOT_CLOCKED_IN' && (
            <Button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recording Clock In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Clock In
                </>
              )}
            </Button>
          )}

          {(status.status === 'CLOCKED_IN' || status.status === 'ON_BREAK') && (
            <>
              <Button
                onClick={handleClockOut}
                disabled={loading || (formSubmissionRequired && !formSubmitted)}
                variant="destructive"
                className="w-full h-12 text-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Recording Clock Out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-5 w-5" />
                    Clock Out
                  </>
                )}
              </Button>

              {/* Warning banner if form required but not submitted */}
              {formSubmissionRequired && !formSubmitted && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900 dark:text-red-200">
                        Clock Out Disabled
                      </p>
                      <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                        You must submit today's DMR (Daily Monitoring Report) form before you can clock out. The clock-out button is disabled until you complete the form.
                      </p>
                      <a
                        href="/dashboard"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block font-bold"
                      >
                        Click here to go to dashboard
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {status.status === 'CLOCKED_OUT' && (
            <div className="text-center p-4 bg-green-50 rounded-md border border-green-200">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-800">Attendance Completed</p>
              <p className="text-sm text-green-700">You're all set for today!</p>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={loadStatus}
            disabled={loading || status.status === 'loading'}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </CardContent>

      {/* Persistent Location Denied Modal */}
      {showLocationDeniedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                <MapPin className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Location Access Required</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                To use attendance tracking, you need to enable location access.
              </p>
              
              {/* Mobile Instructions */}
              {isMobileDevice() && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    📱 Mobile Device Instructions:
                  </p>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal pl-4">
                    <li>Go to your device Settings</li>
                    <li>Enable Location services</li>
                    <li>Return to this page and tap "I've Enabled Location"</li>
                  </ol>
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> You may need to close and reopen your browser after changing settings.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Desktop Instructions */}
              {!isMobileDevice() && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💻 Desktop Browser Instructions:
                  </p>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal pl-4">
                    <li>Click the tune (settings) icon in your browser's address bar</li>
                    <li>Find "Location" in the permissions list</li>
                    <li>Change it from "Block" to "Allow"</li>
                    <li>Click "I've Enabled Location" below</li>
                  </ol>
                  
                  {/* Visual reference images */}
                  <div className="mt-3 p-2 bg-white dark:bg-gray-900 rounded border border-blue-300 dark:border-blue-700">
                    <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-2">Visual Guide:</p>
                    <div className="space-y-2">
                      <img 
                        src="/images/icons/tune_icon_chrome.webp" 
                        alt="Step 1: Click the lock icon in browser address bar"
                        className="w-full rounded border border-gray-200 dark:border-gray-700"
                      />
                      <img 
                        src="/images/icons/location_allow.jpg" 
                        alt="Step 2: Allow location access"
                        className="w-full rounded border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  setShowLocationDeniedModal(false);
                  setError('');
                  await checkLocationPermission();
                  // Try to get location again
                  try {
                    await getCurrentLocation();
                    setError('');
                  } catch (err: any) {
                    setError(err.message);
                    // If still denied, show modal again after a short delay
                    setTimeout(() => {
                      if (permissionStatus === 'denied') {
                        setShowLocationDeniedModal(true);
                      }
                    }, 1000);
                  }
                }}
                className="flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                I've Enabled Location
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

