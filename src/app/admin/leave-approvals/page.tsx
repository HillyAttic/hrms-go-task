'use client';

import { useState, useEffect, useCallback } from 'react';
import { useModal } from '@/contexts/modal-context';
import { LeaveRequest, LeaveStatus } from '@/types/leave.types';
import { toast } from 'react-toastify';

/** Shared styling for the compact action buttons in the approvals table. */
const ACTION_BTN =
  'whitespace-nowrap rounded px-3 py-1 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50';

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
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const fetchRequests = useCallback(async () => {
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
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
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
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWithReason = async () => {
    if (!selectedRequest || !approvalReason.trim()) {
      toast.error('Please provide an approval reason');
      return;
    }

    try {
      setProcessingId(selectedRequest.id!);
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
    } finally {
      setProcessingId(null);
    }
  };

  const openApproveModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  /** One-click reject — no note is attached to the decision. */
  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        toast.success('Leave request rejected');
        fetchRequests();
      } else {
        toast.error('Failed to reject leave request');
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithReason = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingId(selectedRequest.id!);
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
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default: return 'bg-muted text-foreground';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    if (type === 'wfh') return 'WFH';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  /** The approver's note attached to an approved/rejected request, if any. */
  const getDecisionReason = (request: LeaveRequest) => {
    if (request.status === 'approved') return request.approvalReason?.trim() || '';
    if (request.status === 'rejected') return request.rejectionReason?.trim() || '';
    return '';
  };

  const formatDate = (value: Date | string) =>
    new Date(value).toLocaleDateString('en-GB');

  // Filter requests by active tab
  const filteredRequests = requests.filter(r =>
    activeTab === 'wfh' ? r.leaveType === 'wfh' : r.leaveType !== 'wfh'
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {activeTab === 'wfh' ? 'WFH Approvals' : 'Leave Approvals'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
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
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted dark:text-muted-foreground'
          }`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('wfh')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'wfh'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted dark:text-muted-foreground'
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
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted dark:text-muted-foreground'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No {activeTab === 'wfh' ? 'WFH' : 'leave'} requests found
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((request) => {
                    const decisionReason = getDecisionReason(request);
                    const busy = processingId === request.id;

                    return (
                      <tr key={request.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 align-top">
                          <div>
                            <div className="font-medium text-foreground">{request.employeeName}</div>
                            <div className="text-sm text-muted-foreground break-all">{request.employeeEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            {getLeaveTypeLabel(request.leaveType)}
                            {request.halfDay && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                Half Day
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-foreground whitespace-nowrap">
                          {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-foreground whitespace-nowrap">
                          <div>{formatDate(request.startDate)}</div>
                          <div className="text-muted-foreground">to {formatDate(request.endDate)}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-foreground max-w-xs">
                          {request.reason?.trim() ? (
                            <div className="whitespace-pre-wrap break-words">{request.reason}</div>
                          ) : (
                            <span className="text-muted-foreground">No reason provided</span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          {decisionReason && (
                            <div className="mt-1 max-w-[160px] text-xs text-muted-foreground whitespace-pre-wrap break-words">
                              {decisionReason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          {request.status === 'pending' ? (
                            <div className="grid w-fit grid-cols-[auto_auto] gap-1.5">
                              <button
                                onClick={() => handleApprove(request.id!)}
                                disabled={busy}
                                className={`${ACTION_BTN} col-start-1 row-start-1 justify-self-center bg-green-600 hover:bg-green-700`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openApproveModal(request)}
                                disabled={busy}
                                className={`${ACTION_BTN} col-start-1 row-start-2 bg-foreground hover:bg-foreground/90`}
                              >
                                Approve w/ Reason
                              </button>
                              <button
                                onClick={() => handleReject(request.id!)}
                                disabled={busy}
                                className={`${ACTION_BTN} col-start-2 row-start-2 bg-red-600 hover:bg-red-700`}
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => openRejectModal(request)}
                                disabled={busy}
                                className={`${ACTION_BTN} col-start-1 row-start-3 bg-orange-500 hover:bg-orange-600`}
                              >
                                Reject w/ Reason
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              By {request.approverName || 'Manager'}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-border">
              {filteredRequests.map((request) => {
                const decisionReason = getDecisionReason(request);
                const busy = processingId === request.id;

                return (
                  <div key={request.id} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{request.employeeName}</div>
                        <div className="text-sm text-muted-foreground break-all">{request.employeeEmail}</div>
                      </div>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>

                    {/* Leave Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Leave Type</div>
                        <div className="text-foreground font-medium flex items-center gap-2">
                          {getLeaveTypeLabel(request.leaveType)}
                          {request.halfDay && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              Half Day
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Duration</div>
                        <div className="text-foreground font-medium">
                          {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-1">Dates</div>
                      <div className="text-foreground">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-1">Reason</div>
                      <div className="text-foreground break-words whitespace-pre-wrap">
                        {request.reason?.trim() || <span className="text-muted-foreground">No reason provided</span>}
                      </div>
                    </div>

                    {/* Actions or Approver */}
                    {request.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => handleApprove(request.id!)}
                          disabled={busy}
                          className={`${ACTION_BTN} col-start-1 row-start-1 py-2`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openApproveModal(request)}
                          disabled={busy}
                          className={`${ACTION_BTN} col-start-1 row-start-2 py-2`}
                        >
                          Approve w/ Reason
                        </button>
                        <button
                          onClick={() => handleReject(request.id!)}
                          disabled={busy}
                          className={`${ACTION_BTN} col-start-2 row-start-2 py-2 bg-red-600 hover:bg-red-700`}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openRejectModal(request)}
                          disabled={busy}
                          className={`${ACTION_BTN} col-start-1 row-start-3 py-2 bg-orange-500 hover:bg-orange-600`}
                        >
                          Reject w/ Reason
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground pt-2 space-y-1">
                        <div>By {request.approverName || 'Manager'}</div>
                        {decisionReason && (
                          <div className="text-muted-foreground whitespace-pre-wrap break-words">
                            {decisionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Reject with Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-1 text-foreground">Reject Leave Request</h3>
            {selectedRequest && (
              <p className="text-sm text-muted-foreground mb-4">
                {selectedRequest.employeeName} · {getLeaveTypeLabel(selectedRequest.leaveType)} ·{' '}
                {selectedRequest.totalDays} {selectedRequest.totalDays === 1 ? 'day' : 'days'} (
                {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)})
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting this leave request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleRejectWithReason}
                disabled={processingId === selectedRequest?.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted"
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
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-1 text-foreground">Approve Leave Request with Reason</h3>
            {selectedRequest && (
              <p className="text-sm text-muted-foreground mb-4">
                {selectedRequest.employeeName} · {getLeaveTypeLabel(selectedRequest.leaveType)} ·{' '}
                {selectedRequest.totalDays} {selectedRequest.totalDays === 1 ? 'day' : 'days'} (
                {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)})
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason or note for approving this leave request:
            </p>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-green-500"
              rows={4}
              placeholder="Enter approval reason or note..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApproveWithReason}
                disabled={processingId === selectedRequest?.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted"
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
