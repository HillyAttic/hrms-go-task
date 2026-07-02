import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { RecurringTask } from '@/services/recurring-task.service';
import { Client } from '@/services/client.service';
import { ClientTaskCompletion } from '@/services/task-completion.service';
import { format, isFuture, isToday, startOfMonth } from 'date-fns';

interface MonthData {
  key: string;
  monthName: string;
  year: string;
  fullDate: Date;
}

interface ExportData {
  task: RecurringTask;
  clients: Client[];
  completions: ClientTaskCompletion[];
  months: MonthData[];
  isTeamMemberView?: boolean;
  teamMemberName?: string;
  isUnassignedView?: boolean;
}

/**
 * Export report to PDF format
 */
export function exportToPDF(data: ExportData): void {
  const { task, clients, completions, months, isTeamMemberView, teamMemberName, isUnassignedView } = data;

  const doc = new jsPDF('landscape');
  
  // Add title
  const title = isUnassignedView
    ? `${task.title} - Unassigned Clients`
    : isTeamMemberView
    ? `${task.title} - ${teamMemberName}`
    : task.title;
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  // Add metadata
  doc.setFontSize(10);
  doc.text(`Recurrence: ${task.recurrencePattern}`, 14, 22);
  doc.text(`Total Clients: ${clients.length}`, 14, 27);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 32);
  
  // Prepare table data — store statuses for use in didDrawCell (jsPDF default fonts don't support Unicode ✓/✗)
  const headers = ['Client Name', ...months.map(m => `${m.monthName} ${m.year}`)];
  const statusMap: ('completed' | 'incomplete' | 'future')[][] = [];
  const rows = clients.map((client, ri) => {
    statusMap[ri] = [];
    const row: string[] = [client.clientName];
    months.forEach((month, mi) => {
      const status = getCompletionStatus(completions, client.id || '', month.key, month.fullDate);
      statusMap[ri][mi] = status;
      row.push(''); // empty — symbols drawn manually in didDrawCell
    });
    return row;
  });

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 38,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index > 0) {
        const status = statusMap[data.row.index]?.[data.column.index - 1];
        if (status === 'completed') {
          data.cell.styles.fillColor = [220, 252, 231]; // light green bg
        } else if (status === 'incomplete') {
          data.cell.styles.fillColor = [254, 226, 226]; // light red bg
        }
      }
    },
    didDrawCell: function(data) {
      if (data.section === 'body' && data.column.index > 0) {
        const status = statusMap[data.row.index]?.[data.column.index - 1];
        const cx = data.cell.x + data.cell.width / 2;
        const cy = data.cell.y + data.cell.height / 2;
        const s = 1.8;

        if (status === 'completed') {
          // Draw green checkmark ✓
          doc.setDrawColor(22, 163, 74);
          doc.setLineWidth(0.8);
          doc.line(cx - s, cy + 0.2, cx - s * 0.25, cy + s * 0.85);
          doc.line(cx - s * 0.25, cy + s * 0.85, cx + s, cy - s * 0.75);
        } else if (status === 'incomplete') {
          // Draw red cross ✗
          doc.setDrawColor(220, 38, 38);
          doc.setLineWidth(0.8);
          doc.line(cx - s * 0.7, cy - s * 0.7, cx + s * 0.7, cy + s * 0.7);
          doc.line(cx + s * 0.7, cy - s * 0.7, cx - s * 0.7, cy + s * 0.7);
        } else {
          // Draw gray dash for future
          doc.setDrawColor(156, 163, 175);
          doc.setLineWidth(0.5);
          doc.line(cx - s * 0.5, cy, cx + s * 0.5, cy);
        }
      }
    },
  });

  // Add legend
  const finalY = (doc as any).lastAutoTable.finalY || 38;
  doc.setFontSize(9);
  doc.text('Legend: Green (tick) = Completed  |  Red (cross) = Incomplete  |  Gray dash = Future', 14, finalY + 10);
  
  // Save the PDF
  const fileName = isUnassignedView
    ? `${sanitizeFileName(task.title)}_Unassigned_${format(new Date(), 'yyyyMMdd')}.pdf`
    : isTeamMemberView
    ? `${sanitizeFileName(task.title)}_${sanitizeFileName(teamMemberName || '')}_${format(new Date(), 'yyyyMMdd')}.pdf`
    : `${sanitizeFileName(task.title)}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}

/**
 * Export report to Excel format
 */
export function exportToExcel(data: ExportData): void {
  const { task, clients, completions, months, isTeamMemberView, teamMemberName, isUnassignedView } = data;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for the main sheet
  const headers = ['Client Name', 'PAN', ...months.map(m => `${m.monthName} ${m.year}`)];
  const rows = clients.map(client => {
    const row: any = { 'Client Name': client.clientName, 'PAN': client.taxIdentifiers?.pan || '-' };
    months.forEach(month => {
      const status = getCompletionStatus(completions, client.id || '', month.key, month.fullDate);
      row[`${month.monthName} ${month.year}`] = 
        status === 'completed' ? 'Completed' : 
        status === 'incomplete' ? 'Incomplete' : 
        'Future';
    });
    return row;
  });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  
  // Set column widths
  const colWidths = [{ wch: 30 }, { wch: 18 }, ...months.map(() => ({ wch: 12 }))];
  ws['!cols'] = colWidths;
  
  // Add metadata sheet
  const metadata = [
    ['Task Name', task.title],
    ['Recurrence Pattern', task.recurrencePattern],
    ['Total Clients', clients.length],
    ['Generated Date', format(new Date(), 'MMM dd, yyyy HH:mm')],
  ];
  
  if (isUnassignedView) {
    metadata.push(['View', 'Unassigned Clients']);
  } else if (isTeamMemberView && teamMemberName) {
    metadata.push(['Team Member', teamMemberName]);
  }
  
  const metaWs = XLSX.utils.aoa_to_sheet(metadata);
  metaWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
  
  // Add sheets to workbook
  XLSX.utils.book_append_sheet(wb, metaWs, 'Info');
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  
  // Save the file
  const fileName = isUnassignedView
    ? `${sanitizeFileName(task.title)}_Unassigned_${format(new Date(), 'yyyyMMdd')}.xlsx`
    : isTeamMemberView
    ? `${sanitizeFileName(task.title)}_${sanitizeFileName(teamMemberName || '')}_${format(new Date(), 'yyyyMMdd')}.xlsx`
    : `${sanitizeFileName(task.title)}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export summary report with all tasks to Excel
 */
export function exportSummaryToExcel(
  tasks: RecurringTask[],
  clients: Client[],
  completionsMap: Map<string, ClientTaskCompletion[]>
): void {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = tasks.map(task => {
    const taskClients = getTaskClients(task, clients);
    const taskCompletions = completionsMap.get(task.id || '') || [];
    const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);
    
    return {
      'Task Name': task.title,
      'Recurrence': task.recurrencePattern,
      'Total Clients': taskClients.length,
      'Completion Rate': `${completionRate}%`,
      'Has Team Mapping': task.teamMemberMappings && task.teamMemberMappings.length > 0 ? 'Yes' : 'No',
    };
  });
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
  ];
  
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Save the file
  const fileName = `Reports_Summary_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export summary report with all tasks to PDF
 */
export function exportSummaryToPDF(
  tasks: RecurringTask[],
  clients: Client[],
  completionsMap: Map<string, ClientTaskCompletion[]>
): void {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Reports Summary', 14, 15);
  
  // Add metadata
  doc.setFontSize(10);
  doc.text(`Total Tasks: ${tasks.length}`, 14, 25);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 30);
  
  // Prepare table data
  const headers = ['Task Name', 'Recurrence', 'Clients', 'Completion', 'Team Mapped'];
  const rows = tasks.map(task => {
    const taskClients = getTaskClients(task, clients);
    const taskCompletions = completionsMap.get(task.id || '') || [];
    const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);
    const hasTeamMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;
    
    return [
      task.title,
      task.recurrencePattern,
      taskClients.length.toString(),
      `${completionRate}%`,
      hasTeamMapping ? 'Yes' : 'No'
    ];
  });
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' }
    }
  });
  
  // Save the PDF
  const fileName = `Reports_Summary_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}

// Helper functions

function getCompletionStatus(
  completions: ClientTaskCompletion[],
  clientId: string,
  monthKey: string,
  monthDate: Date
): 'completed' | 'incomplete' | 'future' {
  const monthStart = startOfMonth(monthDate);
  
  if (isFuture(monthStart) && !isToday(monthStart)) {
    return 'future';
  }
  
  const completion = completions.find(
    c => c.clientId === clientId && c.monthKey === monthKey && c.isCompleted
  );
  
  return completion ? 'completed' : 'incomplete';
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function getTaskClients(task: RecurringTask, allClients: Client[]): Client[] {
  if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
    const allMappedClientIds = new Set<string>();
    task.teamMemberMappings.forEach(mapping => {
      mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
    });
    return allClients.filter(c => c.id && allMappedClientIds.has(c.id));
  }
  return allClients.filter(c => c.id && task.contactIds?.includes(c.id));
}

function calculateCompletionRate(
  task: RecurringTask,
  clientCount: number,
  taskCompletions: ClientTaskCompletion[]
): number {
  if (clientCount === 0) return 0;
  
  const months = generateMonthsForCalculation(task.recurrencePattern);
  const totalExpected = clientCount * months.filter(m => !isFuture(m) || isToday(startOfMonth(m))).length;
  
  if (totalExpected === 0) return 0;
  
  const completed = taskCompletions.filter(c => c.isCompleted).length;
  return Math.round((completed / totalExpected) * 100);
}

function generateMonthsForCalculation(recurrencePattern: string): Date[] {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const endYear = currentYear + 5;
  const endMonth = 11;
  
  const allMonths: Date[] = [];
  for (let year = currentYear; year <= endYear; year++) {
    const firstMonth = (year === currentYear) ? currentMonth : 0;
    const lastMonth = (year === endYear) ? endMonth : 11;
    
    for (let month = firstMonth; month <= lastMonth; month++) {
      allMonths.push(new Date(year, month, 1));
    }
  }

  switch (recurrencePattern) {
    case 'monthly':
      return allMonths;
    case 'quarterly':
      return allMonths.filter((_, index) => index % 3 === 0);
    case 'half-yearly':
      return allMonths.filter((_, index) => index % 6 === 0);
    case 'yearly':
      return allMonths.filter((_, index) => index % 12 === 0);
    default:
      return allMonths;
  }
}
