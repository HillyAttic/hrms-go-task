import type { ReactNode } from 'react';
import { statusLabel, tasks, team, weekly, type TaskStatus, type Tone } from './data';

export const statusTone: Record<TaskStatus, Tone> = {
  done: 'good',
  active: 'warn',
  pending: 'muted',
  overdue: 'bad',
};

export function Spark({ values, className = '' }: { values: number[]; className?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((value, i) => `${(i / (values.length - 1)) * 100},${30 - ((value - min) / span) * 24}`)
    .join(' ');

  return (
    <svg className={`v-spark ${className}`} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Donut({
  segments,
  center,
  label,
  className = '',
}: {
  segments: { value: number; color: string }[];
  center?: string | number;
  label?: string;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const gap = 4;
  let offset = 0;

  return (
    <div className={`v-donut-wrap ${className}`}>
      <svg viewBox="0 0 100 100" className="v-donut" role="img" aria-label={`Distribution of ${total} tasks`}>
        <circle className="v-donut-track" cx="50" cy="50" r={radius} fill="none" strokeWidth="14" />
        <g transform="rotate(-90 50 50)">
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const visible = Math.max(length - gap, 0);
            const circle = (
              <circle
                key={`${segment.color}-${segment.value}`}
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
      <div className="v-donut-center">
        <strong>{center ?? total}</strong>
        {label ? <span>{label}</span> : null}
      </div>
    </div>
  );
}

export function AreaChart({
  created = weekly.created,
  completed = weekly.completed,
  labels = weekly.labels,
  className = '',
}: {
  created?: number[];
  completed?: number[];
  labels?: string[];
  className?: string;
}) {
  const max = Math.max(...created, ...completed, 1);
  const x = (i: number) => (i / (labels.length - 1)) * 100;
  const y = (value: number) => 96 - (value / max) * 88;
  const line = (values: number[]) => values.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(value)}`).join(' ');
  const area = (values: number[]) => `${line(values)} L100,100 L0,100 Z`;

  return (
    <div className={`v-area ${className}`}>
      <div className="v-area-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Tasks created and completed">
          {[4, 26, 48, 70, 92].map((v) => (
            <line key={v} className="v-grid-line" x1="0" x2="100" y1={v} y2={v} vectorEffect="non-scaling-stroke" />
          ))}
          <path className="v-area-created" d={area(created)} />
          <path className="v-area-done" d={area(completed)} />
          <path className="v-line-created" d={line(created)} vectorEffect="non-scaling-stroke" />
          <path className="v-line-done" d={line(completed)} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="v-area-dots" aria-hidden="true">
          {created.map((value, i) => (
            <i key={`c-${i}`} className="v-adot v-adot--created" style={{ left: `${x(i)}%`, top: `${y(value)}%` }} />
          ))}
          {completed.map((value, i) => (
            <i key={`d-${i}`} className="v-adot v-adot--done" style={{ left: `${x(i)}%`, top: `${y(value)}%` }} />
          ))}
        </div>
      </div>
      <div className="v-area-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function Ring({ value, label, tone = 'primary' }: { value: number; label?: string; tone?: Tone | 'primary' }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(value, 100) / 100) * circumference;

  return (
    <div className={`v-ring v-ring--${tone}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="v-ring-track" cx="50" cy="50" r={radius} fill="none" strokeWidth="8" />
        <circle
          className="v-ring-value"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="v-ring-center">
        <strong>{Math.round(value)}%</strong>
        {label ? <span>{label}</span> : null}
      </div>
    </div>
  );
}

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`v-chip v-chip--${tone}`}>{children}</span>;
}

export function Delta({ value, dir }: { value: string; dir: 'up' | 'down' }) {
  return <span className={`v-delta v-delta--${dir}`}>{dir === 'up' ? '↑' : '↓'} {value}</span>;
}

export function Progress({ value, tone = 'primary' }: { value: number; tone?: Tone | 'primary' }) {
  return (
    <span className="v-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span className={`v-progress-fill v-progress-fill--${tone}`} style={{ width: `${value}%` }} />
    </span>
  );
}

export function TaskTable({ rows = tasks, dense = false }: { rows?: typeof tasks; dense?: boolean }) {
  return (
    <div className="v-table-wrap">
      <table className={`v-table v-task-table ${dense ? 'v-table--dense' : ''}`}>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Task</th>
            <th scope="col">Client</th>
            <th scope="col">Owner</th>
            <th scope="col">Due</th>
            <th scope="col">Status</th>
            <th scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => (
            <tr key={task.no}>
              <td className="v-table-no">{task.no}</td>
              <td className="v-table-title">{task.title}</td>
              <td>{task.client}</td>
              <td>{task.owner}</td>
              <td className="v-nowrap">{task.due}</td>
              <td><Chip tone={statusTone[task.status]}>{statusLabel[task.status]}</Chip></td>
              <td>
                <span className="v-progress-cell">
                  <Progress value={task.progress} tone={statusTone[task.status]} />
                  <b>{task.progress}%</b>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeamTable({ rows = team }: { rows?: typeof team }) {
  return (
    <div className="v-table-wrap">
      <table className="v-table v-team-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Total</th>
            <th scope="col">Pending</th>
            <th scope="col">Active</th>
            <th scope="col">Done</th>
            <th scope="col">Workload</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((member) => {
            const total = member.done + member.active + member.pending;
            return (
              <tr key={member.name}>
                <td className="v-table-title">{member.name}</td>
                <td className="v-num">{total}</td>
                <td className="v-num">{member.pending}</td>
                <td className="v-num">{member.active}</td>
                <td className="v-num">{member.done}</td>
                <td>
                  <span className="v-workload" title={`${member.done} done, ${member.active} active, ${member.pending} pending`}>
                    <span className="v-w-done" style={{ width: `${(member.done / total) * 100}%` }} />
                    <span className="v-w-active" style={{ width: `${(member.active / total) * 100}%` }} />
                    <span className="v-w-pending" style={{ width: `${(member.pending / total) * 100}%` }} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TaskList({ rows = tasks, limit = 5 }: { rows?: typeof tasks; limit?: number }) {
  return (
    <ul className="v-task-list">
      {rows.slice(0, limit).map((task) => (
        <li key={task.no}>
          <span className="v-task-no">{task.no}</span>
          <div className="v-task-copy">
            <p>{task.title}</p>
            <span>{task.client} · {task.owner} · Due {task.due}</span>
          </div>
          <Chip tone={statusTone[task.status]}>{statusLabel[task.status]}</Chip>
        </li>
      ))}
    </ul>
  );
}
