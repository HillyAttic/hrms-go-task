import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Download,
  Layers,
  PieChart,
  Radio,
  Server,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { activity, cohorts, funnel, mrrMovement, services, strategic, tactical, team, traffic } from './data';
import { AreaChart, Chip, Delta, Progress, Ring, Spark } from './shared';

export function Kpi2() {
  return (
    <div className="k2">
      <header className="k2-top">
        <div className="k2-brand">
          <span className="k2-mark">EV</span>
          <div><strong>Strategy room</strong><span>Q4 2026 scorecard</span></div>
        </div>
        <nav className="k2-nav" aria-label="Primary">
          <a className="is-active" href="#">Scorecard</a>
          <a href="#">Objectives</a>
          <a href="#">Signals</a>
          <a href="#">Methodology</a>
        </nav>
        <div className="k2-user"><span>Q4 2026</span><span className="k2-avatar">AR</span></div>
      </header>

      <main className="k2-main">
        <section className="k2-hero">
          <div>
            <p className="k2-eyebrow">Strategic view · updated 09:42</p>
            <h1>One page. Four bets. <em>One quarter.</em></h1>
            <p className="k2-lede">
              The scorecard keeps the quarter honest: strategic outcomes at the top, tactical owners in the middle,
              and the daily signals that move them.
            </p>
          </div>
          <div className="k2-hero-side">
            <Ring value={89} label="Overall health" tone="good" />
            <div>
              <span className="k2-kicker">Confidence</span>
              <strong>High</strong>
              <p>3 of 4 targets on pace.</p>
            </div>
          </div>
        </section>

        <section className="k2-section">
          <div className="k2-section-head"><h2><Target /> Strategic outcomes</h2><span>vs. Q4 target</span></div>
          <div className="k2-strategic">
            {strategic.map((item) => (
              <article className="k2-card" key={item.label}>
                <div className="k2-card-top">
                  <span className="k2-card-label">{item.label}</span>
                  <Delta value={item.delta} dir={item.dir} />
                </div>
                <div className="k2-card-value">{item.value}</div>
                <div className="k2-card-target">Target {item.target}</div>
                <Progress value={item.pct} tone={item.pct >= 96 ? 'good' : item.pct >= 90 ? 'warn' : 'bad'} />
                <span className="k2-card-pct">{item.pct}% of target</span>
              </article>
            ))}
          </div>
        </section>

        <div className="k2-split">
          <section className="k2-panel">
            <div className="k2-section-head"><h2><Layers /> Tactical objectives</h2><a href="#">View all <ArrowRight /></a></div>
            <ul className="k2-objectives">
              {tactical.map((objective) => (
                <li key={objective.objective}>
                  <div className="k2-obj-main">
                    <div><strong>{objective.objective}</strong><span>{objective.owner} · due {objective.due}</span></div>
                    <Chip tone={objective.tone}>{objective.status}</Chip>
                  </div>
                  <div className="k2-obj-progress">
                    <Progress value={objective.progress} tone={objective.tone} />
                    <span>{objective.progress}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="k2-panel">
            <div className="k2-section-head"><h2><Activity /> Throughput</h2><span>7 days</span></div>
            <AreaChart />
            <div className="k2-legend">
              <span><i className="k2-dot k2-dot--created" />Created</span>
              <span><i className="k2-dot k2-dot--done" />Completed</span>
            </div>
          </section>
        </div>

        <div className="k2-split k2-split--3">
          <section className="k2-panel k2-panel--dark">
            <p className="k2-eyebrow k2-eyebrow--light">Operational signals</p>
            <h2>Today’s pulse</h2>
            <div className="k2-signals">
              <div><strong>23</strong><span>In progress</span></div>
              <div><strong>6</strong><span>Overdue</span></div>
              <div><strong>2</strong><span>Invoices</span></div>
              <div><strong>3</strong><span>Leave requests</span></div>
            </div>
          </section>

          <section className="k2-panel">
            <div className="k2-section-head"><h2><Users /> Ownership</h2><span>5 members</span></div>
            <ul className="k2-owners">
              {team.slice(0, 4).map((member) => (
                <li key={member.name}>
                  <span>{member.name}</span>
                  <div><Progress value={member.load} tone={member.load > 75 ? 'warn' : 'good'} /><b>{member.load}%</b></div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="k2-foot">
          Methodology: values are normalised monthly; targets set 1 Oct 2026. <a href="#">Read the metric definitions →</a>
        </footer>
      </main>
    </div>
  );
}

export function Kpi3() {
  const gauges = [
    { label: 'Uptime', value: '99.98%', note: '30d', spark: [9, 9, 10, 9, 10, 10, 10], tone: 'good' as const },
    { label: 'P95 latency', value: '240ms', note: '+18ms', spark: [4, 5, 5, 6, 5, 7, 6], tone: 'warn' as const },
    { label: 'Error rate', value: '0.12%', note: '−0.03', spark: [3, 2, 3, 2, 2, 1, 2], tone: 'good' as const },
    { label: 'Queue depth', value: '18', note: 'retrying', spark: [3, 4, 4, 5, 4, 6, 5], tone: 'info' as const },
  ];

  return (
    <div className="k3">
      <header className="k3-top">
        <div className="k3-brand">
          <span className="k3-pulse" />
          <div><strong>Operations center</strong><span>Live · eu-west-1</span></div>
        </div>
        <div className="k3-status"><span className="k3-live-dot" />All systems nominal</div>
        <div className="k3-top-right"><span>09:42:18 UTC</span><button className="k3-icon" aria-label="Notifications"><Bell /></button><span className="k3-avatar">AR</span></div>
      </header>

      <main className="k3-main">
        <div className="k3-alert">
          <AlertTriangle />
          <div><strong>Sync worker degraded</strong><span>Retry backlog at 320/min · on-call notified 09:31</span></div>
          <button type="button">View incident <ArrowRight /></button>
        </div>

        <section className="k3-gauges">
          {gauges.map((gauge) => (
            <article className="k3-gauge" key={gauge.label}>
              <div className="k3-gauge-head"><span>{gauge.label}</span><Chip tone={gauge.tone}>{gauge.note}</Chip></div>
              <strong>{gauge.value}</strong>
              <Spark values={gauge.spark} />
            </article>
          ))}
        </section>

        <div className="k3-split">
          <section className="k3-panel">
            <div className="k3-panel-head"><h2><Server /> Service health</h2><span>Last 60 min</span></div>
            <div className="k3-table-wrap">
              <table className="k3-table">
                <thead><tr><th scope="col">Service</th><th scope="col">Status</th><th scope="col">Uptime</th><th scope="col">P95</th><th scope="col">Throughput</th><th scope="col">Trend</th></tr></thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.name}>
                      <td className="k3-service">{service.name}</td>
                      <td><Chip tone={service.tone}>{service.status}</Chip></td>
                      <td className="k3-num">{service.uptime}</td>
                      <td className="k3-num">{service.latency}</td>
                      <td className="k3-num">{service.throughput}</td>
                      <td><Spark values={service.spark} className="k3-row-spark" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="k3-panel">
            <div className="k3-panel-head"><h2><Radio /> Live events</h2><span className="k3-live">LIVE</span></div>
            <ul className="k3-feed">
              {activity.map((item) => (
                <li key={item.time}>
                  <span className="k3-time">{item.time}</span>
                  <div><strong>{item.who}</strong><span>{item.what}</span></div>
                  <Chip tone={item.tone}>{item.tone === 'good' ? 'ok' : item.tone === 'warn' ? 'warn' : 'sys'}</Chip>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="k3-split">
          <section className="k3-panel">
            <div className="k3-panel-head"><h2><Activity /> Request throughput</h2><span>60 min</span></div>
            <div className="k3-bars" role="img" aria-label="Request throughput over the last 60 minutes">
              {traffic.map((value, i) => <span key={i} style={{ height: `${(value / 40) * 100}%` }} />)}
            </div>
            <div className="k3-axis"><span>60m ago</span><span>now</span></div>
          </section>

          <section className="k3-panel k3-oncall">
            <p className="k3-eyebrow">On call</p>
            <div className="k3-oncall-row">
              <span className="k3-avatar k3-avatar--lg">ML</span>
              <div><strong>Marcus Lee</strong><span>Primary · until 18:00</span></div>
            </div>
            <div className="k3-oncall-meta">
              <div><span>Open incidents</span><strong>1</strong></div>
              <div><span>MTTR</span><strong>14m</strong></div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export function Kpi4() {
  const headline = [
    { label: 'MRR', value: '$128.4k', delta: '+6.2%', note: 'vs. October', spark: [8, 9, 10, 9, 11, 12, 13], tone: 'navy' },
    { label: 'Net revenue retention', value: '112%', delta: '+3pt', note: 'target 115%', spark: [9, 9, 10, 10, 11, 11, 12], tone: 'green' },
    { label: 'Logo churn', value: '1.8%', delta: '−0.4pt', note: 'target <2%', spark: [5, 4, 4, 3, 3, 2, 2], tone: 'coral' },
    { label: 'LTV : CAC', value: '4.2x', delta: '+0.3x', note: 'target 4x', spark: [3, 3, 4, 3, 4, 4, 5], tone: 'navy' },
  ];
  const risks = [
    { name: 'Northwind Academy', detail: 'Renewal 14 Nov · $4.2k MRR', tone: 'bad' as const, label: 'High risk' },
    { name: 'Alder & Finch', detail: 'Usage down 22% · $2.8k MRR', tone: 'warn' as const, label: 'Watch' },
    { name: 'Brightpath Tutors', detail: 'Onboarding day 6 · $1.6k MRR', tone: 'good' as const, label: 'On track' },
  ];

  return (
    <div className="k4">
      <header className="k4-top">
        <div className="k4-brand"><span className="k4-mark">EV</span><div><strong>Growth</strong><span>SaaS metrics · Nov 2026</span></div></div>
        <nav className="k4-nav" aria-label="Primary">
          <a className="is-active" href="#">Overview</a><a href="#">Retention</a><a href="#">Accounts</a><a href="#">Methodology</a>
        </nav>
        <div className="k4-actions"><button type="button">Last 30 days</button><button className="k4-ghost" type="button">Export <Download /></button><span className="k4-avatar">AR</span></div>
      </header>

      <main className="k4-main">
        <div className="k4-title">
          <div>
            <p className="k4-eyebrow">Executive summary</p>
            <h1>Growth is compounding — <span>retention is the constraint.</span></h1>
            <p>Four headline KPIs, one week-over-week view, and the accounts that need attention.</p>
          </div>
          <button className="k4-primary" type="button">Open board pack <ArrowRight /></button>
        </div>

        <section className="k4-kpis">
          {headline.map((item) => (
            <article className={`k4-kpi k4-kpi--${item.tone}`} key={item.label}>
              <div className="k4-kpi-head"><span>{item.label}</span><Delta value={item.delta} dir="up" /></div>
              <strong>{item.value}</strong>
              <div className="k4-kpi-foot"><span>{item.note}</span><Spark values={item.spark} /></div>
            </article>
          ))}
        </section>

        <div className="k4-split">
          <section className="k4-panel">
            <div className="k4-panel-head"><h2><TrendingUp /> MRR movement</h2><span>Net +$13.1k</span></div>
            <div className="k4-mrr">
              {mrrMovement.map((item) => (
                <div className="k4-mrr-row" key={item.label}>
                  <span>{item.label}</span>
                  <div className="k4-mrr-track"><span className={`k4-mrr-fill k4-mrr-fill--${item.tone}`} style={{ width: `${(Math.abs(item.value) / 13) * 100}%` }} /></div>
                  <strong>{item.value > 0 ? '+' : ''}{item.value}k</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="k4-panel">
            <div className="k4-panel-head"><h2><PieChart /> Funnel</h2><span>30 days</span></div>
            <ul className="k4-funnel">
              {funnel.map((step) => (
                <li key={step.label}>
                  <span>{step.label}</span>
                  <div><Progress value={step.pct} tone="primary" /></div>
                  <strong>{step.value.toLocaleString()}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="k4-split">
          <section className="k4-panel">
            <div className="k4-panel-head"><h2><Users /> Retention cohorts</h2><span>monthly</span></div>
            <div className="k4-cohorts">
              <div className="k4-cohort-row k4-cohort-head"><span /><i>M0</i><i>M1</i><i>M2</i><i>M3</i><i>M4</i></div>
              {cohorts.map((row) => (
                <div className="k4-cohort-row" key={row.month}>
                  <span>{row.month}</span>
                  {row.values.map((value, i) => (
                    <i key={i} style={{ background: value ? `rgba(16, 185, 129, ${0.08 + value / 130})` : 'transparent' }}>{value || '—'}</i>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="k4-panel">
            <div className="k4-panel-head"><h2><Wallet /> Accounts at risk</h2><a href="#">View all</a></div>
            <ul className="k4-risk">
              {risks.map((account) => (
                <li key={account.name}>
                  <div><strong>{account.name}</strong><span>{account.detail}</span></div>
                  <Chip tone={account.tone}>{account.label}</Chip>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="k4-foot">MRR is normalised to a monthly rate. Annual plans ÷ 12; quarterly ÷ 3. <a href="#">Methodology →</a></footer>
      </main>
    </div>
  );
}

export function Kpi5() {
  const departments = [
    { name: 'Operations', pct: 81, tone: 'good' as const, note: '17 of 21 objectives on track' },
    { name: 'Client success', pct: 74, tone: 'warn' as const, note: '2 renewals need attention' },
    { name: 'Finance', pct: 68, tone: 'bad' as const, note: 'invoice lag at 5.2 days' },
  ];

  return (
    <div className="k5">
      <header className="k5-masthead">
        <div>
          <span className="k5-eyebrow">EdVentureHub · Operations</span>
          <h1>Board pack</h1>
          <p>Q4 2026 · 29 October</p>
        </div>
        <div className="k5-mast-right">
          <span>Prepared by A. Rahman</span>
          <button type="button">Download PDF <Download /></button>
        </div>
      </header>

      <main className="k5-page">
        <div className="k5-rule" />

        <section className="k5-summary">
          <p className="k5-dropcap">
            The quarter is on pace. Revenue is within 5% of target, retention is holding above 94%, and SLA
            compliance has recovered after the September backlog. The remaining risk sits in finance operations,
            where invoice lag is still above the three-day goal.
          </p>
          <div className="k5-callouts">
            <div><span>Revenue</span><strong>$128.4k</strong><Delta value="+6.2%" dir="up" /></div>
            <div><span>Retention</span><strong>94.2%</strong><Delta value="+1.4pt" dir="up" /></div>
            <div><span>SLA</span><strong>97.8%</strong><Delta value="+0.6pt" dir="up" /></div>
          </div>
        </section>

        <section className="k5-section">
          <h2>Strategic scorecard</h2>
          <table className="k5-table">
            <thead><tr><th scope="col">Metric</th><th scope="col">Actual</th><th scope="col">Target</th><th scope="col">Variance</th><th scope="col">Trend</th></tr></thead>
            <tbody>
              {strategic.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td className="k5-num">{item.value}</td>
                  <td className="k5-num">{item.target}</td>
                  <td><Progress value={item.pct} tone={item.pct >= 96 ? 'good' : item.pct >= 90 ? 'warn' : 'bad'} /><span className="k5-var">{item.pct}%</span></td>
                  <td><Delta value={item.delta} dir={item.dir} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="k5-columns">
          <section>
            <h2>Performance</h2>
            <AreaChart />
            <div className="k5-legend"><span><i className="k5-dot k5-dot--created" />Created</span><span><i className="k5-dot k5-dot--done" />Completed</span></div>
          </section>
          <section>
            <h2>Risks &amp; actions</h2>
            <ul className="k5-risks">
              {tactical.slice(0, 4).map((objective) => (
                <li key={objective.objective}>
                  <div><strong>{objective.objective}</strong><span>{objective.owner} · due {objective.due}</span></div>
                  <Chip tone={objective.tone}>{objective.status}</Chip>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="k5-section">
          <h2>Department scorecards</h2>
          <div className="k5-depts">
            {departments.map((department) => (
              <article key={department.name}>
                <div className="k5-dept-head"><strong>{department.name}</strong><span>{department.pct}%</span></div>
                <Progress value={department.pct} tone={department.tone} />
                <p>{department.note}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="k5-foot">
          <span>Methodology: normalised monthly; targets set 1 Oct 2026.</span>
          <span>Page 1 of 1 · EdVentureHub</span>
        </footer>
      </main>
    </div>
  );
}
