'use client';

import React, { useState, useMemo } from 'react';
import { useClients } from '@/hooks/use-clients';
import { Client } from '@/services/client.service';
import { ClientList } from '@/components/clients/ClientList';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientBulkImportModal } from '@/components/clients/ClientBulkImportModal';
import { ClientFilter, ClientFilterState } from '@/components/clients/ClientFilter';
import { Button } from '@/components/ui/button';
import { PlusIcon, CloudArrowUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportClientsToExcel } from '@/utils/client-export.utils';
import { toast } from 'react-toastify';

/**
 * Client Master Page
 * Main page for managing clients with CRUD operations
 * Validates Requirements: 1.1, 1.2, 1.3
 */
export default function ClientsPage() {
  const {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    bulkDeleteClients,
  } = useClients();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ClientFilterState>({
    status: 'all',
    filterBy: 'all',
  });

  // Filter clients based on selected criteria
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(client => client.status === filters.status);
    }

    // Apply field filter - show only rows that have data in the selected field
    if (filters.filterBy !== 'all') {
      result = result.filter(client => {
        switch (filters.filterBy) {
          case 'roc': return !!client.compliance?.roc;
          case 'gstr1': return !!client.compliance?.gstr1;
          case 'gst3b': return !!client.compliance?.gst3b;
          case 'iff': return !!client.compliance?.iff;
          case 'itr': return !!client.compliance?.itr;
          case 'taxAudit': return !!client.compliance?.taxAudit;
          case 'accounting': return !!client.compliance?.accounting;
          case 'clientVisit': return !!client.compliance?.clientVisit;
          case 'bank': return !!client.compliance?.bank;
          case 'tcs': return !!client.compliance?.tcs;
          case 'tds': return !!client.compliance?.tds;
          case 'statutoryAudit': return !!client.compliance?.statutoryAudit;
          default: return true;
        }
      });
    }

    // Sort by serial number (S.No) in ascending order
    result.sort((a, b) => {
      const aNum = a.serialNumber || '';
      const bNum = b.serialNumber || '';
      return aNum.localeCompare(bNum);
    });

    return result;
  }, [clients, filters]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: ClientFilterState) => {
    setFilters(newFilters);
  };

  /**
   * Handle clear filters
   */
  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      filterBy: 'all',
    });
  };

  /**
   * Handle opening the create modal
   */
  const handleAddNew = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  /**
   * Handle opening the import modal
   */
  const handleImport = () => {
    setIsImportModalOpen(true);
  };

  /**
   * Handle import completion
   */
  const handleImportComplete = () => {
    // Refresh the client list
    window.location.reload();
  };

  /**
   * Handle export to Excel
   */
  const handleExport = () => {
    console.log('Export clicked, filtered clients:', filteredClients.length);
    
    if (filteredClients.length === 0) {
      toast.error('No clients to export');
      return;
    }
    
    try {
      toast.info('Preparing export...');
      console.log('Calling exportClientsToExcel...');
      exportClientsToExcel(filteredClients);
      console.log('Export function completed');
      toast.success(`Successfully exported ${filteredClients.length} clients to Excel`);
    } catch (error) {
      console.error('Error exporting clients:', error);
      toast.error('Failed to export clients. Please try again.');
    }
  };

  /**
   * Handle opening the edit modal
   */
  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  /**
   * Handle delete with confirmation
   * Validates Requirements: 1.6
   */
  const handleDelete = async (id: string) => {
    // Show confirmation dialog
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      
      // Use browser's confirm dialog for now
      const confirmed = window.confirm(
        'Are you sure you want to delete this client? This action cannot be undone.'
      );
      
      if (!confirmed) {
        setDeleteConfirmId(null);
        return;
      }
    }

    try {
      await deleteClient(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  /**
   * Handle bulk delete with confirmation
   */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} client(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await bulkDeleteClients(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting clients:', error);
      alert('Failed to delete clients. Please try again.');
    }
  };

  /**
   * Handle selection toggle
   */
  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Handle select all toggle
   */
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id!)));
    }
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      const clientData = {
        clientName: data.clientName,
        serialNumber: data.serialNumber || undefined,
        businessName: data.businessName || undefined,
        taxIdentifiers: (data.pan || data.tan || data.gstin) ? {
          pan: data.pan || undefined,
          tan: data.tan || undefined,
          gstin: data.gstin || undefined,
        } : undefined,
        contact: (data.email || data.phone) ? {
          email: data.email || undefined,
          phone: data.phone || undefined,
        } : undefined,
        address: (data.address || data.city || data.state || data.country || data.zipCode) ? {
          line1: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          country: data.country || undefined,
          zipCode: data.zipCode || undefined,
        } : undefined,
        compliance: {
          roc: data.complianceRoc ?? false,
          gstr1: data.complianceGstr1 ?? false,
          gst3b: data.complianceGst3b ?? false,
          iff: data.complianceIff ?? false,
          itr: data.complianceItr ?? false,
          taxAudit: data.complianceTaxAudit ?? false,
          accounting: data.complianceAccounting ?? false,
          clientVisit: data.complianceClientVisit ?? false,
          bank: data.complianceBank ?? false,
          tcs: data.complianceTcs ?? false,
          tds: data.complianceTds ?? false,
          statutoryAudit: data.complianceStatutoryAudit ?? false,
        },
        status: data.status,
      };

      if (selectedClient) {
        await updateClient(selectedClient.id!, clientData);
      } else {
        await createClient(clientData);
      }

      setIsModalOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error submitting client:', error);
      throw error; // Let the modal handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Client Master
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your client information and contacts
          </p>
        </div>

        {/* Add New Client Button */}
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="flex items-center gap-2"
              size="lg"
            >
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
            size="lg"
            disabled={filteredClients.length === 0}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export to Excel
          </Button>
          <Button
            onClick={handleImport}
            variant="outline"
            className="flex items-center gap-2"
            size="lg"
          >
            <CloudArrowUpIcon className="w-5 h-5" />
            Bulk Import
          </Button>
          <Button
            onClick={handleAddNew}
            className="flex items-center gap-2 text-white"
            size="lg"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading clients</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Filters */}
      <ClientFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* View Toggle Buttons */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
            aria-label="List view"
          >
            List
          </button>
        </div>
      </div>

      {/* Client List */}
      <ClientList
        clients={filteredClients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {/* Client Modal (Create/Edit) */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        client={selectedClient}
        isLoading={isSubmitting}
      />

      {/* Bulk Import Modal */}
      <ClientBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}