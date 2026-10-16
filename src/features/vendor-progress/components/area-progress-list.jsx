'use client';

import { useState } from 'react';
import { ChevronDown, MapPinned, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
 * One point of an area as a table row; clicking it opens the point's detail: a choice of shift
 * (Pagi, Sore, Malam) showing that shift's reports, and the assignments not yet worked.
 * @param {{ point: PointProgress }} props
 */
function PointRow({ point }) {
  const [open, setOpen] = useState(false);
  const groups = tasksByShift(point);
  const shifts = [...new Set([...SHIFT_ORDER, ...groups.map((group) => group.shift)])];
  const [shift, setShift] = useState(groups[0]?.shift ?? SHIFT_ORDER[0]);
  const done = point.tasks.filter((t) => t.status === REPORT_STATUS.COMPLETED).length;
  const working = point.tasks.filter((t) => t.status === REPORT_STATUS.IN_PROGRESS).length;
  const detailId = `point-${point.key}-detail`;

  return (
    <>
      <tr
        className="cursor-pointer border-b align-top hover:bg-muted/40"
        onClick={() => setOpen((value) => !value)}
      >
        <th scope="row" className="py-2.5 pr-3 text-left font-medium text-foreground">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
            className="inline-flex items-center gap-1.5 text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            />
            {point.name}
          </button>
        </th>
        <td className="py-2.5">
          <span className="flex flex-wrap gap-1.5">
            {done ? <Badge variant="success">{done} selesai</Badge> : null}
            {working ? <Badge variant="info">{working} dikerjakan</Badge> : null}
            {point.pending.length ? (
              <Badge variant="warning">{point.pending.length} belum dikerjakan</Badge>
            ) : null}
            {!done && !working && !point.pending.length ? '—' : null}
          </span>
        </td>
      </tr>
      {open ? (
        <tr id={detailId} className="border-b bg-muted/30">
          <td colSpan={2} className="px-3 py-4">
            <div className="flex flex-col gap-4">
              <Tabs value={shift} onValueChange={setShift}>
                <TabsList aria-label={`Shift di titik ${point.name}`}>
                  {shifts.map((code) => {
                    const count = groups.find((group) => group.shift === code)?.tasks.length ?? 0;
                    return (
                      <TabsTrigger key={code} value={code} className="px-3">
                        {shiftLabel(code)}
                        {count ? <span className="tabular-nums">({count})</span> : null}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {shifts.map((code) => {
                  const tasks = groups.find((group) => group.shift === code)?.tasks ?? [];
                  return (
                    <TabsContent key={code} value={code}>
                      {tasks.length ? (
                        <DetailTable title={`Shift ${shiftLabel(code)}`}>
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
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Belum ada laporan di shift {shiftLabel(code)}.
                        </p>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
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
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

/** Safety findings (reports with a note category) of an area. @param {AreaProgress} area */
export const findingsOf = (area) =>
  area.pointList.flatMap((point) => point.tasks).filter((task) => task.category).length;

/**
 * "Progres per area" of a vendor: one collapsible section per area (progress, points, workers,
 * shifts, safety findings) listing its points; clicking a point opens a choice of shift with
 * that shift's reports — who worked when, the status and the notes.
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
            <div className="overflow-x-auto border-t px-4 pb-4 sm:px-5">
              <table className="w-full min-w-[480px] text-sm">
                <caption className="sr-only">Titik di area {area.name}</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {['Titik', 'Status'].map((label) => (
                      <th key={label} scope="col" className="py-2.5 pr-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {area.pointList.map((point) => (
                    <PointRow key={point.key} point={point} />
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
