import React, { useState, useMemo } from 'react';
import { Project } from '@/services/project.service';
import { ProjectCard } from './ProjectCard';
import { ProjectListView } from './ProjectListView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function ProjectList({
  projects,
  onEdit,
  onDelete,
  isLoading = false,
  viewMode = 'list',
  selectedIds = new Set(),
  onToggleSelection,
  onToggleSelectAll,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'wip' | 'completed' | 'pending_approval'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filter and search
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.projectNumber?.toLowerCase().includes(q) ||
          p.clientSpoc?.name?.toLowerCase().includes(q) ||
          p.teamMembers?.some((m) => m.name.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [projects, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
  const showPagination = filteredProjects.length > itemsPerPage;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handlePreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search projects..."
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
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by project name, ID, client, team member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search projects"
          />
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-dark"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="wip">WIP</option>
            <option value="completed">Completed</option>
            <option value="pending_approval">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {Math.min(startIndex + 1, filteredProjects.length || 1)}-
          {Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} project
          {filteredProjects.length !== 1 ? 's' : ''}
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

      {/* Grid or List */}
      {paginatedProjects.length === 0 ? (
        searchQuery || statusFilter !== 'all' ? (
          <NoResultsEmptyState
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        ) : (
          <NoDataEmptyState entityName="Projects" />
        )
      ) : viewMode === 'list' ? (
        <ProjectListView
          projects={paginatedProjects}
          onEdit={onEdit}
          onDelete={onDelete}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onToggleSelectAll={onToggleSelectAll}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
              Next
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
