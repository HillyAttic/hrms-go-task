import React, { useState, useMemo } from 'react';
import { Client } from '@/services/client.service';
import { ClientCard } from './ClientCard';
import { ClientListView } from './ClientListView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import { MagnifyingGlassIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

/**
 * ClientList Component
 * Displays clients in a responsive grid with search, filter, and pagination
 * Validates Requirements: 1.1, 1.7, 1.10
 */
export function ClientList({ 
  clients, 
  onEdit, 
  onDelete, 
  isLoading = false,
  viewMode = 'list',
  selectedIds = new Set(),
  onToggleSelection,
  onToggleSelectAll,
}: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Increased from 20 to 50

  // Filter and search clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Apply search filter (case-insensitive search across name, email, and businessName)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(client =>
        client.clientName.toLowerCase().includes(query) ||
        (client.serialNumber && client.serialNumber.toLowerCase().includes(query)) ||
        (client.contact?.email && client.contact.email.toLowerCase().includes(query)) ||
        (client.businessName && client.businessName.toLowerCase().includes(query)) ||
        (client.contact?.phone && client.contact.phone.toLowerCase().includes(query)) ||
        (client.taxIdentifiers?.gstin && client.taxIdentifiers.gstin.toLowerCase().includes(query)) ||
        (client.taxIdentifiers?.pan && client.taxIdentifiers.pan.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [clients, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);
  const showPagination = filteredClients.length > itemsPerPage;

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by S.No, name, email, business, phone, GSTIN, or PAN..."
              disabled
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              disabled
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-dark opacity-50"
            >
              <option>All Status</option>
            </select>
          </div>
        </div>

        {/* Loading Skeleton */}
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by S.No, name, email, business, phone, GSTIN, or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search clients"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} of {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>All</option>
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
        </div>
      </div>

      {/* Client Grid/List */}
      {paginatedClients.length === 0 ? (
        searchQuery || statusFilter !== 'all' ? (
          <NoResultsEmptyState 
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        ) : (
          <NoDataEmptyState entityName="Clients" />
        )
      ) : viewMode === 'list' ? (
        <ClientListView
          clients={paginatedClients}
          onEdit={onEdit}
          onDelete={onDelete}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onToggleSelectAll={onToggleSelectAll}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
