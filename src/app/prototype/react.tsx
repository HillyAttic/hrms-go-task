import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Clock,
  ListTodo,
  PieChart,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { activity, approvals, attendance, burndown, quickActions, stats, tasks, team } from './data';
import { AreaChart, Chip, Delta, Donut, Progress, Ring, Spark, TaskList, TaskTable, TeamTable } from './shared';

export function React1() {
  return (
    <div className="r1">
      <header className="r1-top">
        <div className="r1-brand"><span className="r1-logo">EV</span><span>edVentureHub</span></div>
        <nav className="r1-nav" aria-label="Primary">
          <a className="is-active" href="#">Overview</a><a href="#">Tasks</a><a href="#">Clients</a><a href="#">Attendance</a><a href="#">Team</a>
        </nav>
        <label className="r1-search"><Search /><input type="search" placeholder="Search records" aria-label="Search records" /></label>
        <div className="r1-actions"><button className="r1-icon" type="button" aria-label="Notifications"><Bell /><i>3</i></button><span className="r1-avatar">AR</span></div>
      </header>

      <main className="r1-main">
        <div className="r1-head">
          <div>
            <p className="r1-eyebrow">Workspace / Dashboard</p>
            <h1>Operations overview</h1>
            <p>128 tasks · 74 completed · 6 overdue</p>
          </div>
          <div className="r1-head-actions"><button type="button">Export</button><button className="r1-primary" type="button"><Plus /> New task</button></div>
        </div>

        <section className="r1-stats">
          {stats.map((stat) => (
            <article className={`r1-stat r1-stat--${stat.tone}`} key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <div><Delta value={stat.delta} dir={stat.dir} /><Spark values={stat.spark} /></div>
            </article>
          ))}
        </section>

        <div className="r1-split">
          <section className="r1-panel r1-panel--wide">
            <div className="r1-panel-head">
              <h2>Task registry</h2>
              <div className="r1-filters"><button className="is-active" type="button">All 128</button><button type="button">Overdue 6</button><button type="button">Active 23</button><button type="button">Done 74</button></div>
            </div>
            <TaskTable rows={tasks} dense />
          </section>

          <aside className="r1-aside">
            <section className="r1-panel r1-attendance">
              <div className="r1-panel-head"><h2><Clock /> Attendance</h2><Chip tone="good">Connected</Chip></div>
              <strong>{attendance.clockIn}</strong>
              <p>{attendance.elapsed} today · break {attendance.breakAt}</p>
              <button className="r1-danger" type="button">Clock out</button>
            </section>

            <section className="r1-panel">
              <div className="r1-panel-head"><h2><Wallet /> Awaiting review</h2></div>
              <ul className="r1-approvals"><li><span>Invoices</span><strong>{approvals.invoices}</strong></li><li><span>Leave requests</span><strong>{approvals.leaves}</strong></li></ul>
              <a href="#">Review queues →</a>
            </section>

            <section className="r1-panel r1-promo">
              <p className="r1-eyebrow">Kanban</p>
              <h2>Stay on top of every task.</h2>
              <p>Turn to smart tools and real-time updates to keep your work moving.</p>
              <a href="#">Open board →</a>
            </section>
          </aside>
        </div>

        <div className="r1-bottom">
          <section className="r1-panel">
            <div className="r1-panel-head"><h2><PieChart /> Task distribution</h2></div>
            <Donut segments={[{ value: 74, color: '#10B981' }, { value: 23, color: '#F59E0B' }, { value: 31, color: '#EF4444' }]} center={128} label="Total" />
          </section>
          <section className="r1-panel">
            <div className="r1-panel-head"><h2><TrendingUp /> Weekly progress</h2></div>
            <AreaChart />
          </section>
          <section className="r1-panel">
            <div className="r1-panel-head"><h2><Users /> Team performance</h2></div>
            <TeamTable rows={team.slice(0, 4)} />
          </section>
        </div>
      </main>
    </div>
  );
}

function Burndown() {
  const max = 120;
  const x = (i: number) => (i / (burndown.weeks.length - 1)) * 100;
  const y = (value: number) => 94 - (value / max) * 86;
  const line = (values: number[]) => values.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(value)}`).join(' ');

  return (
    <div className="r2-burndown">
      <div className="r2-burndown-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Sprint burndown: ideal versus actual">
          {[8, 30, 52, 74, 96].map((v) => <line key={v} className="r2-grid" x1="0" x2="100" y1={v} y2={v} vectorEffect="non-scaling-stroke" />)}
          <path className="r2-ideal" d={line(burndown.ideal)} vectorEffect="non-scaling-stroke" />
          <path className="r2-actual" d={line(burndown.actual)} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="r2-burndown-labels">{burndown.weeks.map((week) => <span key={week}>{week}</span>)}</div>
    </div>
  );
}

export function React2() {
  const columns = [
    { label: 'To do', count: 31, tone: 'muted' as const, items: tasks.slice(2, 4) },
    { label: 'Active', count: 23, tone: 'warn' as const, items: tasks.slice(1, 3) },
    { label: 'Review', count: 12, tone: 'info' as const, items: tasks.slice(4, 6) },
    { label: 'Done', count: 74, tone: 'good' as const, items: tasks.slice(5, 7) },
  ];

  return (
    <div className="r2">
      <header className="r2-top">
        <div className="r2-brand"><span className="r2-logo">EV</span><div><strong>Command center</strong><span>Operations · live</span></div></div>
        <div className="r2-filters"><button className="is-active" type="button">Today</button><button type="button">Week</button><button type="button">Month</button></div>
        <div className="r2-actions"><span className="r2-live">● Live</span><button className="r2-icon" type="button" aria-label="Notifications"><Bell /></button><span className="r2-avatar">AR</span></div>
      </header>

      <main className="r2-main">
        <div className="r2-hero">
          <div>
            <p className="r2-eyebrow">Sprint 42 · day 8 of 10</p>
            <h1>Everything moving, <em>nothing on fire.</em></h1>
            <p>Throughput is up 12% week over week. Six overdue items need a decision.</p>
          </div>
          <div className="r2-hero-badges"><Chip tone="good">On track</Chip><span>128 open</span></div>
        </div>

        <section className="r2-tiles">
          {stats.map((stat) => (
            <article className={`r2-tile r2-tile--${stat.tone}`} key={stat.label}>
              <span>{stat.short}</span>
              <strong>{stat.value}</strong>
              <div><Delta value={stat.delta} dir={stat.dir} /><Spark values={stat.spark} /></div>
            </article>
          ))}
        </section>

        <div className="r2-grid">
          <section className="r2-panel r2-span2">
            <div className="r2-panel-head"><h2><Users /> Workload by team</h2><span>stacked</span></div>
            <div className="r2-stack">
              {team.map((member) => (
                <div className="r2-stack-row" key={member.name}>
                  <span>{member.name}</span>
                  <div><span className="r2-w-done" style={{ width: `${(member.done / (member.done + member.active + member.pending)) * 100}%` }} /><span className="r2-w-active" style={{ width: `${(member.active / (member.done + member.active + member.pending)) * 100}%` }} /><span className="r2-w-pending" style={{ width: `${(member.pending / (member.done + member.active + member.pending)) * 100}%` }} /></div>
                  <strong>{member.done + member.active + member.pending}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="r2-panel">
            <div className="r2-panel-head"><h2><ListTodo /> Pipeline</h2><span>4 columns</span></div>
            <div className="r2-pipeline">
              {columns.map((column) => (
                <div className="r2-pipe-col" key={column.label}>
                  <div className="r2-pipe-head"><span>{column.label}</span><Chip tone={column.tone}>{column.count}</Chip></div>
                  {column.items.map((item) => <p key={item.no}>{item.title}</p>)}
                </div>
              ))}
            </div>
          </section>

          <section className="r2-panel r2-span2">
            <div className="r2-panel-head"><h2><TrendingUp /> Sprint burndown</h2><span>ideal vs actual</span></div>
            <Burndown />
          </section>

          <section className="r2-panel">
            <div className="r2-panel-head"><h2><Activity /> Activity</h2><span className="r2-live">Live</span></div>
            <ul className="r2-feed">
              {activity.map((item) => (
                <li key={item.time}><span>{item.time}</span><div><strong>{item.who}</strong><span>{item.what}</span></div></li>
              ))}
            </ul>
          </section>

          <section className="r2-panel r2-span2">
            <div className="r2-panel-head"><h2><ListTodo /> Task pipeline</h2><a href="#">View all</a></div>
            <TaskTable rows={tasks.slice(0, 5)} dense />
          </section>

          <section className="r2-panel">
            <div className="r2-panel-head"><h2><Wallet /> Approvals</h2></div>
            <ul className="r2-approvals"><li><span>Invoices</span><strong>{approvals.invoices}</strong></li><li><span>Leave requests</span><strong>{approvals.leaves}</strong></li></ul>
            <button className="r2-primary" type="button">Review queues <ArrowRight /></button>
          </section>
        </div>
      </main>
    </div>
  );
}

export function React3() {
  return (
    <div className="r3">
      <header className="r3-top">
        <div className="r3-brand"><span className="r3-logo">EV</span><span>Analytics</span></div>
        <nav className="r3-tabs" aria-label="Primary">
          <a className="is-active" href="#">Overview</a><a href="#">Tasks</a><a href="#">Team</a><a href="#">Attendance</a>
        </nav>
        <div className="r3-actions"><button type="button">30 days</button><button type="button">Export</button><span className="r3-avatar">AR</span></div>
      </header>

      <main className="r3-main">
        <section className="r3-hero">
          <div>
            <p className="r3-eyebrow">Workspace overview</p>
            <h1>Operations, at a glance.</h1>
            <p>A clearer reading of the week: throughput, status mix, and the people carrying it.</p>
          </div>
          <div className="r3-hero-metrics">
            <div><span>Open tasks</span><strong>128</strong><Delta value="+12%" dir="up" /></div>
            <div><span>Completion</span><strong>58%</strong><Delta value="+8%" dir="up" /></div>
            <div><span>On-time</span><strong>91%</strong><Delta value="+4%" dir="up" /></div>
          </div>
        </section>

        <section className="r3-charts">
          <section className="r3-panel r3-panel--wide">
            <div className="r3-panel-head"><h2><TrendingUp /> Task throughput</h2><div className="r3-legend"><span><i className="r3-dot r3-dot--created" />Created</span><span><i className="r3-dot r3-dot--done" />Completed</span></div></div>
            <AreaChart />
          </section>
          <section className="r3-panel">
            <div className="r3-panel-head"><h2><PieChart /> Status mix</h2></div>
            <Donut segments={[{ value: 74, color: '#0D9488' }, { value: 23, color: '#F97316' }, { value: 31, color: '#6366F1' }]} center={128} label="Tasks" />
            <ul className="r3-mix"><li><i className="r3-dot r3-dot--done" />Done <strong>74</strong></li><li><i className="r3-dot r3-dot--active" />Active <strong>23</strong></li><li><i className="r3-dot r3-dot--todo" />To do <strong>31</strong></li></ul>
          </section>
        </section>

        <div className="r3-grid">
          <section className="r3-panel r3-panel--wide">
            <div className="r3-panel-head"><h2><Users /> Team performance</h2><a href="#">View all</a></div>
            <TeamTable rows={team} />
          </section>
          <section className="r3-panel">
            <div className="r3-panel-head"><h2><CalendarDays /> Upcoming deadlines</h2></div>
            <TaskList limit={5} />
          </section>
          <section className="r3-panel">
            <div className="r3-panel-head"><h2><Zap /> Quick actions</h2></div>
            <div className="r3-actions-grid">
              {quickActions.slice(0, 8).map((action) => (
                <button key={action.label} type="button" className={`r3-action r3-action--${action.tone}`}>{action.label}{action.badge ? <i>{action.badge}</i> : null}</button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export function React4() {
  return (
    <div className="r4">
      <header className="r4-top">
        <div className="r4-brand"><span className="r4-logo">EV</span><span>edVenture</span></div>
        <nav className="r4-nav" aria-label="Primary"><a className="is-active" href="#">Dashboard</a><a href="#">Tasks</a><a href="#">Clients</a><a href="#">Team</a></nav>
        <div className="r4-actions"><label className="r4-search"><Search /><input type="search" placeholder="Search" aria-label="Search" /></label><button className="r4-icon" type="button" aria-label="Notifications"><Bell /></button><span className="r4-avatar">AR</span></div>
      </header>

      <main className="r4-main">
        <section className="r4-hero">
          <div>
            <p className="r4-eyebrow">Thursday · 29 October</p>
            <h1>Good morning, Aisha.</h1>
            <p>Your workspace is calm. Six deadlines need a look before Friday.</p>
          </div>
          <div className="r4-orbs" aria-hidden="true"><span /><span /><span /></div>
        </section>

        <section className="r4-stats">
          {stats.map((stat) => (
            <article className={`r4-stat r4-stat--${stat.tone}`} key={stat.label}>
              <span>{stat.label}</span><strong>{stat.value}</strong><div><Delta value={stat.delta} dir={stat.dir} /><Spark values={stat.spark} /></div>
            </article>
          ))}
        </section>

        <div className="r4-grid">
          <section className="r4-panel r4-panel--wide">
            <div className="r4-panel-head"><h2>Weekly progress</h2><span>Mon — Sun</span></div>
            <AreaChart />
          </section>

          <section className="r4-panel r4-attendance">
            <div className="r4-panel-head"><h2><Clock /> Attendance</h2></div>
            <Ring value={68} label="Day" tone="primary" />
            <strong>{attendance.clockIn}</strong>
            <p>{attendance.elapsed} today · break {attendance.breakAt}</p>
            <button type="button">Clock out</button>
          </section>

          <section className="r4-panel">
            <div className="r4-panel-head"><h2><Sparkles /> Quick actions</h2></div>
            <div className="r4-actions-grid">
              {quickActions.slice(0, 8).map((action) => (
                <button key={action.label} type="button" className={`r4-action r4-action--${action.tone}`}>{action.label}</button>
              ))}
            </div>
          </section>

          <section className="r4-panel">
            <div className="r4-panel-head"><h2><CalendarDays /> Upcoming</h2></div>
            <TaskList limit={4} />
          </section>

          <section className="r4-panel r4-panel--wide">
            <div className="r4-panel-head"><h2><Users /> Team</h2><a href="#">View all</a></div>
            <TeamTable rows={team} />
          </section>
        </div>
      </main>
    </div>
  );
}

export function React5() {
  return (
    <div className="r5">
      <header className="r5-top">
        <div className="r5-brand"><span className="r5-logo">EV</span><span>edVenture</span></div>
        <nav className="r5-nav" aria-label="Primary"><a className="is-active" href="#">Dashboard</a><a href="#">Tasks</a><a href="#">Clients</a><a href="#">Team</a></nav>
        <div className="r5-actions"><label className="r5-search"><Search /><input type="search" placeholder="Search" aria-label="Search" /></label><button className="r5-icon" type="button" aria-label="Notifications"><Bell /></button><span className="r5-avatar">AR</span></div>
      </header>

      <main className="r5-main">
        <div className="r5-bento">
          <section className="r5-tile r5-hero">
            <p className="r5-eyebrow">Thursday · 29 Oct</p>
            <h1>Good morning, Aisha.</h1>
            <p>Six deadlines, five approvals, one calm morning.</p>
            <button type="button" className="r5-primary">Open kanban <ArrowRight /></button>
          </section>

          <section className="r5-tile r5-attendance">
            <div className="r5-tile-head"><h2><Clock /> Attendance</h2><Chip tone="good">On the clock</Chip></div>
            <strong>{attendance.clockIn}</strong>
            <p>{attendance.elapsed} today</p>
            <button type="button">Clock out</button>
          </section>

          <section className="r5-tile r5-focus">
            <div className="r5-tile-head"><h2><Sparkles /> Focus</h2></div>
            <Ring value={82} label="Sprint" tone="primary" />
            <p>Day 8 of 10 · 30 points left</p>
          </section>

          {stats.map((stat) => (
            <article className={`r5-tile r5-stat r5-stat--${stat.tone}`} key={stat.label}>
              <span>{stat.short}</span><strong>{stat.value}</strong><Delta value={stat.delta} dir={stat.dir} />
            </article>
          ))}

          <section className="r5-tile r5-chart">
            <div className="r5-tile-head"><h2><TrendingUp /> Week</h2><span>throughput</span></div>
            <AreaChart />
          </section>

          <section className="r5-tile r5-tasks">
            <div className="r5-tile-head"><h2><CalendarDays /> Deadlines</h2><a href="#">All</a></div>
            <TaskList limit={5} />
          </section>

          <section className="r5-tile r5-team">
            <div className="r5-tile-head"><h2><Users /> Team</h2><a href="#">View all</a></div>
            <TeamTable rows={team.slice(0, 4)} />
          </section>

          <section className="r5-tile r5-quick">
            <div className="r5-tile-head"><h2><Zap /> Quick actions</h2></div>
            <div className="r5-actions-grid">
              {quickActions.slice(0, 6).map((action) => (
                <button key={action.label} type="button" className={`r5-action r5-action--${action.tone}`}>{action.label}{action.badge ? <i>{action.badge}</i> : null}</button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
