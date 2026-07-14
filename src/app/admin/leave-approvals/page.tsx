'use client';

import { useState, useEffect } from 'react';
import { useModal } from '@/contexts/modal-context';
import { LeaveRequest, LeaveStatus } from '@/types/leave.types';
import { toast } from 'react-toastify';

export default function LeaveApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeaveStatus | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'leave' | 'wfh'>('leave');

  const { openModal, closeModal } = useModal();
  useEffect(() => {
    if (showRejectModal || showApproveModal) openModal();
    else closeModal();
  }, [showRejectModal, showApproveModal, openModal, closeModal]);

  // Read tab from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'wfh') setActiveTab('wfh');
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/leave-requests' 
        : `/api/leave-requests?status=${filter}`;
      
      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        toast.success('Leave request approved');
        fetchRequests();
      } else {
        toast.error('Failed to approve leave request');
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleApproveWithReason = async () => {
    if (!selectedRequest || !approvalReason.trim()) {
      toast.error('Please provide an approval reason');
      return;
    }

    try {
      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', approvalReason }),
      });

      if (response.ok) {
        toast.success('Leave request approved with reason');
        setShowApproveModal(false);
        setApprovalReason('');
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast.error('Failed to approve leave request');
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const openApproveModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectionReason }),
      });

      if (response.ok) {
        toast.success('Leave request rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast.error('Failed to reject leave request');
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave request');
    }
  };

  const openRejectModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    if (type === 'wfh') return 'WFH';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Filter requests by active tab
  const filteredRequests = requests.filter(r =>
    activeTab === 'wfh' ? r.leaveType === 'wfh' : r.leaveType !== 'wfh'
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {activeTab === 'wfh' ? 'WFH Approvals' : 'Leave Approvals'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {activeTab === 'wfh'
            ? 'Review and manage employee WFH requests'
            : 'Review and manage employee leave requests'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'leave'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('wfh')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'wfh'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          WFH Requests
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 sm:mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-base whitespace-nowrap ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {activeTab === 'wfh' ? 'WFH' : 'leave'} requests found
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{request.employeeName}</div>
                          <div className="text-sm text-gray-500">{request.employeeEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {getLeaveTypeLabel(request.leaveType)}
                          {request.halfDay && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              Half Day
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div>{new Date(request.startDate).toLocaleDateString()}</div>
                        <div className="text-gray-500">to {new Date(request.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                        <div className="line-clamp-3">{request.reason}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request.id!)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openApproveModal(request)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Approve with Reason
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {request.status !== 'pending' && (
                          <div className="text-sm text-gray-500">
                            By {request.approverName || 'Manager'}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request) => (
                <div key={request.id} className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{request.employeeName}</div>
                      <div className="text-sm text-gray-500 break-all">{request.employeeEmail}</div>
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  {/* Leave Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">Leave Type</div>
                      <div className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                        {getLeaveTypeLabel(request.leaveType)}
                        {request.halfDay && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Half Day
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">Duration</div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Dates</div>
                    <div className="text-gray-900 dark:text-white">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">Reason</div>
                    <div className="text-gray-900 dark:text-white break-words whitespace-pre-wrap">
                      {request.reason}
                    </div>
                  </div>

                  {/* Actions or Approver */}
                  {request.status === 'pending' ? (
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => handleApprove(request.id!)}
                        className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openApproveModal(request)}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Approve with Reason
                      </button>
                      <button
                        onClick={() => openRejectModal(request)}
                        className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 pt-2">
                      Approved by {request.approverName || 'Manager'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Reject Leave Request</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this leave request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve with Reason Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Approve Leave Request with Reason</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason or note for approving this leave request:
            </p>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              rows={4}
              placeholder="Enter approval reason or note..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApproveWithReason}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
