import { firstValue } from '@/lib/api/lists';

/*
 * `GET /reports/daily?date=&site_id=&vendor_id=` → one row per pipeline (Postman: task_count,
 * report_count, completed_count, in_progress_count, late_upload_count). Rows may also be vendors
 * with nested `pipelines`. Field names are read from their likely variants — ASSUMPTIONS VP4.
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
 * @typedef {object} PipelineProgress
 * @property {string} key
 * @property {string | null} pipelineId
 * @property {string | null} pipelineName
 * @property {string | null} siteId
 * @property {string | null} siteName
 * @property {number} total Tasks of the day.
 * @property {number} reports Tasks with a report.
 * @property {number} completed
 * @property {number} inProgress
 * @property {number} lateUpload
 * @property {number} notStarted Tasks without a report.
 * @property {number} percent
 */

/** @param {any} r @returns {PipelineProgress | null} */
function toPipeline(r) {
  const pipelineId = firstValue(r.pipeline_id, r.pipeline?.id, r.id) ?? null;
  const pipelineName = firstValue(r.pipeline_name, r.pipeline?.name, r.name) ?? null;
  const key = String(pipelineId ?? pipelineName ?? '');
  if (!key) return null;
  const total = toCount(firstValue(r.task_count, r.total_tasks, r.total_task, r.total));
  const completed = toCount(firstValue(r.completed_count, r.completed));
  const inProgress = toCount(firstValue(r.in_progress_count, r.in_progress));
  const reports = toCount(
    firstValue(r.report_count, r.reports) ??
      completed +
        inProgress +
        toCount(firstValue(r.submitted, r.waiting_review)) +
        toCount(firstValue(r.revision_requested, r.revision)),
  );
  return {
    key,
    pipelineId: pipelineId === null ? null : String(pipelineId),
    pipelineName,
    siteId: firstValue(r.site_id, r.site?.id) ?? null,
    siteName: firstValue(r.site_name, r.site?.name) ?? null,
    total,
    reports,
    completed,
    inProgress,
    lateUpload: toCount(firstValue(r.late_upload_count, r.late_upload)),
    notStarted: toCount(firstValue(r.not_started, r.pending) ?? Math.max(0, total - reports)),
    percent: percentOf(completed, total),
  };
}

/**
 * Pipeline rows of one `/reports/daily` response.
 * @param {unknown} raw
 * @returns {PipelineProgress[]}
 */
export function toPipelineProgress(raw) {
  const body = /** @type {any} */ (raw);
  const rows = Array.isArray(body)
    ? body
    : (firstValue(
        ...[body?.data, body?.pipelines, body?.rows, body?.data?.pipelines].filter(Array.isArray),
      ) ?? []);
  return rows
    .flatMap((/** @type {any} */ r) =>
      isRecord(r) && Array.isArray(r.pipelines) && r.pipelines.length > 0 ? r.pipelines : [r],
    )
    .filter(isRecord)
    .map(toPipeline)
    .filter((row) => row !== null);
}

/** Counts added up per pipeline over the days of the period. */
const SUMMED = /** @type {const} */ ([
  'total',
  'reports',
  'completed',
  'inProgress',
  'lateUpload',
  'notStarted',
]);

/**
 * Adds several days (or several rows of one pipeline) up; the percentage is computed again.
 * @param {PipelineProgress[][]} days
 * @returns {PipelineProgress[]}
 */
export function mergePipelineProgress(days) {
  /** @type {Map<string, PipelineProgress>} */
  const byKey = new Map();
  for (const row of days.flat()) {
    const current = byKey.get(row.key);
    if (!current) {
      byKey.set(row.key, { ...row });
      continue;
    }
    for (const field of SUMMED) current[field] += row[field];
    current.pipelineName ??= row.pipelineName;
    current.siteName ??= row.siteName;
  }
  return [...byKey.values()].map((row) => ({
    ...row,
    percent: percentOf(row.completed, row.total),
  }));
}
