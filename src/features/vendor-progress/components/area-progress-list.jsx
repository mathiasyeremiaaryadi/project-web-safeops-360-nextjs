'use client';

import { useState } from 'react';
import { ChevronDown, MapPinned, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatTime } from '@/lib/date';
import { NOTE_CATEGORY_LABELS, REPORT_STATUS, REPORT_STATUS_BADGES } from '@/lib/task-reports';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';

/** @typedef {import('@/features/vendor-progress/lib/progress').AreaProgress} AreaProgress */
/** @typedef {import('@/features/vendor-progress/lib/progress').PointProgress} PointProgress */
/** @typedef {import('@/features/vendor-progress/lib/progress').PointTask} PointTask */

/** Shift codes of the reports (master data `/shifts`); an unknown code is shown as itself. */
const SHIFT_LABELS = Object.freeze({ DAY: 'Pagi', EVENING: 'Sore', NIGHT: 'Malam' });

/** @param {string} shift */
export const shiftLabel = (shift) =>
  SHIFT_LABELS[/** @type {keyof typeof SHIFT_LABELS} */ (shift)] ?? shift;

/** @param {string | null} category */
const categoryLabel = (category) =>
  NOTE_CATEGORY_LABELS[/** @type {keyof typeof NOTE_CATEGORY_LABELS} */ (category ?? '')] ??
  category;

/** Shift order of the point detail: the day's shifts, then any other code. */
const SHIFT_ORDER = Object.freeze(['DAY', 'EVENING', 'NIGHT']);

/** @param {string} shift */
const shiftRank = (shift) => {
  const index = SHIFT_ORDER.indexOf(shift);
  return index === -1 ? SHIFT_ORDER.length : index;
};

/**
 * A point's reports grouped per shift (Pagi, Sore, Malam, in that order).
 * @param {PointProgress} point
 * @returns {{ shift: string, tasks: PointTask[] }[]}
 */
const tasksByShift = (point) => {
  /** @type {Map<string, PointTask[]>} */
  const groups = new Map();
  for (const task of point.tasks) groups.set(task.shift, [...(groups.get(task.shift) ?? []), task]);
  return [...groups.entries()]
    .map(([shift, tasks]) => ({ shift, tasks }))
    .sort((a, b) => shiftRank(a.shift) - shiftRank(b.shift) || a.shift.localeCompare(b.shift));
};

/** @param {PointTask} task */
const timeOf = (task) =>
  `${formatTime(task.openDate)} – ${task.closeDate ? formatTime(task.closeDate) : '…'}`;

/**
 * One line of a point's detail: worker, status, time and notes.
 * @param {{ worker: string, status: string, time: string, notes: string | null, category: string | null }} props
 */
function DetailRow({ worker, status, time, notes, category }) {
  return (
    <tr className="border-b align-top last:border-0">
      <td className="py-2.5 pr-3 text-foreground">{worker}</td>
      <td className="py-2.5 pr-3">
        <StatusBadge status={REPORT_STATUS_BADGES[status]} fallback={status || '—'} />
      </td>
      <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">{time}</td>
      <td className="py-2.5">
        {category ? (
          <Badge variant="danger" className="mb-1">
            {categoryLabel(category)}
          </Badge>
        ) : null}
        <span className="block text-muted-foreground">{notes ?? '—'}</span>
      </td>
    </tr>
  );
}

/** @param {{ title: string, children: import('react').ReactNode }} props */
function DetailTable({ title, children }) {
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              {['Worker', 'Status', 'Waktu', 'Catatan'].map((label) => (
                <th key={label} scope="col" className="py-2 pr-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * One point of an area: a summary line that opens the reports per shift (Pagi, Sore, Malam) and
 * the assignments without a report.
 * @param {{ point: PointProgress, open: boolean }} props
 */
function PointDetails({ point, open }) {
  const groups = tasksByShift(point);
  const done = point.tasks.filter((t) => t.status === REPORT_STATUS.COMPLETED).length;
  const working = point.tasks.filter((t) => t.status === REPORT_STATUS.IN_PROGRESS).length;
  const findings = point.tasks.filter((t) => t.category).length;
  return (
    <details className="group/point border-b last:border-0" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="font-medium text-foreground">{point.name}</span>
          <span className="flex flex-wrap gap-1.5">
            {groups.map(({ shift }) => (
              <Badge key={shift} variant="neutral">
                {shiftLabel(shift)}
              </Badge>
            ))}
            {done ? <Badge variant="success">{done} selesai</Badge> : null}
            {working ? <Badge variant="info">{working} dikerjakan</Badge> : null}
            {point.pending.length ? (
              <Badge variant="warning">{point.pending.length} belum dikerjakan</Badge>
            ) : null}
            {findings ? (
              <Badge variant="danger">
                <ShieldAlert aria-hidden="true" className="size-3.5" />
                {findings} temuan
              </Badge>
            ) : null}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open/point:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 pb-4 pl-3 sm:pl-4">
        {groups.map(({ shift, tasks }) => (
          <DetailTable key={shift} title={`Shift ${shiftLabel(shift)}`}>
            {tasks.map((task) => (
              <DetailRow
                key={task.key}
                worker={task.workerName ?? '—'}
                status={task.status}
                time={timeOf(task)}
                notes={task.notes}
                category={task.category}
              />
            ))}
          </DetailTable>
        ))}
        {point.pending.length ? (
          <DetailTable title="Belum dikerjakan">
            {point.pending.map((pending) => (
              <DetailRow
                key={pending.key}
                worker={pending.workerName ?? '—'}
                status={REPORT_STATUS.PENDING}
                time="—"
                notes={null}
                category={null}
              />
            ))}
          </DetailTable>
        ) : null}
        {groups.length === 0 && point.pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada penugasan di titik ini.</p>
        ) : null}
      </div>
    </details>
  );
}

/** Safety findings (reports with a note category) of an area. @param {AreaProgress} area */
export const findingsOf = (area) =>
  area.pointList.flatMap((point) => point.tasks).filter((task) => task.category).length;

/**
 * "Progres per area" of a vendor: one collapsible section per area (progress, points, workers,
 * shifts, safety findings) listing its points; a point opens its reports per shift — who worked
 * when, the status and the notes.
 * @param {{ areas: AreaProgress[] }} props
 */
export function AreaProgressList({ areas }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  /** @param {string | null | undefined} text */
  const matches = (text) =>
    String(text ?? '')
      .toLowerCase()
      .includes(needle);
  const visible = needle
    ? areas
        .map((area) =>
          matches(area.name)
            ? area
            : {
                ...area,
                pointList: area.pointList.filter(
                  (point) =>
                    matches(point.name) ||
                    point.tasks.some((t) => matches(t.workerName)) ||
                    point.pending.some((p) => matches(p.workerName)),
                ),
              },
        )
        .filter((area) => area.pointList.length > 0)
    : areas;

  if (areas.length === 0) return <EmptyState icon={MapPinned} title="Belum ada detail area" />;

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Cari area, titik, atau worker"
      />
      {visible.length === 0 ? (
        <EmptyState icon={MapPinned} title="Tidak ada area yang cocok" />
      ) : null}
      {visible.map((area) => {
        const findings = findingsOf(area);
        return (
          <details
            key={area.key}
            className="group rounded-2xl border bg-card"
            open={Boolean(needle)}
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold text-foreground">{area.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {area.completed} dari {area.total} selesai · {area.points} titik ·{' '}
                    {area.workers} worker
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </span>
              <ProgressBar percent={area.percent} label={`Progres ${area.name}`} />
              <span className="flex flex-wrap gap-1.5">
                {area.shifts.map((shift) => (
                  <Badge key={shift} variant="neutral">
                    Shift {shiftLabel(shift)}
                  </Badge>
                ))}
                {area.inProgress ? (
                  <Badge variant="info">{area.inProgress} dikerjakan</Badge>
                ) : null}
                {area.notStarted ? (
                  <Badge variant="warning">{area.notStarted} belum dikerjakan</Badge>
                ) : null}
                {findings ? (
                  <Badge variant="danger">
                    <ShieldAlert aria-hidden="true" className="size-3.5" />
                    {findings} temuan safety
                  </Badge>
                ) : null}
              </span>
            </summary>
            <div className="border-t px-4 sm:px-5">
              {area.pointList.map((point) => (
                <PointDetails key={point.key} point={point} open={Boolean(needle)} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
