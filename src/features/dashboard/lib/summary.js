import { firstValue } from '@/lib/api/lists';

/*
 * Pure mapping of `/dashboard/report` and `/reports/daily`. The BRD only says "status counts"
 * and "counts grouped by vendor and pipeline", so the shapes below are read tolerantly —
 * docs/ASSUMPTIONS.md DB1–DB3.
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** @param {unknown} value @returns {number | null} */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** `{ data: {...} }` → `{...}` @param {unknown} raw */
const unwrap = (raw) => {
  const body = /** @type {any} */ (isRecord(raw) ? raw : {});
  return isRecord(body.data) ? body.data : body;
};

/**
 * Status counts from `{ SUBMITTED: 3 }` or `[{ status: 'SUBMITTED', count: 3 }]`; keys upper-case.
 * @param {unknown} value
 * @returns {Record<string, number>}
 */
export function toStatusCounts(value) {
  /** @type {[string, unknown][]} */
  let entries = [];
  if (Array.isArray(value)) {
    entries = value.map((e) => [
      String(firstValue(e?.status, e?.name, e?.key) ?? ''),
      firstValue(e?.count, e?.total, e?.value),
    ]);
  } else if (isRecord(value)) {
    entries = Object.entries(/** @type {Record<string, unknown>} */ (value));
  }
  /** @type {Record<string, number>} */
  const counts = {};
  for (const [key, raw] of entries) {
    const number = toNumber(raw);
    if (key && number !== null) counts[key.trim().toUpperCase()] = number;
  }
  return counts;
}

/**
 * @typedef {object} DashboardKpis
 * @property {number} total Task reports of the day (all statuses).
 * @property {number} inProgress `IN_PROGRESS`.
 * @property {number} completed `COMPLETED`.
 */

/**
 * KPI cards from `/dashboard/report`: total, in progress, completed.
 * @param {unknown} raw
 * @returns {DashboardKpis}
 */
export function toDashboardKpis(raw) {
  const body = /** @type {any} */ (unwrap(raw));
  const tasks = toStatusCounts(
    firstValue(body.pipeline_reports, body.pipeline_report, body.pipeline, body.task_reports),
  );
  const { TOTAL, ...byStatus } = tasks;
  const sum = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return {
    total: toNumber(firstValue(TOTAL, body.total_tasks, body.total)) ?? sum,
    inProgress: tasks.IN_PROGRESS ?? 0,
    completed: tasks.COMPLETED ?? 0,
  };
}

/**
 * @typedef {object} VendorProgress
 * @property {string} key Vendor id (or name when there is no id).
 * @property {string | null} vendorId
 * @property {string | null} vendorName
 * @property {number} tasks
 * @property {number} completed
 * @property {number} submitted
 * @property {number} revision
 * @property {number} notStarted
 * @property {number} percent Completed / tasks, 0–100, rounded.
 */

/** Counts of one daily row (a vendor, or a pipeline of a vendor). @param {any} r */
function rowCounts(r) {
  if (Array.isArray(r.pipelines) && r.pipelines.length > 0) {
    return r.pipelines.map(rowCounts).reduce(addCounts);
  }
  const tasks = toNumber(firstValue(r.total_tasks, r.task_count, r.tasks, r.total)) ?? 0;
  const completed = toNumber(firstValue(r.completed, r.completed_count, r.done)) ?? 0;
  const submitted = toNumber(firstValue(r.submitted, r.waiting_review, r.pending_review)) ?? 0;
  const revision =
    toNumber(firstValue(r.revision_requested, r.revision, r.revisions, r.revision_count)) ?? 0;
  const notStarted =
    toNumber(firstValue(r.not_started, r.pending, r.pending_count)) ??
    Math.max(0, tasks - completed - submitted - revision);
  return { tasks, completed, submitted, revision, notStarted };
}

/** @param {ReturnType<typeof rowCounts>} a @param {ReturnType<typeof rowCounts>} b */
function addCounts(a, b) {
  return {
    tasks: a.tasks + b.tasks,
    completed: a.completed + b.completed,
    submitted: a.submitted + b.submitted,
    revision: a.revision + b.revision,
    notStarted: a.notStarted + b.notStarted,
  };
}

/**
 * "Progres per vendor" from `/reports/daily`: rows (per vendor or per vendor+pipeline) are
 * summed per vendor; sorted by percentage, highest first.
 * @param {unknown} raw
 * @returns {VendorProgress[]}
 */
export function toVendorProgress(raw) {
  const body = /** @type {any} */ (raw);
  const rows = Array.isArray(body)
    ? body
    : (firstValue(
        ...[body?.data, body?.vendors, body?.rows, body?.items, body?.data?.vendors].filter(
          Array.isArray,
        ),
      ) ?? []);

  /** @type {Map<string, VendorProgress>} */
  const byVendor = new Map();
  for (const r of /** @type {any[]} */ (rows)) {
    if (!isRecord(r)) continue;
    const vendorId = firstValue(r.vendor_id, r.vendor?.id);
    const vendorName = firstValue(r.vendor_name, r.vendor?.name);
    const key = String(vendorId ?? vendorName ?? '');
    if (!key) continue;
    const counts = rowCounts(r);
    const previous = byVendor.get(key);
    byVendor.set(key, {
      key,
      vendorId: vendorId === undefined ? null : String(vendorId),
      vendorName: vendorName ?? previous?.vendorName ?? null,
      ...(previous ? addCounts(previous, counts) : counts),
      percent: 0,
    });
  }

  return [...byVendor.values()]
    .map((v) => ({ ...v, percent: v.tasks > 0 ? Math.round((v.completed / v.tasks) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent);
}
