'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  PlusCircleIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  ArchiveBoxIcon,
  UserCircleIcon,
  BriefcaseIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { pendingInvoiceService, type PendingInvoice } from '@/services/pending-invoice.service';
import { CreateEditInvoiceModal } from '@/components/admin/CreateEditInvoiceModal';
import { EyeIcon } from '@heroicons/react/24/outline';

type ActiveTab = 'pending' | 'archived';

export default function PendingInvoicesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PendingInvoice | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'archive' | null;
    invoiceId: string | null;
    isLoading: boolean;
  }>({ isOpen: false, type: null, invoiceId: null, isLoading: false });
  const [viewingInvoice, setViewingInvoice] = useState<PendingInvoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pendingInvoiceService.getAll(activeTab);
      setInvoices(data);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreate = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: PendingInvoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleView = (invoice: PendingInvoice) => {
    setViewingInvoice(invoice);
  };

  const handleSave = async (invoiceData: Omit<PendingInvoice, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>) => {
    setIsSaving(true);
    try {
      if (editingInvoice?.id) {
        await pendingInvoiceService.update(editingInvoice.id, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        await pendingInvoiceService.create(invoiceData);
        toast.success('Invoice created successfully');
      }
      setIsModalOpen(false);
      fetchInvoices();
    } catch {
      toast.error('Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const openArchiveConfirm = (invoiceId: string) => {
    setConfirmDialog({ isOpen: true, type: 'archive', invoiceId, isLoading: false });
  };

  const openDeleteConfirm = (invoiceId: string) => {
    setConfirmDialog({ isOpen: true, type: 'delete', invoiceId, isLoading: false });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, type: null, invoiceId: null, isLoading: false });
  };

  const confirmAction = async () => {
    if (!confirmDialog.invoiceId) return;
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      if (confirmDialog.type === 'archive') {
        await pendingInvoiceService.archive(confirmDialog.invoiceId);
        toast.success('Invoice marked as complete');
      } else {
        await pendingInvoiceService.delete(confirmDialog.invoiceId);
        toast.success('Invoice deleted');
      }
      closeConfirm();
      fetchInvoices();
    } catch {
      toast.error(`Failed to ${confirmDialog.type} invoice`);
      setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Pending Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage invoice requests
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <PlusCircleIcon className="w-5 h-5" />
          New Invoice
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 sm:pb-4 px-1 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'pending'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <ArchiveBoxIcon className="w-4 h-4" />
                Pending
                {activeTab === 'pending' && invoices.length > 0 && (
                  <span className="bg-accent text-accent-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                    {invoices.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`pb-3 sm:pb-4 px-1 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'archived'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircleSolidIcon className="w-4 h-4" />
                Archived
                {activeTab === 'archived' && invoices.length > 0 && (
                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {invoices.length}
                  </span>
                )}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <ArchiveBoxIcon className="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
            No {activeTab} invoices
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'pending'
              ? 'Create a new invoice to get started'
              : 'Completed invoices will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow ${
                activeTab === 'archived' ? 'opacity-80' : ''
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                {activeTab === 'archived' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    <CheckCircleSolidIcon className="w-3.5 h-3.5" />
                    Archived
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                    <ArchiveBoxIcon className="w-3.5 h-3.5" />
                    Pending
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(invoice.createdAt)}
                </span>
              </div>

              {/* Card body */}
              <div className="space-y-2 mb-4">
                {invoice.clientName && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Client: </span>
                    <span className="font-medium text-gray-900 dark:text-white break-words">{invoice.clientName}</span>
                  </div>
                )}
                {invoice.services && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Services: </span>
                    <span className="font-medium text-gray-900 dark:text-white break-words">{invoice.services}</span>
                  </div>
                )}
                {invoice.amount != null && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.amount)}</span>
                  </div>
                )}
                {invoice.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 break-words">{invoice.description}</p>
                )}
                {invoice.remark && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic break-words">📌 {invoice.remark}</p>
                )}
                {activeTab === 'archived' && invoice.archivedAt && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                    Archived: {formatDate(invoice.archivedAt)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                {activeTab === 'pending' ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(invoice)}
                      className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 dark:text-blue-400"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(invoice)}
                      className="flex items-center justify-center gap-1 text-xs"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openArchiveConfirm(invoice.id!)}
                      className="flex items-center justify-center gap-1 text-xs text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 dark:text-green-400"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteConfirm(invoice.id!)}
                      className="flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(invoice)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 dark:text-blue-400"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteConfirm(invoice.id!)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateEditInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingInvoice={editingInvoice}
        isLoading={isSaving}
      />

      {/* View Invoice Modal */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              Invoice Details
            </DialogTitle>
            <DialogDescription className="text-sm">
              Complete information about this invoice request
            </DialogDescription>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4 sm:space-y-6 py-4">
              {/* Status Banner */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {viewingInvoice.archivedAt ? (
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-full">
                          <CheckCircleSolidIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            Archived
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invoice completed</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-full">
                          <ArchiveBoxIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                            Pending
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Awaiting completion</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-xs">Created</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(viewingInvoice.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Main Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {viewingInvoice.clientName && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <UserCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Client Name</label>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white break-words">{viewingInvoice.clientName}</p>
                      </div>
                    </div>
                  </div>
                )}

                {viewingInvoice.services && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <BriefcaseIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Services</label>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white break-words">{viewingInvoice.services}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Highlight */}
              {viewingInvoice.amount != null && (
                <div className="bg-muted rounded-lg p-4 sm:p-5 border-2 border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 bg-background rounded-xl border-2 border-border">
                      <CurrencyRupeeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">Invoice Amount</label>
                      <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(viewingInvoice.amount)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {viewingInvoice.description && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <DocumentTextIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</label>
                      <p className="mt-2 text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed break-words">{viewingInvoice.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Remark */}
              {viewingInvoice.remark && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 sm:p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                      <ChatBubbleLeftIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">Important Remark</label>
                      <p className="mt-2 text-sm text-amber-900 dark:text-amber-100 font-medium break-words">📌 {viewingInvoice.remark}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Timeline</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Created</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(viewingInvoice.createdAt)}</span>
                  </div>
                  {viewingInvoice.updatedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(viewingInvoice.updatedAt)}</span>
                    </div>
                  )}
                  {viewingInvoice.archivedAt && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-green-600 dark:text-green-400 font-medium">Archived</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(viewingInvoice.archivedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setViewingInvoice(null)} className="gap-2 w-full sm:w-auto">
              Close
            </Button>
            {viewingInvoice && !viewingInvoice.archivedAt && (
              <Button onClick={() => { setViewingInvoice(null); handleEdit(viewingInvoice); }} className="gap-2 w-full sm:w-auto">
                <PencilIcon className="w-4 h-4" />
                Edit Invoice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent className="sm:max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {confirmDialog.type === 'archive' ? 'Mark as Complete' : 'Delete Invoice'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {confirmDialog.type === 'archive'
                ? 'Are you sure you want to mark this invoice as complete and move it to the archive?'
                : 'Are you sure you want to delete this invoice? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={closeConfirm} disabled={confirmDialog.isLoading} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant={confirmDialog.type === 'delete' ? 'danger' : 'default'}
              onClick={confirmAction}
              loading={confirmDialog.isLoading}
              disabled={confirmDialog.isLoading}
              className="w-full sm:w-auto"
            >
              {confirmDialog.type === 'archive' ? 'Complete & Archive' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
