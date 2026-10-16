import { z } from 'zod';
import {
  entityResponseSchema,
  enumTextSchema,
  firstValue,
  listResponseSchema,
} from '@/lib/api/lists';

/*
 * `/pipeline-reports` (BRD 8.5). The BRD lists the stored data (task/user/shift/date, status and
 * revision, optional detail with evidence keys, open/close times, note category and text) but
 * not the JSON names, so each field is read from its likely names — docs/ASSUMPTIONS.md R2.
 */

/** Detail fields may be nested (`detail` / `details` / `report_detail`) or at the top level. */
function flatten(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const row = /** @type {any} */ (raw);
  const detail = row.detail ?? row.details ?? row.report_detail ?? {};
  return { ...detail, ...row, detail: undefined, details: undefined, report_detail: undefined };
}

/** @param {any} r */
const normalise = (r) => ({
  id: r.id,
  user_id: firstValue(r.user_id, r.user?.id),
  vendor_id: firstValue(r.vendor_id, r.pipeline?.vendor_id),
  status: r.status,
  revision_status: firstValue(r.revision_status, r.revision),
  revision_count: r.revision_count,
  task_name: firstValue(r.item_name, r.task_name, r.pipeline_item?.item?.name, r.item?.name),
  pipeline_name: firstValue(r.pipeline_name, r.pipeline?.name, r.pipeline_item?.pipeline?.name),
  worker_name: firstValue(r.user_full_name, r.worker_name, r.user?.full_name, r.user?.username),
  site_name: firstValue(r.site_name, r.site?.name),
  site_timezone: firstValue(r.site_timezone, r.site?.timezone),
  shift: firstValue(r.shift, r.shift_name),
  report_date: r.report_date,
  submitted_at: firstValue(r.submitted_at, r.updated_at, r.created_at),
  before_url: firstValue(r.evidence_before_url, r.before_url, r.evidence_before, r.photo_before),
  after_url: firstValue(r.evidence_after_url, r.after_url, r.evidence_after, r.photo_after),
  opened_at: firstValue(r.opened_at, r.open_date, r.open_at, r.open_time, r.started_at),
  closed_at: firstValue(r.closed_at, r.closed_date, r.close_at, r.close_time, r.finished_at),
  note_category: firstValue(r.note_category, r.category),
  note: firstValue(r.note, r.notes, r.note_text),
  reason: firstValue(r.reason, r.review_reason, r.revision_reason),
  history: firstValue(r.history, r.status_history),
});

const optionalText = z.coerce.string().nullish().catch(null);

/** One status change, if the API returns the history (BRD: no read endpoint yet). */
const historyEntrySchema = z.preprocess(
  (raw) => {
    const e = /** @type {any} */ (raw ?? {});
    return {
      status: firstValue(e.new_status, e.status, e.to_status),
      revision_status: firstValue(e.new_revision_status, e.revision_status),
      reason: e.reason,
      at: firstValue(e.created_at, e.changed_at, e.at),
    };
  },
  z.object({
    status: optionalText,
    revision_status: optionalText,
    reason: optionalText,
    at: optionalText,
  }),
);

export const taskReportSchema = z.preprocess(
  (raw) => (raw && typeof raw === 'object' ? normalise(flatten(raw)) : raw),
  z.object({
    id: z.coerce.string(),
    user_id: optionalText,
    vendor_id: optionalText,
    status: enumTextSchema(),
    revision_status: enumTextSchema('NONE'),
    /** How many revisions the Worker submitted (0 = original report). */
    revision_count: z.coerce.number().int().nonnegative().catch(0),
    task_name: optionalText,
    pipeline_name: optionalText,
    worker_name: optionalText,
    site_name: optionalText,
    /** IANA zone of the site: shift hours, report date and work times are read in it. */
    site_timezone: optionalText,
    shift: optionalText,
    report_date: optionalText,
    submitted_at: optionalText,
    before_url: optionalText,
    after_url: optionalText,
    opened_at: optionalText,
    closed_at: optionalText,
    note_category: enumTextSchema(),
    note: optionalText,
    reason: optionalText,
    history: z.array(historyEntrySchema).nullish().catch(null),
  }),
);

/** @typedef {z.infer<typeof taskReportSchema>} TaskReport */

export const taskReportListSchema = listResponseSchema(taskReportSchema);

/**
 * `GET /pipeline-reports/{id}/revisions` row: an earlier version of the report, replaced by a
 * Worker's revision (`revision_no` 0 = the original report).
 */
export const reportRevisionSchema = z.preprocess(
  (raw) => {
    const r = /** @type {any} */ (raw ?? {});
    return {
      id: r.id,
      revision_no: r.revision_no,
      before_url: firstValue(r.evidence_before_url, r.evidence_before),
      after_url: firstValue(r.evidence_after_url, r.evidence_after),
      opened_at: r.open_date,
      closed_at: r.closed_date,
      note_category: r.note_category,
      note: r.notes,
      revised_by: firstValue(r.revised_by_name, r.revised_by),
      reason: r.reason,
      replaced_at: r.created_at,
    };
  },
  z.object({
    id: z.coerce.string(),
    revision_no: z.coerce.number().int().nonnegative().catch(0),
    before_url: optionalText,
    after_url: optionalText,
    opened_at: optionalText,
    closed_at: optionalText,
    note_category: optionalText,
    note: optionalText,
    revised_by: optionalText,
    reason: optionalText,
    /** When this version was replaced by the next revision. */
    replaced_at: optionalText,
  }),
);

/** @typedef {z.infer<typeof reportRevisionSchema>} ReportRevision */

export const reportRevisionListSchema = z.object({
  data: z.array(reportRevisionSchema).catch([]),
});

export const taskReportDetailSchema = entityResponseSchema(taskReportSchema, [
  'pipeline_report',
  'report',
]);

/** `GET /pipeline-reports/{id}/history` (PRD 1.2 — not in the BRD yet): a list of status changes. */
export const taskReportHistorySchema = listResponseSchema(historyEntrySchema);
