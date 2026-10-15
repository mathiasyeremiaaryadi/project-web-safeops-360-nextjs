import { firstValue } from '@/lib/api/lists';
import { addDays } from '@/lib/date';

/*
 * `GET /dashboard/summary?date=&site_id=&vendor_id=` → `data.vendor_progress[]`: one row per
 * vendor with its task counts and `vendor_progress_detail` (areas, points, workers,
 * assignments). Only part of the shape is known (screenshot), so fields are read from their
 * likely names — docs/ASSUMPTIONS.md VP1–VP3.
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

/**
 * @typedef {object} AreaProgress
 * @property {string} key
 * @property {string} name
 * @property {number} points
 * @property {number} total
 * @property {number} completed
 * @property {number} inProgress
 * @property {number} notStarted
 * @property {number} percent
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

/** @param {any} raw @param {number} index @returns {AreaProgress} */
function toArea(raw, index) {
  const total = toCount(firstValue(raw.total_task, raw.total_tasks, raw.total, raw.task_count));
  const completed = toCount(firstValue(raw.completed, raw.completed_count, raw.done));
  const name = firstValue(raw.area_name, raw.name, raw.area, raw.pipeline_name, raw.title);
  return {
    key: String(firstValue(raw.area_id, raw.id, raw.pipeline_id, name, index)),
    name: name ? String(name) : `Area ${index + 1}`,
    points: toCount(firstValue(raw.total_point, raw.total_points, raw.point, raw.points)),
    total,
    completed,
    inProgress: toCount(firstValue(raw.in_progress, raw.in_progress_count)),
    notStarted: toCount(firstValue(raw.not_started, raw.not_started_count, raw.pending)),
    percent: toCount(
      firstValue(raw.progress_percentage, raw.percentage, raw.percent) ??
        percentOf(completed, total),
    ),
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
 * Vendor rows of one `/dashboard/summary` response (`{ data: { vendor_progress } }` or bare).
 * @param {unknown} raw
 * @returns {VendorProgress[]}
 */
export function toVendorProgress(raw) {
  const body = /** @type {any} */ (isRecord(raw) ? raw : {});
  const data = isRecord(body.data) ? body.data : body;
  const rows = Array.isArray(data.vendor_progress) ? data.vendor_progress : [];
  return rows
    .filter(isRecord)
    .map(toVendor)
    .filter((row) => row.vendorId);
}

/**
 * Sums several days per vendor (and per area): task counts add up, the percentage is computed
 * again. Areas, points, workers and assignments describe the set-up, not the day: the largest
 * value is kept.
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
      byVendor.set(key, {
        ...row,
        totals: { ...row.totals },
        areas: row.areas.map((a) => ({ ...a })),
      });
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
        current.areas.push({ ...area });
        continue;
      }
      same.total += area.total;
      same.completed += area.completed;
      same.inProgress += area.inProgress;
      same.notStarted += area.notStarted;
      same.points = Math.max(same.points, area.points);
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
