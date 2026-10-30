/**
 * THROWAWAY PROTOTYPE — theme showcase (T1–T10).
 * Mirrors the real /dashboard page: 290px sidebar with the production NAV_DATA,
 * app header, rounded gradient canvas, WelcomeBanner, five glass stat cards,
 * Kanban CTA + Attendance (6/6), Distribution/Deadlines/Quick Actions (4/4/4),
 * Team Performance + Weekly Progress (7/5). Only the theme changes.
 * Mock data only; no Firestore, no auth, no mutations.
 */

/* eslint-disable @next/next/no-img-element */
import './showcase.css';
import {
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Folder,
  LayoutGrid,
  ListTodo,
  PlusCircle,
  Search,
  Settings,
  TrendingUp,
  UsersRound,
  Users,
} from 'lucide-react';
import { DashboardSidebar } from './dashboard-sidebar';
import { weekly } from './data';
import { AreaChart, Donut, Spark, TeamTable } from './shared';

const STATS = [
  { title: 'Total Tasks', value: 24, delta: 12, dir: 'up' as const, color: 'blue', spark: [8, 12, 9, 14, 11, 16, 13] },
  { title: 'Completed', value: 12, delta: 8, dir: 'up' as const, color: 'green', spark: [5, 8, 7, 10, 9, 12, 10] },
  { title: 'In Progress', value: 8, delta: 3, dir: 'down' as const, color: 'orange', spark: [8, 6, 7, 5, 6, 4, 5] },
  { title: 'To Do', value: 3, delta: 5, dir: 'up' as const, color: 'purple', spark: [2, 3, 2, 4, 3, 5, 4] },
  { title: 'Overdue', value: 1, delta: 2, dir: 'up' as const, color: 'red', spark: [3, 2, 3, 1, 2, 1, 2] },
];

const DEADLINES = [
  { title: 'Reconcile October payroll', due: '30 Oct', when: 'Tomorrow', level: 'bad' },
  { title: 'MIS workbook refresh', due: '31 Oct', when: '2 days', level: 'warn' },
  { title: 'Client visit — Kestrel Learning', due: '2 Nov', when: '4 days', level: 'warn' },
  { title: 'Renew MCA filings', due: '4 Nov', when: '6 days', level: 'info' },
  { title: 'Q4 GST filing — Northwind', due: '5 Nov', when: '1 week', level: 'info' },
];

const QUICK = [
  { label: 'Create Task', icon: PlusCircle, tone: 'brand' },
  { label: 'View Team', icon: UsersRound, tone: 'emerald' },
  { label: 'Pending Invoices', icon: Folder, tone: 'indigo', badge: 2 },
  { label: 'View Roster', icon: CalendarDays, tone: 'teal' },
  { label: 'Reports', icon: ClipboardCheck, tone: 'cyan' },
  { label: 'Attendance Sheet', icon: Clock, tone: 'pink' },
  { label: 'Leave Approvals', icon: CheckCircle2, tone: 'orange', badge: 3 },
  { label: 'Compliance', icon: Calendar, tone: 'rose' },
  { label: 'Kanban', icon: LayoutGrid, tone: 'fuchsia' },
  { label: 'Projects', icon: Building2, tone: 'green' },
  { label: 'Employees', icon: Users, tone: 'violet' },
];

const TEAM = [
  { name: 'Rachel Best', role: 'Manager', done: 16, active: 8, pending: 0, load: 78 },
  { name: 'Angela Scott', role: 'Senior associate', done: 11, active: 5, pending: 2, load: 82 },
  { name: 'Samantha Brooks', role: 'Associate', done: 8, active: 6, pending: 1, load: 61 },
  { name: 'Prisha Kumar', role: 'Analyst', done: 5, active: 4, pending: 3, load: 44 },
];

const DISTRIBUTION = [
  { label: 'Completed', value: 12, pct: 50, color: 'var(--v-good)' },
  { label: 'In progress', value: 8, pct: 33, color: 'var(--v-warn)' },
  { label: 'To do', value: 3, pct: 13, color: 'var(--v-bad)' },
];

export function WelcomeBanner() {
  return (
    <section className="dz-welcome" aria-labelledby="dz-greeting">
      <svg className="dz-hills" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="dz-hill-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9D8FF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E4DBFF" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="dz-hill-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D3DEFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#DCD0FF" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path d="M180,220 C300,198 372,92 548,38 C700,-8 790,48 906,112 C1008,168 1120,190 1200,198 L1200,220 Z" fill="url(#dz-hill-a)" />
        <path d="M330,220 C432,204 476,124 618,106 C756,88 836,150 962,178 C1062,200 1146,204 1200,206 L1200,220 Z" fill="url(#dz-hill-b)" />
      </svg>
      <span className="dz-welcome-glow" aria-hidden="true" />
      <div className="dz-welcome-inner">
        <div>
          <h2 id="dz-greeting">Good Morning, Admin!</h2>
          <p>Let&apos;s achieve more together.</p>
        </div>
        <div className="dz-welcome-art" aria-hidden="true">
          <span className="dz-bar dz-bar--1" />
          <span className="dz-bar dz-bar--2" />
          <span className="dz-bar dz-bar--3" />
          <span className="dz-orb"><Clock /></span>
          <img src="/images/illustration/dashboard-illustration.png" alt="" />
        </div>
      </div>
    </section>
  );
}

export function StatCards() {
  return (
    <div className="dz-stats">
      {STATS.map((stat) => (
        <article className={`dz-stat dz-stat--${stat.color}`} key={stat.title}>
          <p className="dz-stat-label">{stat.title}</p>
          <div className="dz-stat-body">
            <span className="dz-stat-value">{stat.value}</span>
            <Spark values={stat.spark} className="dz-spark" />
          </div>
          <p className={`dz-delta dz-delta--${stat.dir}`}>
            <span aria-hidden="true">{stat.dir === 'up' ? '↑' : '↓'}</span>
            <span>{stat.dir === 'up' ? '+' : '-'}{stat.delta}%</span>
            <em>from last week</em>
          </p>
        </article>
      ))}
    </div>
  );
}

export function KanbanCTA() {
  return (
    <section className="dz-kanban" aria-labelledby="dz-kanban-title">
      <svg className="dz-waves" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="dz-wave-a" x1="0" y1="1" x2="0.8" y2="0">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="dz-wave-b" x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path d="M0,220 L0,178 C70,150 140,142 214,158 C300,177 366,200 436,206 C500,211 560,206 600,196 L600,220 Z" fill="url(#dz-wave-a)" />
        <path d="M0,220 C38,202 92,196 140,204 C174,210 198,216 216,220 Z" fill="url(#dz-wave-b)" />
      </svg>
      <div className="dz-kanban-inner">
        <div>
          <h3 id="dz-kanban-title">Stay on top of every task.</h3>
          <p>Turn to smart tools and real-time updates to keep your work moving.</p>
        </div>
        <button className="dz-btn dz-btn--white" type="button">View Calendar <ArrowRight /></button>
      </div>
    </section>
  );
}

export function AttendanceCard() {
  return (
    <section className="dz-card dz-att" aria-labelledby="dz-att-title">
      <div className="dz-card-head">
        <h3 id="dz-att-title"><Clock /> Attendance Tracking</h3>
        <span className="dz-chip dz-chip--good"><i className="dz-dot" />Connected</span>
      </div>
      <p className="dz-card-sub">Track time, manage leaves, and view history.</p>

      <div className="dz-att-actions">
        <button className="dz-btn dz-btn--filled" type="button"><CalendarDays />Apply Leave</button>
        <button className="dz-btn dz-btn--tonal" type="button"><Clock />Apply WFH</button>
        <button className="dz-btn dz-btn--text" type="button"><FileText />History</button>
      </div>

      <div className="dz-track">
        <p className="dz-track-title"><Clock /> Attendance Tracker</p>
        <p className="dz-track-status">Clocked in · 3h 47m</p>
        <p className="dz-track-note">Location verified · Break at 13:05</p>
        <div className="dz-track-actions">
          <button className="dz-btn dz-btn--error" type="button">Clock Out</button>
          <button className="dz-btn dz-btn--outlined" type="button">Refresh Status</button>
        </div>
      </div>
    </section>
  );
}

export function DistributionCard() {
  return (
    <section className="dz-card" aria-labelledby="dz-dist-title">
      <div className="dz-card-head">
        <h3 id="dz-dist-title"><DonutIcon /> Task Distribution</h3>
        <button className="dz-select" type="button">This Week <span aria-hidden="true">▾</span></button>
      </div>
      <div className="dz-dist">
        <Donut segments={DISTRIBUTION} center={24} label="Total" className="dz-donut" />
        <ul className="dz-legend">
          {DISTRIBUTION.map((segment) => (
            <li key={segment.label}>
              <span className="dz-legend-name"><i className="dz-dot" style={{ background: segment.color }} />{segment.label}</span>
              <span className="dz-legend-value">{segment.value} <small>({segment.pct}%)</small></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DonutIcon() {
  return <span className="dz-h3-icon"><TrendingUp /></span>;
}

export function DeadlinesCard() {
  return (
    <section className="dz-card" aria-labelledby="dz-dead-title">
      <div className="dz-card-head">
        <h3 id="dz-dead-title"><CalendarDays /> Upcoming Deadlines</h3>
        <button className="dz-link" type="button">View All <ArrowRight /></button>
      </div>
      <ul className="dz-deadlines">
        {DEADLINES.map((item) => (
          <li key={item.title}>
            <div>
              <p>{item.title}</p>
              <span>Due {item.due}</span>
            </div>
            <span className={`dz-chip dz-chip--${item.level}`}>{item.when}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QuickActionsCard() {
  return (
    <section className="dz-card" aria-labelledby="dz-quick-title">
      <div className="dz-card-head">
        <h3 id="dz-quick-title"><ListTodo /> Quick Actions</h3>
      </div>
      <div className="dz-quick-grid">
        {QUICK.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} className={`dz-quick dz-quick--${action.tone}`} type="button">
              <Icon />
              <span>{action.label}</span>
              {action.badge ? <span className="dz-quick-badge">{action.badge}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function TeamCard() {
  return (
    <section className="dz-card" aria-labelledby="dz-team-title">
      <div className="dz-card-head">
        <h3 id="dz-team-title"><Users /> Team Performance</h3>
        <button className="dz-link" type="button">View All <ArrowRight /></button>
      </div>
      <TeamTable rows={TEAM} />
    </section>
  );
}

export function WeeklyCard({ rate }: { rate: number }) {
  return (
    <section className="dz-card" aria-labelledby="dz-week-title">
      <div className="dz-card-head">
        <h3 id="dz-week-title"><TrendingUp /> Weekly Progress</h3>
        <div className="dz-head-actions">
          <button className="dz-select" type="button">This Week <span aria-hidden="true">▾</span></button>
          <span className="dz-chip dz-chip--warn"><i className="dz-dot" />{rate}% completion</span>
        </div>
      </div>
      <AreaChart />
      <div className="dz-legend-row">
        <span><i className="dz-dot" style={{ background: 'var(--v-primary)' }} />Created</span>
        <span><i className="dz-dot" style={{ background: 'var(--v-good)' }} />Completed</span>
      </div>
    </section>
  );
}

function Showcase({ theme, label }: { theme: string; label: string }) {
  const created = weekly.created.reduce((sum, value) => sum + value, 0);
  const done = weekly.completed.reduce((sum, value) => sum + value, 0);
  const rate = created > 0 ? Math.round((done / created) * 100) : 0;

  return (
    <div className={`dz ${theme}`}>
      <DashboardSidebar />

      <div className="dz-main">
        <header className="dz-appbar">
          <div className="dz-appbar-title">
            <h1>Dashboard</h1>
            <p>edVenture Admin Dashboard</p>
          </div>
          <div className="dz-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search anything..." aria-label="Search" />
          </div>
          <div className="dz-actions">
            <button className="dz-icon-btn" type="button" aria-label="Appearance"><Settings /></button>
            <button className="dz-icon-btn dz-bell" type="button" aria-label="Notifications, 3 unread">
              <Bell /><span className="dz-badge">3</span>
            </button>
            <span className="dz-admin"><span className="dz-avatar">AR</span><span className="dz-admin-name">Admin</span></span>
          </div>
        </header>

        <div className="dz-content">
          <div className="dz-panel">
            <span className="dz-blob dz-blob--one" aria-hidden="true" />
            <span className="dz-blob dz-blob--two" aria-hidden="true" />
            <span className="dz-blob dz-blob--three" aria-hidden="true" />

            <WelcomeBanner />
            <StatCards />

            <div className="dz-row dz-row--half">
              <KanbanCTA />
              <AttendanceCard />
            </div>

            <div className="dz-row dz-row--triple">
              <DistributionCard />
              <DeadlinesCard />
              <QuickActionsCard />
            </div>

            <div className="dz-row dz-row--team">
              <TeamCard />
              <WeeklyCard rate={rate} />
            </div>

            <p className="dz-foot">{label} · mock data · not production</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SHOWCASE_THEMES = [
  'Neumorphism (Soft UI)',
  'Glassmorphism',
  'Dark Mode (Modern)',
  'Minimalism',
  'Brutalist UI',
  'Claymorphism',
  'Material Design',
  'Fluent Design',
  'Aurora UI',
  'Organic / Biomorphic UI',
] as const;

function theme(name: string, index: number) {
  return () => <Showcase theme={`t${index + 1}`} label={`Theme · ${name}`} />;
}

export const Theme1 = theme(SHOWCASE_THEMES[0], 0);
export const Theme2 = theme(SHOWCASE_THEMES[1], 1);
export const Theme3 = theme(SHOWCASE_THEMES[2], 2);
export const Theme4 = theme(SHOWCASE_THEMES[3], 3);
export const Theme5 = theme(SHOWCASE_THEMES[4], 4);
export const Theme6 = theme(SHOWCASE_THEMES[5], 5);
export const Theme7 = theme(SHOWCASE_THEMES[6], 6);
export const Theme8 = theme(SHOWCASE_THEMES[7], 7);
export const Theme9 = theme(SHOWCASE_THEMES[8], 8);
export const Theme10 = theme(SHOWCASE_THEMES[9], 9);
