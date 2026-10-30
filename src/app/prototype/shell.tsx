'use client';

/**
 * THROWAWAY PROTOTYPE — shared shell.
 * Renders K1's layout (the real /dashboard structure) for every variant.
 * R5 opts into `layout="bento"`: same sections, arranged as a bento grid.
 * Every color, font, radius and surface comes from the variant's existing
 * --v-* theme variables, so only structure is shared — the theme is not.
 */

import './shell.css';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  ListTodo,
  LogOut,
  Menu,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { attendance, notifications, stats, team, weekly } from './data';
import { DashboardSidebar } from './dashboard-sidebar';
import { AreaChart, Donut, Spark, TeamTable } from './shared';

const STAT_ICONS = [ClipboardCheck, CheckCircle2, Clock, ListTodo, AlertTriangle];
const STAT_AREAS = ['sv-bento-s1', 'sv-bento-s2', 'sv-bento-s3', 'sv-bento-s4', 'sv-bento-s5'];

const QUICK_ACTIONS = [
  { label: 'Create task', icon: Plus, tone: 'primary' },
  { label: 'View team', icon: Users, tone: 'good' },
  { label: 'Pending invoices', icon: Wallet, tone: 'info', badge: 2 },
  { label: 'View roster', icon: CalendarDays, tone: 'primary' },
  { label: 'Reports', icon: BarChart3, tone: 'info' },
  { label: 'Attendance sheet', icon: Clock, tone: 'warn' },
  { label: 'Leave approvals', icon: CalendarCheck, tone: 'warn', badge: 3 },
  { label: 'Compliance', icon: ClipboardCheck, tone: 'bad' },
  { label: 'Kanban', icon: ListTodo, tone: 'primary' },
  { label: 'Projects', icon: Briefcase, tone: 'good' },
  { label: 'Employees', icon: UserRound, tone: 'info' },
];

const DEADLINES = [
  { title: 'Reconcile October payroll', due: '30 Oct', when: 'Tomorrow', level: 'red' },
  { title: 'MIS workbook refresh', due: '31 Oct', when: '2 days', level: 'orange' },
  { title: 'Client visit — Kestrel Learning', due: '2 Nov', when: '4 days', level: 'yellow' },
  { title: 'Renew MCA filings', due: '4 Nov', when: '6 days', level: 'blue' },
  { title: 'Q4 GST filing — Northwind', due: '5 Nov', when: '1 week', level: 'blue' },
];

const DISTRIBUTION = [
  { label: 'Completed', value: 74, pct: 58, color: 'var(--v-good)' },
  { label: 'In progress', value: 23, pct: 18, color: 'var(--v-warn)' },
  { label: 'To do', value: 31, pct: 24, color: 'var(--v-bad)' },
];

function WelcomeCard({ className = '' }: { className?: string }) {
  return (
    <section className={`sv-welcome ${className}`} aria-labelledby="sv-greeting">
      <div className="sv-welcome-copy">
        <p className="sv-eyebrow">Thursday, 29 October 2026</p>
        <h2 id="sv-greeting">Good Morning, Aisha!</h2>
        <p>Let’s achieve more together.</p>
      </div>
      <div className="sv-welcome-art" aria-hidden="true">
        <span className="sv-art-ring sv-art-ring--one" />
        <span className="sv-art-ring sv-art-ring--two" />
        <div className="sv-art-tile">
          <span className="sv-art-bars">
            <i />
            <i />
            <i />
          </span>
          <span className="sv-art-check"><CheckCircle2 /></span>
        </div>
      </div>
    </section>
  );
}

function AttendanceCard({ className = '' }: { className?: string }) {
  return (
    <section className={`sv-card sv-attendance ${className}`} aria-labelledby="sv-att-title">
      <div className="sv-card-head">
        <h3 id="sv-att-title"><Clock /> Attendance Tracking</h3>
        <span className="sv-chip sv-chip--good"><i className="sv-dot" />Connected</span>
      </div>
      <p className="sv-card-sub">Track time, manage leaves, and view history.</p>

      <div className="sv-att-actions">
        <button className="sv-btn sv-btn--filled" type="button"><CalendarPlus />Apply Leave</button>
        <button className="sv-btn sv-btn--tonal" type="button"><Clock />Apply WFH</button>
        <button className="sv-btn sv-btn--text" type="button"><History />History</button>
      </div>

      <div className="sv-att-track">
        <p className="sv-att-track-title"><Clock /> Attendance Tracker</p>
        <p className="sv-att-status">Clocked in at {attendance.clockIn} · {attendance.elapsed}</p>
        <p className="sv-att-location">Location verified · Break at {attendance.breakAt}</p>
        <div className="sv-att-track-actions">
          <button className="sv-btn sv-btn--error" type="button"><LogOut />Clock Out</button>
          <button className="sv-btn sv-btn--outlined" type="button"><RefreshCw />Refresh Status</button>
        </div>
      </div>
    </section>
  );
}

function PromoCard({ className = '' }: { className?: string }) {
  return (
    <section className={`sv-promo ${className}`} aria-labelledby="sv-promo-title">
      <div>
        <p className="sv-eyebrow sv-eyebrow--light">Kanban</p>
        <h3 id="sv-promo-title">Stay on top of every task.</h3>
        <p>Turn to smart tools and real-time updates to keep your work moving.</p>
      </div>
      <button className="sv-btn sv-btn--inverse" type="button">
        View Calendar
        <ArrowRight />
      </button>
    </section>
  );
}

function DistributionCard({ className = '' }: { className?: string }) {
  return (
    <section className={`sv-card ${className}`} aria-labelledby="sv-dist-title">
      <div className="sv-card-head">
        <h3 id="sv-dist-title"><PieChart /> Task Distribution</h3>
        <button className="sv-select" type="button">
          This Week
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      <div className="sv-dist-body">
        <Donut segments={DISTRIBUTION} center={128} label="Total" className="sv-donut" />
        <ul className="sv-dist-legend">
          {DISTRIBUTION.map((segment) => (
            <li key={segment.label}>
              <span className="sv-dist-name">
                <i className="sv-dot" style={{ background: segment.color }} />
                {segment.label}
              </span>
              <span className="sv-dist-value">{segment.value} <small>({segment.pct}%)</small></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DeadlinesCard({ className = '' }: { className?: string }) {
  return (
    <section className={`sv-card ${className}`} aria-labelledby="sv-deadlines-title">
      <div className="sv-card-head">
        <h3 id="sv-deadlines-title"><CalendarDays /> Upcoming Deadlines</h3>
        <button className="sv-link" type="button">View All <ArrowRight /></button>
      </div>

      <ul className="sv-deadline-list">
        {DEADLINES.map((item) => (
          <li key={item.title}>
            <div>
              <p>{item.title}</p>
              <span>Due {item.due}</span>
            </div>
            <span className={`sv-chip sv-chip--${item.level}`}>{item.when}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickActionsCard({ className = '', limit }: { className?: string; limit?: number }) {
  const actions = limit ? QUICK_ACTIONS.slice(0, limit) : QUICK_ACTIONS;
  return (
    <section className={`sv-card ${className}`} aria-labelledby="sv-quick-title">
      <div className="sv-card-head">
        <h3 id="sv-quick-title"><ListTodo /> Quick Actions</h3>
      </div>

      <div className="sv-quick-grid">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} className={`sv-quick sv-quick--${action.tone}`} type="button">
              <span className="sv-quick-icon"><Icon /></span>
              <span>{action.label}</span>
              {action.badge ? <span className="sv-quick-badge">{action.badge}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TeamCard({ className = '' }: { className?: string }) {
  return (
    <section className={`sv-card ${className}`} aria-labelledby="sv-team-title">
      <div className="sv-card-head">
        <h3 id="sv-team-title"><Users /> Team Performance</h3>
        <button className="sv-link" type="button">View All <ArrowRight /></button>
      </div>
      <TeamTable rows={team} />
    </section>
  );
}

function WeeklyCard({ completionRate, className = '' }: { completionRate: number; className?: string }) {
  return (
    <section className={`sv-card ${className}`} aria-labelledby="sv-week-title">
      <div className="sv-card-head">
        <h3 id="sv-week-title"><TrendingUp /> Weekly Progress</h3>
        <div className="sv-head-actions">
          <button className="sv-select" type="button">
            This Week
            <span aria-hidden="true">▾</span>
          </button>
          <span className="sv-chip sv-chip--warn">{completionRate}% completion</span>
        </div>
      </div>

      <AreaChart />

      <div className="sv-chart-legend">
        <span><i className="sv-dot sv-dot--created" />Created</span>
        <span><i className="sv-dot sv-dot--done" />Completed</span>
      </div>
    </section>
  );
}

function StatCards({ bento = false }: { bento?: boolean }) {
  return (
    <>
      {stats.map((stat, index) => {
        const Icon = STAT_ICONS[index] ?? ClipboardCheck;
        return (
          <article
            className={`sv-stat sv-stat--${stat.tone} ${bento ? STAT_AREAS[index] : ''}`}
            key={stat.label}
          >
            <span className="sv-stat-icon"><Icon /></span>
            <p className="sv-stat-label">{stat.label}</p>
            <p className="sv-stat-value">{stat.value}</p>
            <div className="sv-stat-foot">
              <span className={`sv-trend sv-trend--${stat.dir}`}>
                {stat.dir === 'down' ? '↓' : '↑'} {stat.delta} <em>from last week</em>
              </span>
              <Spark values={stat.spark} className="sv-spark" />
            </div>
          </article>
        );
      })}
    </>
  );
}

export function Shell({
  theme,
  subtitle,
  label,
  layout = 'stack',
}: {
  theme: string;
  subtitle: string;
  label: string;
  layout?: 'stack' | 'bento';
}) {
  const weekCreated = weekly.created.reduce((sum, value) => sum + value, 0);
  const weekDone = weekly.completed.reduce((sum, value) => sum + value, 0);
  const completionRate = weekCreated > 0 ? Math.round((weekDone / weekCreated) * 100) : 0;

  return (
    <div className={`${theme} sv`}>
      <DashboardSidebar />

      <div className="sv-main">
        <header className="sv-appbar">
          <button className="sv-icon-btn sv-menu" type="button" aria-label="Open navigation">
            <Menu />
          </button>
          <div className="sv-appbar-title">
            <h1>Dashboard</h1>
            <p>{subtitle}</p>
          </div>
          <div className="sv-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search tasks, clients, people" aria-label="Search" />
          </div>
          <div className="sv-appbar-actions">
            <button className="sv-icon-btn sv-bell" type="button" aria-label={`Notifications, ${notifications} unread`}>
              <Bell />
              <span className="sv-badge">{notifications}</span>
            </button>
            <span className="sv-avatar" aria-hidden="true">AR</span>
          </div>
        </header>

        <div className="sv-content">
          <div className="sv-content-inner">
            {layout === 'bento' ? (
              <>
                <div className="sv-bento">
                  <WelcomeCard className="sv-bento-hero" />
                  <AttendanceCard className="sv-bento-att" />
                  <StatCards bento />
                  <PromoCard className="sv-bento-promo" />
                  <DistributionCard className="sv-bento-dist" />
                  <DeadlinesCard className="sv-bento-dead" />
                  <QuickActionsCard className="sv-bento-quick" limit={9} />
                  <TeamCard className="sv-bento-team" />
                  <WeeklyCard completionRate={completionRate} className="sv-bento-week" />
                </div>
                <p className="sv-foot">{label} · mock data · not production</p>
              </>
            ) : (
              <>
                <WelcomeCard />

                <div className="sv-stat-grid">
                  <StatCards />
                </div>

                <div className="sv-two-col">
                  <PromoCard />
                  <AttendanceCard />
                </div>

                <div className="sv-three-col">
                  <DistributionCard />
                  <DeadlinesCard />
                  <QuickActionsCard />
                </div>

                <div className="sv-team-row">
                  <TeamCard />
                  <WeeklyCard completionRate={completionRate} />
                </div>

                <p className="sv-foot">{label} · mock data · not production</p>
              </>
            )}
          </div>
        </div>
      </div>

      <button className="sv-fab" type="button" aria-label="Create task">
        <Plus />
        <span>New task</span>
      </button>
    </div>
  );
}
