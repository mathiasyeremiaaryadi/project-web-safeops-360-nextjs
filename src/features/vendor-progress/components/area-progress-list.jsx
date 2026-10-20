'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { FilterBar } from '@/components/shared/filter-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { formatTime } from '@/lib/date';
import { NOTE_CATEGORY_LABELS, REPORT_STATUS, REPORT_STATUS_BADGES } from '@/lib/task-reports';
import { ChevronDown, MapPinned, ShieldAlert } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

/** @typedef {import('@/features/vendor-progress/lib/progress').AreaProgress} AreaProgress */
/** @typedef {import('@/features/vendor-progress/lib/progress').PointProgress} PointProgress */
/** @typedef {import('@/features/vendor-progress/lib/progress').PointTask} PointTask */
/** @typedef {import('@/features/vendor-progress/lib/progress').CheckPointDetail} CheckPointDetail */

const SHIFT_LABELS = Object.freeze({
  DAY: 'Pagi',
  EVENING: 'Sore',
  NIGHT: 'Malam',
});

const SHIFT_ORDER = Object.freeze(['DAY', 'EVENING', 'NIGHT']);

export const shiftLabel = (shift) => SHIFT_LABELS[shift] ?? shift;

const categoryLabel = (category) => NOTE_CATEGORY_LABELS[category ?? ''] ?? category;

const shiftRank = (shift) => {
  const index = SHIFT_ORDER.indexOf(shift);
  return index === -1 ? SHIFT_ORDER.length : index;
};

/**
 * Menghitung persentase progres berdasarkan completed / total task.
 *
 * @param {{ completed?: number, total?: number }} row
 * @returns {number}
 */
const getProgressPercent = (row) => {
  const totalTask = Number(row?.total) || 0;
  const completed = Number(row?.completed) || 0;

  if (totalTask <= 0) {
    return 0;
  }

  const percent = (completed / totalTask) * 100;

  return Math.round(Math.min(100, Math.max(0, percent)) * 100) / 100;
};

/**
 * Jumlah assignment yang diketahui untuk satu point.
 *
 * @param {PointProgress} point
 */
const targetCountOf = (point) => {
  const value = Number(point.assignments);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

/**
 * Mengelompokkan laporan berdasarkan shift.
 *
 * @param {PointProgress} point
 * @returns {{ shift: string, tasks: PointTask[] }[]}
 */
const tasksByShift = (point) => {
  /** @type {Map<string, PointTask[]>} */
  const groups = new Map();

  for (const task of point.tasks) {
    groups.set(task.shift, [...(groups.get(task.shift) ?? []), task]);
  }

  return [...groups.entries()]
    .sort(
      ([shiftA], [shiftB]) => shiftRank(shiftA) - shiftRank(shiftB) || shiftA.localeCompare(shiftB),
    )
    .map(([shift, tasks]) => ({ shift, tasks }));
};

/** @param {PointTask} task */
const timeOf = (task) =>
  `${formatTime(task.openDate)} – ${task.closeDate ? formatTime(task.closeDate) : '…'}`;

/**
 * Satu baris detail laporan.
 *
 * @param {{
 *  worker: string,
 *  status: string,
 *  time: string,
 *  notes: string | null,
 *  category: string | null
 * }} props
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
              {['Pekerja', 'Status', 'Waktu', 'Catatan'].map((label) => (
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
 * Satu point beserta detail laporan berdasarkan shift.
 *
 * @param {{ point: PointProgress }} props
 */
function PointRow({ point }) {
  const [open, setOpen] = useState(false);

  const groups = tasksByShift(point);

  const shifts = [...new Set([...SHIFT_ORDER, ...groups.map((group) => group.shift)])];

  const [shift, setShift] = useState(groups[0]?.shift ?? SHIFT_ORDER[0]);

  const done = point.tasks.filter((task) => task.status === REPORT_STATUS.COMPLETED).length;

  const working = point.tasks.filter((task) => task.status === REPORT_STATUS.IN_PROGRESS).length;

  const detailId = `point-${point.key}-detail`;

  return (
    <>
      <tr className="border-b align-top hover:bg-muted/40">
        <th scope="row" className="py-2.5 pr-3 text-left font-medium text-foreground">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />

            {point.name}
          </button>
        </th>

        <td className="py-2.5 pr-3 text-center tabular-nums">
          <Badge variant="neutral">{targetCountOf(point)}</Badge>
        </td>

        <td className="py-2.5">
          <span className="flex flex-wrap gap-1.5">
            {done > 0 ? <Badge variant="success">{done} selesai</Badge> : null}

            {working > 0 ? <Badge variant="info">{working} dikerjakan</Badge> : null}

            {point.pending.length > 0 ? (
              <Badge variant="warning">{point.pending.length} belum dikerjakan</Badge>
            ) : null}

            {!done && !working && !point.pending.length ? '—' : null}
          </span>
        </td>
      </tr>

      {open ? (
        <tr id={detailId} className="border-b bg-muted/30">
          <td colSpan={3} className="px-3 py-4">
            <div className="flex flex-col gap-4">
              <Tabs value={shift} onValueChange={setShift}>
                <TabsList aria-label={`Shift di point ${point.name}`}>
                  {shifts.map((code) => {
                    const count = groups.find((group) => group.shift === code)?.tasks.length ?? 0;

                    return (
                      <TabsTrigger key={code} value={code} className="px-3">
                        {shiftLabel(code)}
                        {count > 0 ? <span className="tabular-nums">({count})</span> : null}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {shifts.map((code) => {
                  const tasks = groups.find((group) => group.shift === code)?.tasks ?? [];

                  return (
                    <TabsContent key={code} value={code}>
                      {tasks.length > 0 ? (
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

              {point.pending.length > 0 ? (
                <DetailTable title="Penugasan belum dikerjakan">
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

/** Temuan safety pada laporan sebuah area. @param {AreaProgress} area */
export const findingsOf = (area) =>
  area.pointList.flatMap((point) => point.tasks).filter((task) => task.category).length;

/**
 * Mengambil semua laporan yang memiliki kategori insiden.
 * Category terisi menandakan laporan tersebut merupakan insiden.
 *
 * @param {AreaProgress[]} areas
 */
const getIncidentReports = (areas) =>
  areas.flatMap((area) =>
    area.pointList.flatMap((point) =>
      point.tasks
        .filter((task) => task.category)
        .map((task) => ({
          key: `${area.key}-${point.key}-${task.key}`,
          areaName: area.name,
          pointName: point.name,
          workerName: task.workerName,
          status: task.status,
          time: timeOf(task),
          category: task.category,
          notes: task.notes,
        })),
    ),
  );

/**
 * Membaca daftar point yang belum di-assign.
 * Nilai total_unassignment / totalUnassignment adalah angka,
 * bukan daftar point, sehingga tidak digunakan sebagai sumber array.
 *
 * @param {CheckPointDetail | Record<string, any> | null | undefined} checkPoint
 */
const getUnassignedPoints = (checkPoint) => {
  if (!checkPoint || typeof checkPoint !== 'object') {
    return [];
  }

  const rawPoints =
    checkPoint.unassignedPointDetail ??
    checkPoint.unassigned_point_detail ??
    checkPoint.unassignedPoints ??
    checkPoint.unassigned_points ??
    [];

  if (!Array.isArray(rawPoints)) {
    return [];
  }

  return rawPoints
    .filter((point) => point && typeof point === 'object')
    .map((point) => ({
      areaId: point.areaId ?? point.area_id ?? point.pipeline_id ?? null,
      itemId: point.itemId ?? point.item_id ?? point.point_id ?? null,
      areaName: point.areaName ?? point.area_name ?? point.nama_area ?? null,
      pointName: point.pointName ?? point.point_name ?? point.nama_point ?? null,
      pipelineItemId:
        point.pipelineItemId ?? point.pipeline_item_id ?? point.pipeline_point_id ?? null,
    }));
};

/**
 * Vendor Progress detail dengan tiga tab:
 * - Task: point yang sudah di-assign.
 * - Insiden: laporan yang memiliki category.
 * - Unassignment: point yang belum di-assign.
 *
 * @param {{
 *   areas?: AreaProgress[],
 *   checkPoint?: CheckPointDetail | null
 * }} props
 */
export function AreaProgressList({ areas = [], checkPoint = null }) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('task-daily');

  const needle = query.trim().toLowerCase();

  const matches = useCallback(
    (value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(needle),
    [needle],
  );

  const unassignedPoints = useMemo(() => getUnassignedPoints(checkPoint), [checkPoint]);

  const incidentReports = useMemo(() => getIncidentReports(areas), [areas]);

  const assignedCount = areas.reduce((sum, area) => sum + area.pointList.length, 0);

  const unassignedCount = unassignedPoints.length;

  const filteredAreas = useMemo(() => {
    return areas
      .map((area) => {
        let points = area.pointList;

        if (needle) {
          points = points.filter(
            (point) =>
              matches(area.name) ||
              matches(point.name) ||
              point.tasks.some(
                (task) =>
                  matches(task.workerName) ||
                  matches(categoryLabel(task.category)) ||
                  matches(task.notes),
              ) ||
              point.pending.some((pending) => matches(pending.workerName)),
          );
        }

        return {
          ...area,
          pointList: points,
        };
      })
      .filter((area) => area.pointList.length > 0);
  }, [areas, needle, matches]);

  const filteredUnassigned = useMemo(() => {
    if (!needle) {
      return unassignedPoints;
    }

    return unassignedPoints.filter((point) => matches(point.areaName) || matches(point.pointName));
  }, [unassignedPoints, needle, matches]);

  const filteredIncidents = useMemo(() => {
    if (!needle) {
      return incidentReports;
    }

    return incidentReports.filter(
      (incident) =>
        matches(incident.areaName) ||
        matches(incident.pointName) ||
        matches(incident.workerName) ||
        matches(categoryLabel(incident.category)) ||
        matches(incident.notes),
    );
  }, [incidentReports, needle, matches]);

  if (areas.length === 0 && unassignedPoints.length === 0) {
    return <EmptyState icon={MapPinned} title="Belum ada detail area" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Cari area, point, pekerja, atau insiden"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList aria-label="Task, insiden, dan unassignment">
          <TabsTrigger value="task-daily">Task ({assignedCount})</TabsTrigger>

          <TabsTrigger value="incidents">Insiden ({incidentReports.length})</TabsTrigger>

          <TabsTrigger value="unassigned">Unassignment ({unassignedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="task-daily">
          {filteredAreas.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title={needle ? 'Tidak ada point yang cocok' : 'Belum ada task daily yang di-assign'}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAreas.map((area) => {
                const findings = findingsOf(area);
                const progressPercent = getProgressPercent(area);

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
                            {area.points} Point · {area.workers} Pekerja
                          </span>
                        </span>

                        <ChevronDown
                          aria-hidden="true"
                          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        />
                      </span>

                      <ProgressBar percent={progressPercent} label={`Progres ${area.name}`} />

                      <span className="flex flex-wrap gap-1.5">
                        {area.shifts.map((shift) => (
                          <Badge key={shift} variant="neutral">
                            Shift {shiftLabel(shift)}
                          </Badge>
                        ))}

                        <Badge variant="neutral">
                          {area.inProgress + area.completed + area.notStarted} task
                        </Badge>

                        <Badge variant="success">{area.completed} selesai</Badge>

                        <Badge variant="warning">{area.notStarted} belum dikerjakan</Badge>

                        <Badge variant="info">{area.inProgress} dikerjakan</Badge>

                        {findings > 0 ? (
                          <Badge variant="danger">
                            <ShieldAlert aria-hidden="true" className="size-3.5" />
                            {findings} insiden
                          </Badge>
                        ) : null}
                      </span>
                    </summary>

                    <div className="overflow-x-auto border-t px-4 pb-4 sm:px-5">
                      <table className="w-full min-w-[560px] text-sm">
                        <caption className="sr-only">Point di area {area.name}</caption>

                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th scope="col" className="py-2.5 pr-3 font-medium">
                              Point
                            </th>

                            <th scope="col" className="py-2.5 pr-3 text-center font-medium">
                              Total task
                            </th>

                            <th scope="col" className="py-2.5 pr-3 font-medium">
                              Status laporan
                            </th>
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
          )}
        </TabsContent>

        <TabsContent value="incidents">
          {filteredIncidents.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title={needle ? 'Tidak ada insiden yang cocok' : 'Tidak ada insiden'}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[850px] text-sm">
                <caption className="sr-only">Daftar laporan insiden</caption>

                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {['Area', 'Point', 'Pekerja', 'Status', 'Waktu', 'Kategori', 'Catatan'].map(
                      (label) => (
                        <th key={label} scope="col" className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.key} className="border-b align-top last:border-0">
                      <td className="px-4 py-3">{incident.areaName}</td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {incident.pointName}
                      </td>

                      <td className="px-4 py-3">{incident.workerName ?? '—'}</td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          status={REPORT_STATUS_BADGES[incident.status]}
                          fallback={incident.status || '—'}
                        />
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">{incident.time}</td>

                      <td className="px-4 py-3">
                        <Badge variant="danger">{categoryLabel(incident.category)}</Badge>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">{incident.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="unassigned">
          {filteredUnassigned.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title={needle ? 'Tidak ada point yang cocok' : 'Tidak ada point yang belum di-assign'}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[520px] text-sm">
                <caption className="sr-only">Daftar point yang belum di-assign</caption>

                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Area
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Point
                    </th>

                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUnassigned.map((point, index) => (
                    <tr
                      key={
                        point.pipelineItemId ??
                        point.itemId ??
                        `${point.areaId ?? 'area'}-${point.pointName ?? index}`
                      }
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3">{point.areaName ?? '—'}</td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {point.pointName ?? '—'}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="warning">Belum di-assign</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
