import React from 'react';
import { Client } from '@/services/client.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ClientListViewProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

/**
 * ClientListView Component
 * Displays clients in a table/list format
 */
export function ClientListView({ 
  clients, 
  onEdit, 
  onDelete,
  selectedIds = new Set(),
  onToggleSelection,
  onToggleSelectAll,
}: ClientListViewProps) {
  const allSelected = clients.length > 0 && clients.every(c => selectedIds.has(c.id!));
  const someSelected = clients.some(c => selectedIds.has(c.id!)) && !allSelected;

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-12">
              {onToggleSelectAll && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all clients"
                />
              )}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">S.No</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Client Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:table-cell">P.A.N.</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:table-cell">T.A.N.</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:table-cell">GSTIN</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td className="px-4 py-3 w-12">
                {onToggleSelection && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client.id!)}
                    onChange={() => onToggleSelection(client.id!)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`Select ${client.clientName}`}
                  />
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                {client.serialNumber || '-'}
              </td>
              <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">
                <div className="truncate max-w-xs" title={client.clientName}>
                  {client.clientName}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                <div className="truncate" title={client.taxIdentifiers?.pan || '-'}>
                  {client.taxIdentifiers?.pan || '-'}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                <div className="truncate" title={client.taxIdentifiers?.tan || '-'}>
                  {client.taxIdentifiers?.tan || '-'}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                <div className="truncate" title={client.taxIdentifiers?.gstin || '-'}>
                  {client.taxIdentifiers?.gstin || '-'}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={client.status === 'active' ? 'default' : 'secondary'}
                  className={`text-[10px] px-2 py-0.5 ${
                    client.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {client.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(client)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    aria-label="Edit client"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(client.id!)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    aria-label="Delete client"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
