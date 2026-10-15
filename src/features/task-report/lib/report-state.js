import { REPORT_STATUS, REVISION_STATUS } from '@/lib/task-reports';

/** @typedef {{ status: string, revision_status: string, before_url?: string | null, after_url?: string | null, reason?: string | null }} WorkerReport */

/** The two evidence photos, in the order they must be taken. */
export const EVIDENCE_TYPES = /** @type {const} */ (['before', 'after']);

export const EVIDENCE_LABELS = Object.freeze({ before: 'Sebelum', after: 'Sesudah' });

/** Report field holding the uploaded photo of each type. */
export const EVIDENCE_FIELD = Object.freeze({ before: 'before_url', after: 'after_url' });

/**
 * A revision is asked of the worker: rejected, or a revision requested on a submitted report.
 * @param {WorkerReport} report
 */
export const needsRevision = (report) =>
  report.status === REPORT_STATUS.REJECTED || report.revision_status === REVISION_STATUS.REQUESTED;

/**
 * The worker may still change the report: not approved, and not waiting for review
 * (a submitted report becomes editable again when a revision is requested).
 * @param {WorkerReport} report
 */
export function isReportEditable(report) {
  if (report.status === REPORT_STATUS.COMPLETED) return false;
  if (report.status === REPORT_STATUS.SUBMITTED) return needsRevision(report);
  return true;
}

/**
 * Why "Kirim laporan" cannot be pressed yet, or `null` when it can. Both photos must be stored
 * on the server — a photo still uploading or waiting offline does not count. Unsaved notes do
 * not block: sending saves them first.
 * @param {WorkerReport} report
 * @param {{ online?: boolean, busy?: boolean, waiting?: Partial<Record<'before' | 'after', boolean>> }} [local]
 *   `busy`: an upload, save or send is running; `waiting`: photo of that type is queued offline.
 * @returns {string | null}
 */
export function getSubmitBlocker(report, { online = true, busy = false, waiting = {} } = {}) {
  if (!isReportEditable(report)) return 'Laporan ini tidak bisa dikirim.';
  if (busy) return 'Tunggu proses yang sedang berjalan selesai.';
  for (const type of EVIDENCE_TYPES) {
    const label = EVIDENCE_LABELS[type].toLowerCase();
    // A queued photo replaces the one on the server: wait for it, even if there is one.
    if (waiting[type]) return `Foto ${label} masih menunggu sinyal.`;
    if (!report[EVIDENCE_FIELD[type]]) return `Lengkapi foto ${label} untuk mengirim laporan.`;
  }
  if (!online) return 'Butuh sinyal untuk mengirim laporan.';
  return null;
}
