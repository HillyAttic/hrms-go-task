import * as XLSX from 'xlsx';
import { Client } from '@/services/client.service';
import { format } from 'date-fns';

/**
 * Export clients to Excel format
 * Includes all fields that can be imported, maintaining consistency with the import template
 */
export function exportClientsToExcel(clients: Client[]): void {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data with all fields matching the import template
    const rows = clients.map(client => ({
      'S.No': client.serialNumber || '',
      'Client Name': client.clientName,
      'Business Name': client.businessName || '',
      'P.A.N.': client.taxIdentifiers?.pan || '',
      'T.A.N.': client.taxIdentifiers?.tan || '',
      'GSTIN': client.taxIdentifiers?.gstin || '',
      'Email': client.contact?.email || '',
      'Phone': client.contact?.phone || '',
      'Address': client.address?.line1 || '',
      'City': client.address?.city || '',
      'State': client.address?.state || '',
      'Country': client.address?.country || '',
      'Zip Code': client.address?.zipCode || '',
      'ROC': client.compliance?.roc ? 'Y' : 'N',
      'GSTR1': client.compliance?.gstr1 ? 'Y' : 'N',
      'GST3B': client.compliance?.gst3b ? 'Y' : 'N',
      'IFF': client.compliance?.iff ? 'Y' : 'N',
      'ITR': client.compliance?.itr ? 'Y' : 'N',
      'Tax Audit': client.compliance?.taxAudit ? 'Y' : 'N',
      'Accounting': client.compliance?.accounting ? 'Y' : 'N',
      'Client Visit': client.compliance?.clientVisit ? 'Y' : 'N',
      'Bank': client.compliance?.bank ? 'Y' : 'N',
      'TCS': client.compliance?.tcs ? 'Y' : 'N',
      'TDS': client.compliance?.tds ? 'Y' : 'N',
      'Statutory Audit': client.compliance?.statutoryAudit ? 'Y' : 'N',
    }));
    
    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 8 },  // S.No
      { wch: 25 }, // Client Name
      { wch: 25 }, // Business Name
      { wch: 15 }, // P.A.N.
      { wch: 15 }, // T.A.N.
      { wch: 18 }, // GSTIN
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 12 }, // Country
      { wch: 10 }, // Zip Code
      { wch: 6 },  // ROC
      { wch: 7 },  // GSTR1
      { wch: 7 },  // GST3B
      { wch: 6 },  // IFF
      { wch: 6 },  // ITR
      { wch: 10 }, // Tax Audit
      { wch: 12 }, // Accounting
      { wch: 12 }, // Client Visit
      { wch: 6 },  // Bank
      { wch: 6 },  // TCS
      { wch: 6 },  // TDS
      { wch: 14 }, // Statutory Audit
    ];
    ws['!cols'] = colWidths;
    
    // Create metadata sheet
    const metadata = [
      ['Export Information', ''],
      ['Total Clients', clients.length],
      ['Export Date', format(new Date(), 'MMM dd, yyyy HH:mm')],
      ['', ''],
      ['Import Instructions', ''],
      ['Required Fields', 'Client Name'],
      ['Compliance Fields', 'ROC, GSTR1, GST3B, IFF, ITR, Tax Audit, Accounting, Client Visit, Bank, TCS, TDS, Statutory Audit'],
      ['Compliance Values', 'Y (Yes) or N (No)'],
      ['', ''],
      ['Note', 'This file can be used as a template for bulk import. Only Client Name is required.'],
    ];
    
    const metaWs = XLSX.utils.aoa_to_sheet(metadata);
    metaWs['!cols'] = [{ wch: 25 }, { wch: 60 }];
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, metaWs, 'Info');
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    
    // Save the file
    const fileName = `Clients_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error in exportClientsToExcel:', error);
    throw new Error('Failed to export clients to Excel. Please check browser console for details.');
  }
}

/**
 * Export filtered clients to Excel
 * Same as exportClientsToExcel but accepts a custom file name suffix
 */
export function exportFilteredClientsToExcel(
  clients: Client[],
  filterDescription?: string
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data
  const rows = clients.map(client => ({
    'S.No': client.serialNumber || '',
    'Client Name': client.clientName,
    'Business Name': client.businessName || '',
    'P.A.N.': client.taxIdentifiers?.pan || '',
    'T.A.N.': client.taxIdentifiers?.tan || '',
    'GSTIN': client.taxIdentifiers?.gstin || '',
    'Email': client.contact?.email || '',
    'Phone': client.contact?.phone || '',
    'Address': client.address?.line1 || '',
    'City': client.address?.city || '',
    'State': client.address?.state || '',
    'Country': client.address?.country || '',
    'Zip Code': client.address?.zipCode || '',
    'ROC': client.compliance?.roc ? 'Y' : 'N',
    'GSTR1': client.compliance?.gstr1 ? 'Y' : 'N',
    'GST3B': client.compliance?.gst3b ? 'Y' : 'N',
    'IFF': client.compliance?.iff ? 'Y' : 'N',
    'ITR': client.compliance?.itr ? 'Y' : 'N',
    'Tax Audit': client.compliance?.taxAudit ? 'Y' : 'N',
    'Accounting': client.compliance?.accounting ? 'Y' : 'N',
    'Client Visit': client.compliance?.clientVisit ? 'Y' : 'N',
    'Bank': client.compliance?.bank ? 'Y' : 'N',
    'TCS': client.compliance?.tcs ? 'Y' : 'N',
    'TDS': client.compliance?.tds ? 'Y' : 'N',
    'Statutory Audit': client.compliance?.statutoryAudit ? 'Y' : 'N',
  }));
  
  const ws = XLSX.utils.json_to_sheet(rows);
  
  const colWidths = [
    { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
    { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    { wch: 10 }, { wch: 6 }, { wch: 7 }, { wch: 7 }, { wch: 6 }, { wch: 6 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 14 },
  ];
  ws['!cols'] = colWidths;
  
  // Create metadata sheet
  const metadata = [
    ['Export Information', ''],
    ['Total Clients', clients.length],
    ['Export Date', format(new Date(), 'MMM dd, yyyy HH:mm')],
  ];
  
  if (filterDescription) {
    metadata.push(['Filter Applied', filterDescription]);
  }
  
  metadata.push(
    ['', ''],
    ['Import Instructions', ''],
    ['Required Fields', 'Client Name'],
    ['Compliance Fields', 'ROC, GSTR1, GST3B, IFF, ITR, Tax Audit, Accounting, Client Visit, Bank, TCS, TDS, Statutory Audit'],
    ['Compliance Values', 'Y (Yes) or N (No)'],
  );
  
  const metaWs = XLSX.utils.aoa_to_sheet(metadata);
  metaWs['!cols'] = [{ wch: 25 }, { wch: 60 }];
  
  XLSX.utils.book_append_sheet(wb, metaWs, 'Info');
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  
  // Generate filename
  const suffix = filterDescription 
    ? `_${filterDescription.replace(/[^a-z0-9]/gi, '_')}` 
    : '';
  const fileName = `Clients_Export${suffix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
