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
 * Displays clients in a comprehensive table/list format with all fields
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

  // Helper to render compliance badge
  const ComplianceBadge = ({ value }: { value?: boolean }) => (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded ${
      value 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    }`}>
      {value ? 'Y' : 'N'}
    </span>
  );

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-10 sticky left-0 bg-gray-50 dark:bg-gray-800">
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
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-10 bg-gray-50 dark:bg-gray-800" style={{ minWidth: '60px' }}>S.No</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-[110px] bg-gray-50 dark:bg-gray-800" style={{ minWidth: '180px' }}>Client Name</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '150px' }}>Business Name</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '100px' }}>P.A.N.</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '100px' }}>T.A.N.</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '120px' }}>GSTIN</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '180px' }}>Email</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '110px' }}>Phone</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '150px' }}>Address</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '100px' }}>City</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '100px' }}>State</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '80px' }}>Country</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '80px' }}>Zip Code</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '50px' }}>ROC</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '60px' }}>GSTR1</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '60px' }}>GST3B</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '50px' }}>IFF</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '50px' }}>ITR</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '80px' }}>Tax Audit</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '90px' }}>Accounting</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '90px' }}>Client Visit</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '50px' }}>Bank</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '50px' }}>TCS</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '50px' }}>TDS</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '110px' }}>Statutory Audit</th>
            <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300" style={{ minWidth: '70px' }}>Status</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky right-0 bg-gray-50 dark:bg-gray-800" style={{ minWidth: '80px' }}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td className="px-2 py-2 w-10 sticky left-0 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
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
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300 font-medium sticky left-10 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                {client.serialNumber || '-'}
              </td>
              <td className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white sticky left-[110px] bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="truncate" title={client.clientName}>
                  {client.clientName}
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="truncate" title={client.businessName || '-'}>
                  {client.businessName || '-'}
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.taxIdentifiers?.pan || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.taxIdentifiers?.tan || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.taxIdentifiers?.gstin || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="truncate" title={client.contact?.email || '-'}>
                  {client.contact?.email || '-'}
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.contact?.phone || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="truncate" title={client.address?.line1 || '-'}>
                  {client.address?.line1 || '-'}
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.address?.city || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.address?.state || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.address?.country || '-'}
              </td>
              <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300">
                {client.address?.zipCode || '-'}
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.roc} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.gstr1} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.gst3b} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.iff} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.itr} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.taxAudit} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.accounting} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.clientVisit} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.bank} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.tcs} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.tds} />
              </td>
              <td className="px-2 py-2 text-center">
                <ComplianceBadge value={client.compliance?.statutoryAudit} />
              </td>
              <td className="px-2 py-2 text-center">
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
              <td className="px-2 py-2 sticky right-0 bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-1 justify-center">
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
