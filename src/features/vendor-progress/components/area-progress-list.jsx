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

/** Shift codes of the reports (master data `/shifts`); an unknown code is shown as itself. */
const SHIFT_LABELS = Object.freeze({ DAY: 'Pagi', EVENING: 'Sore', NIGHT: 'Malam' });

/** @param {string} shift */
export const shiftLabel = (shift) =>
  SHIFT_LABELS[/** @type {keyof typeof SHIFT_LABELS} */ (shift)] ?? shift;

/** @param {string | null} category */
const categoryLabel = (category) =>
  NOTE_CATEGORY_LABELS[/** @type {keyof typeof NOTE_CATEGORY_LABELS} */ (category ?? '')] ??
  category;

/** Rows of a point: its reports, then its assignments without a report. @param {PointProgress} point */
const pointRows = (point) => [
  ...point.tasks.map((task) => ({
    key: task.key,
    shift: shiftLabel(task.shift),
    worker: task.workerName ?? '—',
    status: task.status,
    time: `${formatTime(task.openDate)} – ${task.closeDate ? formatTime(task.closeDate) : '…'}`,
    notes: task.notes,
    category: task.category,
  })),
  ...point.pending.map((pending) => ({
    key: pending.key,
    shift: '—',
    worker: pending.workerName ?? '—',
    status: REPORT_STATUS.PENDING,
    time: '—',
    notes: null,
    category: null,
  })),
];

/** Safety findings (reports with a note category) of an area. @param {AreaProgress} area */
export const findingsOf = (area) =>
  area.pointList.flatMap((point) => point.tasks).filter((task) => task.category).length;

/**
 * "Progres per area" of a vendor: one collapsible section per area (progress, points, workers,
 * shifts, safety findings) with its points — who worked when, the status and the notes.
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
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Titik di area {area.name}</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {['Titik', 'Shift', 'Worker', 'Status', 'Waktu', 'Catatan'].map((label) => (
                      <th key={label} scope="col" className="py-2.5 pr-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {area.pointList.flatMap((point) =>
                    pointRows(point).map((row, index) => (
                      <tr
                        key={`${point.key}-${row.key}`}
                        className="border-b align-top last:border-0"
                      >
                        <th
                          scope="row"
                          className="py-2.5 pr-3 text-left font-medium text-foreground"
                        >
                          {index === 0 ? point.name : <span className="sr-only">{point.name}</span>}
                        </th>
                        <td className="py-2.5 pr-3">{row.shift}</td>
                        <td className="py-2.5 pr-3">{row.worker}</td>
                        <td className="py-2.5 pr-3">
                          <StatusBadge
                            status={REPORT_STATUS_BADGES[row.status]}
                            fallback={row.status || '—'}
                          />
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">{row.time}</td>
                        <td className="py-2.5">
                          {row.category ? (
                            <Badge variant="danger" className="mb-1">
                              {categoryLabel(row.category)}
                            </Badge>
                          ) : null}
                          <span className="block text-muted-foreground">{row.notes ?? '—'}</span>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
