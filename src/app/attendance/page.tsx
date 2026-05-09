  'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GeolocationAttendanceTracker, LeaveRequestModal } from '@/components/attendance';
import { History, ArrowRight, Calendar as CalendarIcon, CheckCircle, XCircle, Clock as ClockIconBox } from 'lucide-react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { ClockIcon, PlayIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { leaveService } from '@/services/leave.service';
import { LeaveRequest, LeaveType, LeaveBalance, LeaveRequestFormData } from '@/types/attendance.types';
import { toast } from 'react-toastify';

export default function AttendancePage() {
  const { user, userProfile, loading: authLoading, isManager, isAdmin } = useEnhancedAuth();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  // Leave State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);

  // Auto-open leave modal if query parameter is present
  useEffect(() => {
    if (searchParams?.get('openLeaveModal') === 'true') {
      setShowLeaveModal(true);
      // Clean up URL
      window.history.replaceState({}, '', '/attendance');
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingLeaves(true);

      // Fetch leave types
      console.log('Fetching leave types...');
      const types = await leaveService.getLeaveTypes();
      console.log('Leave types received:', types);
      setLeaveTypes(types);

      // Fetch balances
      const balances = await leaveService.getLeaveBalances(user.uid);
      setLeaveBalances(balances);

      // Fetch my leaves
      const requests = await leaveService.getLeaveRequests({ employeeId: user.uid });
      setMyLeaves(requests);

      // Fetch pending leaves for managers/admins
      if (isManager || isAdmin) {
        const pending = await leaveService.getPendingLeaveRequests(user.uid);
        setPendingLeaves(pending);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoadingLeaves(false);
    }
  }, [user, isManager, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyLeave = async (data: LeaveRequestFormData) => {
    if (!user || !userProfile) return;

    try {
      setLoadingLeaves(true);
      await leaveService.createLeaveRequest({
        ...data,
        employeeId: user.uid,
        employeeName: userProfile.displayName || user.email || 'Unknown',
      });
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Failed to submit leave request');
      // Keep modal open on error so user can retry
    } finally {
      setLoadingLeaves(false);
    }
  };

  const openApproveModal = (request: LeaveRequest) => {
    setSelectedLeaveRequest(request);
    setShowApproveModal(true);
  };

  const handleApproveLeave = async (id: string, reason?: string) => {
    if (!user) return;
    try {
      setProcessingId(id);

      // Use the API route directly to support approval reason
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          ...(reason && { approvalReason: reason })
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve leave');
      }

      toast.success('Leave approved');
      fetchData();

      // Close modal if open
      if (showApproveModal) {
        setShowApproveModal(false);
        setApprovalReason('');
        setSelectedLeaveRequest(null);
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLeave = async (id: string) => {
    if (!user) return;
    // For simplicity, using a prompt. ideally a modal
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      setProcessingId(id);
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: reason
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject leave');
      }

      toast.success('Leave rejected');
      fetchData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Show loading if auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show authentication required message if not signed in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Attendance Access Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to access the attendance tracking system.</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Attendance Tracking</h1>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-fit">
              <PlayIcon className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Track time, manage leaves, and view history</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Apply Leave
          </Button>

          <Button
            onClick={() => window.location.href = '/attendance/history'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 sm:py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <GeolocationAttendanceTracker key="geolocation-tracker" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Pending Approval Section (Managers Only) */}
        {(isManager || isAdmin) && pendingLeaves.length > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardHeader className="bg-yellow-50 dark:bg-yellow-900/10">
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                <ClockIconBox className="h-5 w-5" />
                Pending Approvals ({pendingLeaves.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {pendingLeaves.map((request) => (
                  <div key={request.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{request.employeeName}</p>
                        <Badge variant="outline">{request.leaveTypeName}</Badge>
                        {request.halfDay && (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Half Day</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">{request.duration} days</span> • {request.startDate instanceof Date ? request.startDate.toLocaleDateString() : new Date(request.startDate).toLocaleDateString()} to {request.endDate instanceof Date ? request.endDate.toLocaleDateString() : new Date(request.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm mt-2 italic text-gray-700 dark:text-gray-300">"{request.reason}"</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                        onClick={() => handleApproveLeave(request.id)}
                        disabled={processingId === request.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                        onClick={() => openApproveModal(request)}
                        disabled={processingId === request.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve with Note
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleRejectLeave(request.id)}
                        disabled={processingId === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Leaves Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            {myLeaves.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No leave requests found.</p>
                <Button variant="link" onClick={() => setShowLeaveModal(true)}>Apply for leave</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myLeaves.map((request) => (
                  <div key={request.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-lg">{request.leaveTypeName}</span>
                        {getStatusBadge(request.status)}
                        {request.halfDay && (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Half Day</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        {request.startDate instanceof Date ? request.startDate.toLocaleDateString() : new Date(request.startDate).toLocaleDateString()} - {request.endDate instanceof Date ? request.endDate.toLocaleDateString() : new Date(request.endDate).toLocaleDateString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Duration: {request.duration} days</p>

                      {/* Show rejection reason if rejected */}
                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Admin Remarks:</p>
                              <p className="text-sm text-red-700 dark:text-red-400">{request.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show approval reason if approved */}
                      {request.status === 'approved' && request.approvalReason && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">Admin Note:</p>
                              <p className="text-sm text-green-700 dark:text-green-400">{request.approvalReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-2 sm:mt-0"
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this request?')) {
                            leaveService.cancelLeaveRequest(request.id).then(() => {
                              toast.success('Leave request cancelled');
                              fetchData();
                            });
                          }
                        }}
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card className="max-w-2xl mx-auto mt-4 sm:mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPinIcon className="h-5 w-5" />
            About Geolocation Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            This geolocation-based attendance system tracks your location when clocking in and out.
            Your location data is securely stored and used for attendance verification purposes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Location Required</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Browser location permission is needed for clock-in/out</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Privacy Protected</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Location data is only stored for attendance records</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Real-time Tracking</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Instant status updates and location verification</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Mobile Friendly</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Works on smartphones and tablets for remote workers</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LeaveRequestModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        onSubmit={handleApplyLeave}
        leaveTypes={leaveTypes}
        leaveBalances={leaveBalances}
        loading={loadingLeaves}
      />

      {/* Approve with Reason Modal */}
      {showApproveModal && selectedLeaveRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Approve Leave Request</h3>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">{selectedLeaveRequest.employeeName}</span> - {selectedLeaveRequest.leaveTypeName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedLeaveRequest.startDate instanceof Date ? selectedLeaveRequest.startDate.toLocaleDateString() : new Date(selectedLeaveRequest.startDate).toLocaleDateString()} to {selectedLeaveRequest.endDate instanceof Date ? selectedLeaveRequest.endDate.toLocaleDateString() : new Date(selectedLeaveRequest.endDate).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Add an optional note for the employee (optional):
            </p>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="e.g., Approved. Enjoy your time off!"
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleApproveLeave(selectedLeaveRequest.id, approvalReason || undefined)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={processingId === selectedLeaveRequest.id}
              >
                {processingId === selectedLeaveRequest.id ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalReason('');
                  setSelectedLeaveRequest(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}