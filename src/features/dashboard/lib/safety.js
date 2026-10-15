import { firstValue } from '@/lib/api/lists';

/*
 * "Catatan safety" on the dashboard: `safety_reports` of `GET /dashboard/summary?date=&site_id=
 * &vendor_id=` — one row per task report with a safety note (names already resolved).
 */

/**
 * @typedef {object} SafetyNote
 * @property {string} key
 * @property {string | null} category `NEAR_MISS` | `UNSAFE_ACTION` | `UNSAFE_CONDITION` (upper-case).
 * @property {string} notes
 * @property {string | null} site
 * @property {string | null} vendor
 * @property {string | null} worker
 * @property {string | null} area Category › area, e.g. "Boiler Area › Tangga Boiler".
 * @property {string | null} shift `DAY` | `EVENING` | `NIGHT`.
 * @property {string | null} openedAt
 * @property {string | null} closedAt
 */

/** @param {unknown} value */
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * Safety notes of the day, newest first. Rows without a note are left out.
 * @param {unknown} raw `{ data: { safety_reports: [...] } }` (or without `data`).
 * @returns {SafetyNote[]}
 */
export function toSafetyNotes(raw) {
  const body = /** @type {any} */ (raw ?? {});
  const data = body.data && typeof body.data === 'object' ? body.data : body;
  const rows = Array.isArray(data.safety_reports) ? data.safety_reports : [];
  return rows
    .map((r, index) => {
      const area = [text(r?.category_name), text(r?.area_name)].filter(Boolean).join(' › ');
      return {
        key: String(firstValue(r?.id, r?.report_id) ?? index),
        category: text(firstValue(r?.note_category, r?.category_note))?.toUpperCase() ?? null,
        notes: text(r?.notes) ?? '',
        site: text(r?.site_name),
        vendor: text(r?.vendor_name),
        worker: text(r?.worker_name),
        area: area || null,
        shift: text(r?.shift)?.toUpperCase() ?? null,
        openedAt: text(r?.open_date),
        closedAt: text(firstValue(r?.closed_date, r?.close_date)),
      };
    })
    .filter((n) => n.notes || n.category)
    .sort((a, b) => Date.parse(b.openedAt ?? '') - Date.parse(a.openedAt ?? '') || 0);
}

/**
 * Notes per category, for the filter chips.
 * @param {SafetyNote[]} notes
 * @returns {Record<string, number>}
 */
export function countByCategory(notes) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const n of notes) if (n.category) counts[n.category] = (counts[n.category] ?? 0) + 1;
  return counts;
}
