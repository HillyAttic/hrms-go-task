/**
 * THROWAWAY PROTOTYPE — shared mock data for the ten dashboard variants.
 * No Firestore, no auth, no mutations.
 */

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'muted' | 'primary';
export type TaskStatus = 'done' | 'active' | 'pending' | 'overdue';

export const statusLabel: Record<TaskStatus, string> = {
  done: 'Done',
  active: 'In progress',
  pending: 'Pending',
  overdue: 'Overdue',
};

export const stats = [
  { label: 'Total tasks', short: 'Total', value: 128, delta: '+12%', dir: 'up' as const, spark: [8, 12, 9, 14, 11, 16, 13], tone: 'primary' },
  { label: 'Completed', short: 'Done', value: 74, delta: '+8%', dir: 'up' as const, spark: [5, 8, 7, 10, 9, 12, 10], tone: 'good' as const },
  { label: 'In progress', short: 'Active', value: 23, delta: '−3%', dir: 'down' as const, spark: [4, 6, 5, 7, 6, 8, 7], tone: 'warn' as const },
  { label: 'To do', short: 'To do', value: 31, delta: '+5%', dir: 'up' as const, spark: [6, 7, 6, 8, 7, 9, 8], tone: 'info' as const },
  { label: 'Overdue', short: 'Late', value: 6, delta: '+2', dir: 'up' as const, spark: [3, 2, 3, 1, 2, 1, 2], tone: 'bad' as const },
];

export const team = [
  { name: 'Marcus Lee', role: 'Manager', done: 34, active: 6, pending: 4, load: 78 },
  { name: 'Priya Nair', role: 'Senior associate', done: 29, active: 9, pending: 5, load: 82 },
  { name: 'Tomás Herrera', role: 'Associate', done: 24, active: 5, pending: 3, load: 61 },
  { name: 'Grace Okafor', role: 'Associate', done: 21, active: 8, pending: 6, load: 69 },
  { name: 'Daniel Whitmore', role: 'Analyst', done: 17, active: 3, pending: 2, load: 44 },
];

export const weekly = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  created: [12, 18, 14, 22, 19, 6, 3],
  completed: [8, 15, 11, 19, 17, 5, 2],
};

export const tasks: {
  no: string;
  title: string;
  client: string;
  owner: string;
  due: string;
  status: TaskStatus;
  progress: number;
  priority: 'High' | 'Medium' | 'Low';
}[] = [
  { no: '01', title: 'Q4 GST filing', client: 'Northwind Academy', owner: 'Priya Nair', due: 'Today', status: 'overdue', progress: 62, priority: 'High' },
  { no: '02', title: 'Reconcile October payroll', client: 'Meridian Prep', owner: 'Marcus Lee', due: '30 Oct', status: 'active', progress: 80, priority: 'High' },
  { no: '03', title: 'MIS workbook refresh', client: 'Internal', owner: 'Aisha Rahman', due: '31 Oct', status: 'pending', progress: 35, priority: 'Medium' },
  { no: '04', title: 'Client visit — Kestrel Learning', client: 'Kestrel Learning', owner: 'Tomás Herrera', due: '2 Nov', status: 'active', progress: 55, priority: 'Medium' },
  { no: '05', title: 'Renew MCA filings', client: 'Alder & Finch', owner: 'Grace Okafor', due: '4 Nov', status: 'pending', progress: 20, priority: 'Low' },
  { no: '06', title: 'Attendance audit — October', client: 'All clients', owner: 'Daniel Whitmore', due: '28 Oct', status: 'done', progress: 100, priority: 'Medium' },
  { no: '07', title: 'Onboard Brightpath Tutors', client: 'Brightpath Tutors', owner: 'Aisha Rahman', due: '6 Nov', status: 'pending', progress: 10, priority: 'Low' },
  { no: '08', title: 'October invoice batch', client: 'Internal', owner: 'Marcus Lee', due: '29 Oct', status: 'active', progress: 90, priority: 'High' },
];

export const activity = [
  { time: '09:42', who: 'Priya Nair', what: 'completed Q4 GST filing', tone: 'good' as Tone },
  { time: '09:31', who: 'Marcus Lee', what: 'clocked in at Meridian Prep', tone: 'info' as Tone },
  { time: '09:18', who: 'System', what: 'MIS workbook refreshed', tone: 'muted' as Tone },
  { time: '09:05', who: 'Grace Okafor', what: 'flagged a document mismatch', tone: 'warn' as Tone },
  { time: '08:54', who: 'Aisha Rahman', what: 'approved 2 leave requests', tone: 'good' as Tone },
  { time: '08:40', who: 'System', what: 'nightly sync finished', tone: 'muted' as Tone },
];

export const strategic = [
  { label: 'Revenue run-rate', value: '$128.4k', target: '$135k', pct: 95, delta: '+6.2%', dir: 'up' as const },
  { label: 'Client retention', value: '94.2%', target: '96%', pct: 98, delta: '+1.4pt', dir: 'up' as const },
  { label: 'SLA compliance', value: '97.8%', target: '98%', pct: 99, delta: '+0.6pt', dir: 'up' as const },
  { label: 'Team utilisation', value: '81.4%', target: '85%', pct: 96, delta: '−0.8pt', dir: 'down' as const },
];

export const tactical = [
  { objective: 'Close Q4 compliance cycle', owner: 'Priya Nair', progress: 78, status: 'On track', tone: 'good' as Tone, due: '31 Oct' },
  { objective: 'Cut invoice lag to 3 days', owner: 'Marcus Lee', progress: 64, status: 'At risk', tone: 'warn' as Tone, due: '2 Nov' },
  { objective: 'Raise utilisation to 85%', owner: 'Aisha Rahman', progress: 81, status: 'On track', tone: 'good' as Tone, due: '15 Nov' },
  { objective: 'Refresh MIS workbook', owner: 'Daniel Whitmore', progress: 42, status: 'Behind', tone: 'bad' as Tone, due: '31 Oct' },
  { objective: 'Onboard 3 new clients', owner: 'Grace Okafor', progress: 67, status: 'On track', tone: 'good' as Tone, due: '30 Nov' },
];

export const services = [
  { name: 'API', status: 'Operational', uptime: '99.99%', latency: '182ms', throughput: '4.2k/min', tone: 'good' as Tone, spark: [8, 7, 9, 8, 9, 9, 10] },
  { name: 'Webhooks', status: 'Operational', uptime: '99.97%', latency: '240ms', throughput: '1.8k/min', tone: 'good' as Tone, spark: [6, 7, 6, 8, 7, 8, 8] },
  { name: 'Sync worker', status: 'Degraded', uptime: '99.82%', latency: '1.4s', throughput: '320/min', tone: 'warn' as Tone, spark: [5, 4, 6, 5, 4, 6, 5] },
  { name: 'Storage', status: 'Operational', uptime: '99.99%', latency: '96ms', throughput: '620/min', tone: 'good' as Tone, spark: [9, 9, 10, 9, 10, 10, 10] },
  { name: 'Auth', status: 'Operational', uptime: '100%', latency: '110ms', throughput: '2.1k/min', tone: 'good' as Tone, spark: [10, 9, 10, 10, 9, 10, 10] },
];

export const cohorts = [
  { month: 'Jul', values: [100, 84, 71, 64, 58] },
  { month: 'Aug', values: [100, 87, 74, 66, 60] },
  { month: 'Sep', values: [100, 89, 78, 70, 64] },
  { month: 'Oct', values: [100, 91, 80, 73, 0] },
  { month: 'Nov', values: [100, 93, 82, 0, 0] },
];

export const funnel = [
  { label: 'Leads', value: 4820, pct: 100 },
  { label: 'Qualified', value: 1620, pct: 34 },
  { label: 'Demo', value: 640, pct: 13 },
  { label: 'Won', value: 184, pct: 4 },
];

export const mrrMovement = [
  { label: 'New', value: 12.4, tone: 'good' as Tone },
  { label: 'Expansion', value: 6.2, tone: 'good' as Tone },
  { label: 'Contraction', value: -2.1, tone: 'warn' as Tone },
  { label: 'Churn', value: -3.4, tone: 'bad' as Tone },
];

export const traffic = [12, 18, 15, 22, 26, 24, 31, 28, 34, 30, 27, 24];

export const burndown = {
  weeks: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
  ideal: [120, 100, 80, 60, 40, 20],
  actual: [120, 104, 86, 72, 48, 30],
};

export const quickActions = [
  { label: 'Create task', tone: 'primary', badge: 0 },
  { label: 'View team', tone: 'good', badge: 0 },
  { label: 'Pending invoices', tone: 'info', badge: 2 },
  { label: 'View roster', tone: 'info', badge: 0 },
  { label: 'Reports', tone: 'primary', badge: 0 },
  { label: 'Attendance sheet', tone: 'warn', badge: 0 },
  { label: 'Leave approvals', tone: 'warn', badge: 3 },
  { label: 'Compliance', tone: 'bad', badge: 0 },
  { label: 'Kanban', tone: 'primary', badge: 0 },
  { label: 'Projects', tone: 'good', badge: 0 },
  { label: 'Employees', tone: 'info', badge: 0 },
];

export const approvals = { invoices: 2, leaves: 3 };
export const attendance = { clockIn: '09:12', elapsed: '3h 47m', breakAt: '13:05' };
export const notifications = 3;
export const greeting = { name: 'Aisha', message: 'Good Morning, Aisha!' };
