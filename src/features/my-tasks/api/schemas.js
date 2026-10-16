import { z } from 'zod';
import { enumTextSchema, firstValue, listResponseSchema } from '@/lib/api/lists';

/*
 * `GET /me/tasks?date=` (BRD 8.4: "own active assignment list and report state for the date").
 * The JSON names are not documented, so each field is read from its likely names —
 * docs/ASSUMPTIONS.md W1. One row = one assigned task (pipeline item) in one shift.
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** @param {any} r */
function normaliseTask(r) {
  const item = r.pipeline_item ?? r.item ?? {};
  const pipeline = item.pipeline ?? r.pipeline ?? {};
  const report = isRecord(r.report) ? r.report : {};
  const shift = isRecord(r.shift) ? r.shift : { name: r.shift ?? r.shift_name };
  return {
    pipeline_item_id: firstValue(r.pipeline_item_id, item.id),
    task_name: firstValue(r.item_name, r.task_name, item.item?.name, item.name, r.name),
    sort_order: firstValue(r.sort_order, item.sort_order),
    pipeline_id: firstValue(r.pipeline_id, pipeline.id),
    pipeline_name: firstValue(r.pipeline_name, pipeline.name),
    vendor_name: firstValue(r.vendor_name, pipeline.vendor?.name, r.vendor?.name),
    site_name: firstValue(r.site_name, r.site?.name),
    site_timezone: firstValue(r.site_timezone, r.site?.timezone),
    report_date: firstValue(r.report_date, r.date),
    shift: firstValue(shift.name, shift.code, shift.id),
    shift_start: firstValue(shift.start_time, shift.start, r.shift_start),
    shift_end: firstValue(shift.end_time, shift.end, r.shift_end),
    report_id: firstValue(report.id, r.report_id, r.pipeline_report_id),
    status: firstValue(report.status, r.report_status, r.status),
    revision_status: firstValue(report.revision_status, r.revision_status),
    revision_reason: firstValue(report.reason, report.review_reason, r.revision_reason, r.reason),
  };
}

const optionalText = z.coerce.string().nullish().catch(null);

export const myTaskSchema = z.preprocess(
  (raw) => (isRecord(raw) ? normaliseTask(raw) : raw),
  z.object({
    pipeline_item_id: z.coerce.string(),
    task_name: optionalText,
    sort_order: z.coerce.number().nullish().catch(null),
    pipeline_id: optionalText,
    pipeline_name: optionalText,
    vendor_name: optionalText,
    site_name: optionalText,
    /** IANA zone of the site: shift hours and `report_date` are on its clock. */
    site_timezone: optionalText,
    /** The day of the task list (today at the site when no date was asked). */
    report_date: optionalText,
    shift: optionalText,
    shift_start: optionalText,
    shift_end: optionalText,
    report_id: optionalText,
    /** `PENDING` when the task has no report yet for the date. */
    status: enumTextSchema('PENDING'),
    revision_status: enumTextSchema('NONE'),
    revision_reason: optionalText,
  }),
);

/** @typedef {z.infer<typeof myTaskSchema>} MyTask */

export const myTaskListSchema = listResponseSchema(myTaskSchema);

/** Id of a created report: `{ id }`, `{ data: { id } }` or `{ report | pipeline_report: { id } }`. */
export const createdReportSchema = z.preprocess((raw) => {
  const body = /** @type {any} */ (raw) ?? {};
  return firstValue(body.id, body.data?.id, body.report?.id, body.pipeline_report?.id);
}, z.coerce.string());
