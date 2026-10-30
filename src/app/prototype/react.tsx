/**
 * THROWAWAY PROTOTYPE — Layout Variant 1–5 (R1–R5).
 * Five dashboard arrangements built from the same production-style widgets
 * used by the theme showcase: welcome banner, glass stats, kanban CTA,
 * attendance, distribution, deadlines, quick actions, team, weekly progress.
 * Pick one as the future base; the rest get deleted.
 */

import './react.css';
import {
  ArrowRight,
  Bell,
  LayoutGrid,
  Menu,
  Plus,
  Search,
} from 'lucide-react';
import { DashboardSidebar } from './dashboard-sidebar';
import { stats, tasks, weekly } from './data';
import { Chip, Spark } from './shared';
import {
  AttendanceCard,
  DeadlinesCard,
  DistributionCard,
  KanbanCTA,
  QuickActionsCard,
  StatCards,
  TeamCard,
  WeeklyCard,
  WelcomeBanner,
} from './showcase';

const created = weekly.created.reduce((sum, value) => sum + value, 0);
const done = weekly.completed.reduce((sum, value) => sum + value, 0);
const rate = created > 0 ? Math.round((done / created) * 100) : 0;

function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="rx-topbar">
      <button className="rx-icon" type="button" aria-label="Open navigation"><Menu /></button>
      <div className="rx-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="rx-search">
        <Search aria-hidden="true" />
        <input type="search" placeholder="Search tasks, clients, people" aria-label="Search" />
      </div>
      <div className="rx-actions">
        <button className="rx-icon" type="button" aria-label="Notifications"><Bell /><i>3</i></button>
        <span className="rx-avatar" aria-hidden="true">AR</span>
      </div>
    </header>
  );
}

function RxShell({ theme, title, subtitle, children }: { theme: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className={`rx ${theme}`}>
      <DashboardSidebar />
      <div className="rx-main">
        <Topbar title={title} subtitle={subtitle} />
        <div className="rx-content">{children}</div>
      </div>
    </div>
  );
}

function KpiStrip() {
  const sparks = stats.map((stat) => stat.spark);
  return (
    <div className="rx-kpistrip">
      {stats.map((stat, index) => (
        <div className="rx-kpicell" key={stat.label}>
          <span>{stat.label}</span>
          <div>
            <strong>{stat.value}</strong>
            <Spark values={sparks[index]} className="rx-kpispark" />
          </div>
          <em className={stat.dir === 'up' ? 'is-up' : 'is-down'}>{stat.dir === 'up' ? '↑' : '↓'} {stat.delta}</em>
        </div>
      ))}
    </div>
  );
}

function KanbanBoard() {
  const columns = [
    { title: 'To do', tone: 'bad', rows: tasks.filter((t) => t.status === 'pending' || t.status === 'overdue') },
    { title: 'In progress', tone: 'warn', rows: tasks.filter((t) => t.status === 'active') },
    { title: 'Completed', tone: 'good', rows: tasks.filter((t) => t.status === 'done') },
  ];

  return (
    <section className="rx-boardcard">
      <div className="rx-card-head">
        <h3><LayoutGrid />Task board</h3>
        <button className="rx-primary" type="button"><Plus />New task</button>
      </div>
      <div className="rx-kanban">
        {columns.map((column) => (
          <div className={`rx-kcol rx-kcol--${column.tone}`} key={column.title}>
            <div className="rx-kcol-head"><span>{column.title}</span><b>{column.rows.length}</b></div>
            <div className="rx-kcol-body">
              {column.rows.map((task) => (
                <article className="rx-kcard" key={task.no}>
                  <div className="rx-kcard-top">
                    <span className="rx-kno">{task.no}</span>
                    <Chip tone={task.priority === 'High' ? 'bad' : task.priority === 'Medium' ? 'warn' : 'info'}>{task.priority}</Chip>
                  </div>
                  <p>{task.title}</p>
                  <div className="rx-kcard-foot"><span>{task.owner}</span><span>{task.due}</span></div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Layout Variant 1 · executive grid ─────────────────────────────────── */
export function React1() {
  return (
    <RxShell theme="r1" title="Dashboard" subtitle="Layout Variant 1 · Executive grid">
      <div className="rxv rxv1">
        <div className="a-welcome"><WelcomeBanner /></div>
        <div className="a-att"><AttendanceCard /></div>
        <div className="a-stats"><StatCards /></div>
        <div className="a-kanban"><KanbanCTA /></div>
        <div className="a-week"><WeeklyCard rate={rate} /></div>
        <div className="a-dist"><DistributionCard /></div>
        <div className="a-dead"><DeadlinesCard /></div>
        <div className="a-quick"><QuickActionsCard /></div>
        <div className="a-team"><TeamCard /></div>
      </div>
    </RxShell>
  );
}

/* ── Layout Variant 2 · bento mosaic ───────────────────────────────────── */
export function React2() {
  return (
    <RxShell theme="r5" title="Workspace" subtitle="Layout Variant 2 · Bento mosaic">
      <div className="rxv rxv2">
        <div className="b-stats"><StatCards /></div>
        <div className="b-week"><WeeklyCard rate={rate} /></div>
        <div className="b-dist"><DistributionCard /></div>
        <div className="b-team"><TeamCard /></div>
        <div className="b-dead"><DeadlinesCard /></div>
        <div className="b-quick"><QuickActionsCard /></div>
        <div className="b-kanban"><KanbanCTA /></div>
      </div>
    </RxShell>
  );
}

/* ── Layout Variant 3 · two-pane focus ─────────────────────────────────── */
export function React3() {
  return (
    <RxShell theme="r4" title="My workspace" subtitle="Layout Variant 3 · Two-pane focus">
      <div className="rxv3">
        <aside className="rxv3-rail">
          <WelcomeBanner />
          <AttendanceCard />
          <DeadlinesCard />
        </aside>
        <div className="rxv3-main">
          <StatCards />
          <WeeklyCard rate={rate} />
          <div className="rxv3-split">
            <DistributionCard />
            <QuickActionsCard />
          </div>
          <TeamCard />
        </div>
      </div>
    </RxShell>
  );
}

/* ── Layout Variant 4 · analytics workspace ────────────────────────────── */
export function React4() {
  return (
    <RxShell theme="r3" title="Analytics" subtitle="Layout Variant 4 · Analytics workspace">
      <div className="rx-toolbar">
        <div className="rx-ranges">
          <button type="button">Today</button>
          <button className="is-active" type="button">This week</button>
          <button type="button">This month</button>
          <button type="button">Quarter</button>
        </div>
        <button className="rx-primary" type="button">Export report <ArrowRight /></button>
      </div>

      <div className="rxv rxv4">
        <div className="d-stats"><StatCards /></div>
        <div className="d-week"><WeeklyCard rate={rate} /></div>
        <div className="d-dist"><DistributionCard /></div>
        <div className="d-team"><TeamCard /></div>
        <div className="d-dead"><DeadlinesCard /></div>
        <div className="d-quick"><QuickActionsCard /></div>
      </div>
    </RxShell>
  );
}

/* ── Layout Variant 5 · command board ──────────────────────────────────── */
export function React5() {
  return (
    <RxShell theme="r2" title="Command center" subtitle="Layout Variant 5 · Command board">
      <div className="rxv rxv5">
        <div className="e-kpi"><KpiStrip /></div>
        <div className="e-board"><KanbanBoard /></div>
        <div className="e-side">
          <AttendanceCard />
          <DeadlinesCard />
        </div>
        <div className="e-team"><TeamCard /></div>
        <div className="e-quick"><QuickActionsCard /></div>
      </div>
    </RxShell>
  );
}
