import { firstValue } from '@/lib/api/lists';
import { addDays } from '@/lib/date';

/*
 * `GET /dashboard/summary` (list) and `GET /dashboard/summary/detail?type=vendor_progress`
 * (detail) → `vendor_progress[]`: one row per vendor with its task counts and
 * `vendor_progress_detail` (areas → points → reports per shift). Fields are read from their
 * known (Postman example) and likely names — docs/ASSUMPTIONS.md VP1–VP3.
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** @param {unknown} value */
const toCount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

/** @param {number} completed @param {number} total */
const percentOf = (completed, total) => (total > 0 ? Math.round((completed / total) * 100) : 0);

/** Report statuses counted per area. */
const STATUS = Object.freeze({ COMPLETED: 'COMPLETED', IN_PROGRESS: 'IN_PROGRESS' });

/** A safety note category, or `null` for "-" / empty. @param {unknown} value */
const toCategory = (value) => {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  return text && text !== '-' ? text : null;
};

/**
 * @typedef {object} PointTask
 * @property {string} key
 * @property {string} shift Shift code (the key of the report group, e.g. `DAY`).
 * @property {string} status
 * @property {string | null} openDate
 * @property {string | null} closeDate
 * @property {string | null} workerName
 * @property {string | null} notes
 * @property {string | null} category Safety note category (`NEAR_MISS`, …) or `null`.
 */

/**
 * @typedef {object} PointProgress
 * @property {string} key
 * @property {string} name
 * @property {number} workers
 * @property {number} assignments
 * @property {PointTask[]} tasks Reports of the point, per shift.
 * @property {{ key: string, workerName: string | null }[]} pending Assignments without a report.
 */

/**
 * @typedef {object} AreaProgress
 * @property {string} key
 * @property {string} name
 * @property {number} points
 * @property {number} workers
 * @property {number} total
 * @property {number} completed
 * @property {number} inProgress
 * @property {number} notStarted
 * @property {number} percent
 * @property {string[]} shifts
 * @property {PointProgress[]} pointList
 */

/**
 * @typedef {object} VendorProgress
 * @property {string} vendorId
 * @property {string | null} vendorName
 * @property {string | null} siteId
 * @property {string | null} siteName
 * @property {number} total
 * @property {number} completed
 * @property {number} inProgress
 * @property {number} notStarted
 * @property {number} percent
 * @property {{ areas: number, points: number, workers: number, assignments: number }} totals
 * @property {AreaProgress[]} areas
 */

/** @param {string} shift @param {any} t @param {number} index @returns {PointTask} */
const toTask = (shift, t, index) => ({
  key: `${firstValue(t.assignment_id, t.id) ?? index}|${shift}|${t.open_date ?? ''}`,
  shift,
  status: String(t.status ?? '').toUpperCase(),
  openDate: firstValue(t.open_date, t.opened_at) ?? null,
  closeDate: firstValue(t.close_date, t.closed_date, t.closed_at) ?? null,
  workerName: firstValue(t.worker_name, t.worker?.full_name) ?? null,
  notes: firstValue(t.notes, t.note) ?? null,
  category: toCategory(firstValue(t.category_note, t.note_category)),
});

/**
 * Reports of a point: every key whose value has a `task_detail` list is a shift (`DAY`, …).
 * @param {any} raw
 * @returns {PointTask[]}
 */
function toTasks(raw) {
  return Object.entries(raw).flatMap(([shift, value]) => {
    const list = isRecord(value) ? /** @type {any} */ (value).task_detail : null;
    return Array.isArray(list)
      ? list.filter(isRecord).map((t, index) => toTask(shift, t, index))
      : [];
  });
}

/** @param {any} raw @param {number} index @returns {PointProgress} */
function toPoint(raw, index) {
  const name = firstValue(raw.nama_point, raw.point_name, raw.name);
  const pending = Array.isArray(raw.pending_detail) ? raw.pending_detail.filter(isRecord) : [];
  return {
    key: String(firstValue(raw.pipeline_item_id, raw.point_id, raw.id) ?? `point-${index}`),
    name: name ? String(name) : `Titik ${index + 1}`,
    workers: toCount(raw.total_worker),
    assignments: toCount(raw.total_assignment),
    tasks: toTasks(raw),
    pending: pending.map((/** @type {any} */ p, i) => ({
      key: String(firstValue(p.assignment_id, p.id) ?? `pending-${i}`),
      workerName: firstValue(p.worker_name) ?? null,
    })),
  };
}

/**
 * Counts of an area from its points (when the area has no counts itself): reports by status,
 * and pending assignments as not started. Display counts only.
 * @param {PointProgress[]} points
 */
function countPoints(points) {
  const tasks = points.flatMap((point) => point.tasks);
  const pending = points.reduce((sum, point) => sum + point.pending.length, 0);
  return {
    completed: tasks.filter((t) => t.status === STATUS.COMPLETED).length,
    inProgress: tasks.filter((t) => t.status === STATUS.IN_PROGRESS).length,
    notStarted: pending,
    total: tasks.length + pending,
  };
}

/** @param {any} raw @param {number} index @returns {AreaProgress} */
function toArea(raw, index) {
  const pointList = (Array.isArray(raw.point_detail) ? raw.point_detail : [])
    .filter(isRecord)
    .map(toPoint);
  const counted = countPoints(pointList);
  const total = toCount(firstValue(raw.total_task, raw.total_tasks, raw.total) ?? counted.total);
  const completed = toCount(firstValue(raw.completed, raw.completed_count) ?? counted.completed);
  const name = firstValue(raw.nama_area, raw.area_name, raw.name, raw.area, raw.pipeline_name);
  return {
    key: String(firstValue(raw.area_id, raw.id, raw.pipeline_id, name, index)),
    name: name ? String(name) : `Area ${index + 1}`,
    points: toCount(
      firstValue(raw.total_point_per_area, raw.total_point, raw.total_points) ?? pointList.length,
    ),
    workers: toCount(firstValue(raw.total_worker_per_area, raw.total_worker)),
    total,
    completed,
    inProgress: toCount(firstValue(raw.in_progress, raw.in_progress_count) ?? counted.inProgress),
    notStarted: toCount(firstValue(raw.not_started, raw.pending) ?? counted.notStarted),
    percent: toCount(
      firstValue(raw.progress_percentage, raw.percentage, raw.percent) ??
        percentOf(completed, total),
    ),
    shifts: [...new Set(pointList.flatMap((point) => point.tasks.map((t) => t.shift)))],
    pointList,
  };
}

/** @param {any} raw @returns {VendorProgress} */
function toVendor(raw) {
  const detail = isRecord(raw.vendor_progress_detail) ? raw.vendor_progress_detail : {};
  const areas = Array.isArray(detail.area_detail) ? detail.area_detail : [];
  const total = toCount(firstValue(raw.total_task, raw.total_tasks, raw.total));
  const completed = toCount(raw.completed);
  return {
    vendorId: String(firstValue(raw.vendor_id, raw.vendor?.id, raw.id) ?? ''),
    vendorName: firstValue(raw.vendor_name, raw.vendor?.name, raw.name) ?? null,
    siteId: firstValue(raw.site_id, raw.site?.id) ?? null,
    siteName: firstValue(raw.site_name, raw.site?.name) ?? null,
    total,
    completed,
    inProgress: toCount(raw.in_progress),
    notStarted: toCount(firstValue(raw.not_started, raw.pending)),
    percent: toCount(
      firstValue(raw.progress_percentage, raw.percent) ?? percentOf(completed, total),
    ),
    totals: {
      areas: toCount(firstValue(detail.total_area, detail.total_areas) ?? areas.length),
      points: toCount(firstValue(detail.total_point, detail.total_points)),
      workers: toCount(firstValue(detail.total_worker, detail.total_workers)),
      assignments: toCount(firstValue(detail.total_assignment, detail.total_assignments)),
    },
    areas: areas.filter(isRecord).map(toArea),
  };
}

/**
 * Vendor rows of one response: `{ data: { vendor_progress } }`, the detail's
 * `{ data: { type, data: { vendor_progress } } }`, or bare.
 * @param {unknown} raw
 * @returns {VendorProgress[]}
 */
export function toVendorProgress(raw) {
  let data = /** @type {any} */ (isRecord(raw) ? raw : {});
  while (!Array.isArray(data.vendor_progress) && isRecord(data.data)) data = data.data;
  const rows = Array.isArray(data.vendor_progress) ? data.vendor_progress : [];
  return rows
    .filter(isRecord)
    .map(toVendor)
    .filter((row) => row.vendorId);
}

/**
 * The same area's points over several days: their reports and pending lists are joined.
 * @param {PointProgress[]} into
 * @param {PointProgress[]} points
 */
function mergePoints(into, points) {
  for (const point of points) {
    const same = into.find((p) => p.key === point.key);
    if (!same) {
      into.push({ ...point, tasks: [...point.tasks], pending: [...point.pending] });
      continue;
    }
    same.tasks.push(...point.tasks.filter((t) => !same.tasks.some((s) => s.key === t.key)));
    same.pending.push(...point.pending.filter((p) => !same.pending.some((s) => s.key === p.key)));
  }
}

/** @param {AreaProgress} area @returns {AreaProgress} */
const copyArea = (area) => ({
  ...area,
  shifts: [...area.shifts],
  pointList: area.pointList.map((p) => ({ ...p, tasks: [...p.tasks], pending: [...p.pending] })),
});

/**
 * Sums several days per vendor (and per area): task counts add up, the percentage is computed
 * again. Areas, points, workers and assignments describe the set-up, not the day: the largest
 * value is kept. The points' reports of every day are kept.
 * @param {VendorProgress[][]} days
 * @returns {VendorProgress[]}
 */
export function mergeVendorProgress(days) {
  if (days.length === 1) return days[0];
  /** @type {Map<string, VendorProgress>} */
  const byVendor = new Map();
  for (const row of days.flat()) {
    const key = `${row.vendorId}|${row.siteId ?? ''}`;
    const current = byVendor.get(key);
    if (!current) {
      byVendor.set(key, { ...row, totals: { ...row.totals }, areas: row.areas.map(copyArea) });
      continue;
    }
    current.total += row.total;
    current.completed += row.completed;
    current.inProgress += row.inProgress;
    current.notStarted += row.notStarted;
    for (const field of /** @type {const} */ (['areas', 'points', 'workers', 'assignments'])) {
      current.totals[field] = Math.max(current.totals[field], row.totals[field]);
    }
    for (const area of row.areas) {
      const same = current.areas.find((a) => a.key === area.key);
      if (!same) {
        current.areas.push(copyArea(area));
        continue;
      }
      same.total += area.total;
      same.completed += area.completed;
      same.inProgress += area.inProgress;
      same.notStarted += area.notStarted;
      same.points = Math.max(same.points, area.points);
      same.workers = Math.max(same.workers, area.workers);
      same.shifts = [...new Set([...same.shifts, ...area.shifts])];
      mergePoints(same.pointList, area.pointList);
    }
  }
  return [...byVendor.values()].map((row) => ({
    ...row,
    percent: percentOf(row.completed, row.total),
    areas: row.areas.map((area) => ({ ...area, percent: percentOf(area.completed, area.total) })),
  }));
}

export const MAX_RANGE_DAYS = 31;

/**
 * Period from the URL: today by default, at most 31 days.
 * @param {string} fromParam `YYYY-MM-DD` or `''`.
 * @param {string} toParam `YYYY-MM-DD` or `''`.
 * @param {string} today `YYYY-MM-DD` in APP_TIMEZONE.
 * @returns {{ from: string, to: string, dates: string[], error: string | null }}
 */
export function resolveProgressRange(fromParam, toParam, today) {
  const to = toParam || (fromParam && fromParam > today ? fromParam : today);
  const from = fromParam || to;
  if (from > to)
    return { from, to, dates: [], error: 'Tanggal mulai harus sebelum tanggal akhir.' };
  if (addDays(from, MAX_RANGE_DAYS - 1) < to) {
    return { from, to, dates: [], error: `Rentang maksimal ${MAX_RANGE_DAYS} hari.` };
  }
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return { from, to, dates, error: null };
}
