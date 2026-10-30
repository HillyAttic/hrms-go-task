/**
 * THROWAWAY PROTOTYPE — KPI 1 (Material 3).
 * Executive summary that mirrors the real /dashboard structure and palette.
 * Mock data only; no Firestore, no auth, no mutations.
 */

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
import { stats, team, weekly } from './data';
import { DashboardSidebar } from './dashboard-sidebar';

const materialSparks = [
  [8, 12, 9, 14, 11, 16, 13],
  [5, 8, 7, 10, 9, 12, 10],
  [4, 6, 5, 7, 6, 8, 7],
  [6, 7, 6, 8, 7, 9, 8],
  [3, 2, 3, 1, 2, 1, 2],
];

const materialSparkColors = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

const materialUpcoming = [
  { title: 'Reconcile October payroll', due: '30 Oct', when: 'Tomorrow', level: 'red' },
  { title: 'MIS workbook refresh', due: '31 Oct', when: '2 days', level: 'orange' },
  { title: 'Client visit — Kestrel Learning', due: '2 Nov', when: '4 days', level: 'yellow' },
  { title: 'Renew MCA filings', due: '4 Nov', when: '6 days', level: 'blue' },
  { title: 'Q4 GST filing — Northwind', due: '5 Nov', when: '1 week', level: 'blue' },
] as const;

function MaterialSpark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data
    .map((value, i) => `${(i / (data.length - 1)) * 100},${30 - ((value - min) / span) * 24}`)
    .join(' ');

  return (
    <svg className="pm-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MaterialDonut() {
  const segments = [
    { label: 'Completed', value: 74, color: '#10B981' },
    { label: 'In progress', value: 23, color: '#F59E0B' },
    { label: 'To do', value: 31, color: '#EF4444' },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const gap = 5;
  let offset = 0;

  return (
    <div className="pm-donut-wrap">
      <svg viewBox="0 0 100 100" className="pm-donut" role="img" aria-label="Task distribution: 74 completed, 23 in progress, 31 to do">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="14" />
        <g transform="rotate(-90 50 50)">
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const visible = Math.max(length - gap, 0);
            const circle = (
              <circle
                key={segment.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="14"
                strokeDasharray={`${visible} ${circumference - visible}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
      </svg>
      <div className="pm-donut-center">
        <strong>{total}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

function MaterialWeeklyChart() {
  const max = 25;
  const x = (i: number) => (i / (weekly.labels.length - 1)) * 100;
  const y = (value: number) => 96 - (value / max) * 88;
  const line = (values: number[]) =>
    values.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(value)}`).join(' ');
  const area = (values: number[]) => `${line(values)} L100,100 L0,100 Z`;

  return (
    <div className="pm-week-chart">
      <div className="pm-week-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Weekly progress: tasks created and completed">
          {[4, 26, 48, 70, 92].map((v) => (
            <line key={v} className="pm-grid-line" x1="0" x2="100" y1={v} y2={v} vectorEffect="non-scaling-stroke" />
          ))}
          <path className="pm-area-created" d={area(weekly.created)} />
          <path className="pm-area-done" d={area(weekly.completed)} />
          <path className="pm-line-created" d={line(weekly.created)} vectorEffect="non-scaling-stroke" />
          <path className="pm-line-done" d={line(weekly.completed)} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pm-week-dots" aria-hidden="true">
          {weekly.created.map((value, i) => (
            <i key={`c-${i}`} className="pm-wdot pm-wdot--created" style={{ left: `${x(i)}%`, top: `${y(value)}%` }} />
          ))}
          {weekly.completed.map((value, i) => (
            <i key={`d-${i}`} className="pm-wdot pm-wdot--done" style={{ left: `${x(i)}%`, top: `${y(value)}%` }} />
          ))}
        </div>
      </div>
      <div className="pm-week-labels">
        {weekly.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function Kpi1() {
  const statIcons = [ClipboardCheck, CheckCircle2, Clock, ListTodo, AlertTriangle];
  const statTones = ['indigo', 'green', 'orange', 'violet', 'red'];

  const quickActions = [
    { label: 'Create task', icon: <Plus />, tone: 'indigo' },
    { label: 'View team', icon: <Users />, tone: 'green' },
    { label: 'Pending invoices', icon: <Wallet />, tone: 'violet', badge: 2 },
    { label: 'View roster', icon: <CalendarDays />, tone: 'teal' },
    { label: 'Reports', icon: <BarChart3 />, tone: 'cyan' },
    { label: 'Attendance sheet', icon: <Clock />, tone: 'pink' },
    { label: 'Leave approvals', icon: <CalendarCheck />, tone: 'orange', badge: 3 },
    { label: 'Compliance', icon: <ClipboardCheck />, tone: 'rose' },
    { label: 'Kanban', icon: <ListTodo />, tone: 'fuchsia' },
    { label: 'Projects', icon: <Briefcase />, tone: 'emerald' },
    { label: 'Employees', icon: <UserRound />, tone: 'purple' },
  ];

  const weekCreated = weekly.created.reduce((sum, value) => sum + value, 0);
  const weekDone = weekly.completed.reduce((sum, value) => sum + value, 0);
  const completionRate = weekCreated > 0 ? Math.round((weekDone / weekCreated) * 100) : 0;

  const distribution = [
    { label: 'Completed', value: 74, pct: 58, tone: 'green' },
    { label: 'In progress', value: 23, pct: 18, tone: 'amber' },
    { label: 'To do', value: 31, pct: 24, tone: 'red' },
  ];

  return (
    <div className="pm">
      <DashboardSidebar />

      <div className="pm-main">
        <header className="pm-appbar">
          <button className="pm-icon-btn pm-menu" type="button" aria-label="Open navigation">
            <Menu />
          </button>
          <div className="pm-appbar-title">
            <h1>Dashboard</h1>
            <p>edVenture Admin Dashboard</p>
          </div>
          <div className="pm-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search tasks, clients, people" aria-label="Search" />
          </div>
          <div className="pm-appbar-actions">
            <button className="pm-icon-btn pm-bell" type="button" aria-label="Notifications, 3 unread">
              <Bell />
              <span className="pm-badge">3</span>
            </button>
            <span className="pm-avatar" aria-hidden="true">AR</span>
          </div>
        </header>

        <div className="pm-content">
          <div className="pm-content-inner">
            <section className="pm-welcome" aria-labelledby="pm-greeting">
              <div className="pm-welcome-copy">
                <p className="pm-eyebrow">Thursday, 29 October 2026</p>
                <h2 id="pm-greeting">Good Morning, Aisha!</h2>
                <p>Let’s achieve more together.</p>
              </div>
              <div className="pm-welcome-art" aria-hidden="true">
                <span className="pm-art-ring pm-art-ring--one" />
                <span className="pm-art-ring pm-art-ring--two" />
                <div className="pm-art-tile">
                  <span className="pm-art-bars">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="pm-art-check"><CheckCircle2 /></span>
                </div>
              </div>
            </section>

            <div className="pm-stat-grid">
              {stats.map((stat, index) => {
                const Icon = statIcons[index] ?? ClipboardCheck;
                return (
                  <article className="pm-stat" key={stat.label}>
                    <div className={`pm-stat-top pm-tone-${statTones[index]}`}>
                      <span className="pm-stat-icon"><Icon /></span>
                    </div>
                    <p className="pm-stat-label">{stat.label}</p>
                    <p className="pm-stat-value">{stat.value}</p>
                    <div className="pm-stat-foot">
                      <span className={`pm-trend pm-trend--${stat.dir}`}>
                        {stat.dir === 'down' ? '↓' : '↑'} {stat.delta} <em>from last week</em>
                      </span>
                      <MaterialSpark data={materialSparks[index]} color={materialSparkColors[index]} />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="pm-two-col">
              <section className="pm-promo" aria-labelledby="pm-promo-title">
                <div className="pm-promo-copy">
                  <p className="pm-eyebrow pm-eyebrow--light">Kanban</p>
                  <h3 id="pm-promo-title">Stay on top of every task.</h3>
                  <p>Turn to smart tools and real-time updates to keep your work moving.</p>
                </div>
                <button className="pm-btn pm-btn--inverse" type="button">
                  View Calendar
                  <ArrowRight />
                </button>
              </section>

              <section className="pm-card pm-attendance" aria-labelledby="pm-att-title">
                <div className="pm-card-head">
                  <h3 id="pm-att-title"><Clock /> Attendance Tracking</h3>
                  <span className="pm-chip pm-chip--green"><i className="pm-dot" />Connected</span>
                </div>
                <p className="pm-card-sub">Track time, manage leaves, and view history.</p>

                <div className="pm-att-actions">
                  <button className="pm-btn pm-btn--filled" type="button"><CalendarPlus />Apply Leave</button>
                  <button className="pm-btn pm-btn--tonal" type="button"><Clock />Apply WFH</button>
                  <button className="pm-btn pm-btn--text" type="button"><History />History</button>
                </div>

                <div className="pm-att-track">
                  <p className="pm-att-track-title"><Clock /> Attendance Tracker</p>
                  <p className="pm-att-status">Clocked in at 09:12 · 3h 47m</p>
                  <p className="pm-att-location">Location verified · Break at 13:05</p>
                  <div className="pm-att-track-actions">
                    <button className="pm-btn pm-btn--error" type="button"><LogOut />Clock Out</button>
                    <button className="pm-btn pm-btn--outlined" type="button"><RefreshCw />Refresh Status</button>
                  </div>
                </div>
              </section>
            </div>

            <div className="pm-three-col">
              <section className="pm-card" aria-labelledby="pm-dist-title">
                <div className="pm-card-head">
                  <h3 id="pm-dist-title"><PieChart /> Task Distribution</h3>
                  <button className="pm-select" type="button">
                    This Week
                    <span aria-hidden="true">▾</span>
                  </button>
                </div>

                <div className="pm-dist-body">
                  <MaterialDonut />
                  <ul className="pm-dist-legend">
                    {distribution.map((segment) => (
                      <li key={segment.label} className={`pm-dist-row pm-dist-row--${segment.tone}`}>
                        <span className="pm-dist-name"><i className="pm-dot" />{segment.label}</span>
                        <span className="pm-dist-value">{segment.value} <small>({segment.pct}%)</small></span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="pm-card" aria-labelledby="pm-deadlines-title">
                <div className="pm-card-head">
                  <h3 id="pm-deadlines-title"><CalendarDays /> Upcoming Deadlines</h3>
                  <button className="pm-link" type="button">View All <ArrowRight /></button>
                </div>

                <ul className="pm-deadline-list">
                  {materialUpcoming.map((item) => (
                    <li key={item.title}>
                      <div className="pm-deadline-copy">
                        <p>{item.title}</p>
                        <span>Due {item.due}</span>
                      </div>
                      <span className={`pm-chip pm-chip--${item.level}`}>{item.when}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="pm-card pm-quick-card" aria-labelledby="pm-quick-title">
                <div className="pm-card-head">
                  <h3 id="pm-quick-title"><ListTodo /> Quick Actions</h3>
                </div>

                <div className="pm-quick-grid">
                  {quickActions.map((action) => (
                    <button key={action.label} className={`pm-quick pm-quick--${action.tone}`} type="button">
                      <span className="pm-quick-icon">{action.icon}</span>
                      <span>{action.label}</span>
                      {action.badge ? <span className="pm-quick-badge">{action.badge}</span> : null}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="pm-team-row">
              <section className="pm-card" aria-labelledby="pm-team-title">
                <div className="pm-card-head">
                  <h3 id="pm-team-title"><Users /> Team Performance</h3>
                  <button className="pm-link" type="button">View All <ArrowRight /></button>
                </div>

                <div className="pm-table-wrap">
                  <table className="pm-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Total</th>
                        <th scope="col">Pending</th>
                        <th scope="col">In Progress</th>
                        <th scope="col">Done</th>
                        <th scope="col">Chart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member) => {
                        const total = member.done + member.active + member.pending;
                        return (
                          <tr key={member.name}>
                            <td className="pm-member">{member.name}</td>
                            <td className="pm-num">{total}</td>
                            <td className="pm-num pm-num--pending">{member.pending}</td>
                            <td className="pm-num pm-num--active">{member.active}</td>
                            <td className="pm-num pm-num--done">{member.done}</td>
                            <td>
                              <span className="pm-workload" title={`${member.done} done, ${member.active} in progress, ${member.pending} pending`}>
                                <span className="pm-w-done" style={{ width: `${(member.done / total) * 100}%` }} />
                                <span className="pm-w-active" style={{ width: `${(member.active / total) * 100}%` }} />
                                <span className="pm-w-pending" style={{ width: `${(member.pending / total) * 100}%` }} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="pm-card" aria-labelledby="pm-week-title">
                <div className="pm-card-head">
                  <h3 id="pm-week-title"><TrendingUp /> Weekly Progress</h3>
                  <div className="pm-head-actions">
                    <button className="pm-select" type="button">
                      This Week
                      <span aria-hidden="true">▾</span>
                    </button>
                    <span className="pm-chip pm-chip--amber">{completionRate}% completion</span>
                  </div>
                </div>

                <MaterialWeeklyChart />

                <div className="pm-chart-legend">
                  <span><i className="pm-dot pm-dot--blue" />Created</span>
                  <span><i className="pm-dot pm-dot--green" />Completed</span>
                </div>
              </section>
            </div>

            <p className="pm-foot">KPI 1 · Executive · mock data · not production</p>
          </div>
        </div>
      </div>

      <button className="pm-fab" type="button" aria-label="Create task">
        <Plus />
        <span>New task</span>
      </button>
    </div>
  );
}
