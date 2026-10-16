import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { toFormData, UPLOAD_TIMEOUT_MS } from '@/lib/api/form-data';
import { REPORT_STATUS } from '@/lib/task-reports';
import { taskReportHistorySchema } from '@/features/pipeline-reports';

/*
 * Worker calls on one task report, each in ONE function so it is easy to change. The upload
 * follows Postman; endpoints marked ⚠ follow the PRD 1.2 contract and are not in Postman
 * (docs/ASSUMPTIONS.md W3–W5).
 */

const PATH = 'v1/pipeline-reports';

/** Multipart fields per photo type (Postman "Update Pipeline Report (Upload Photo)"). */
const EVIDENCE_FIELDS = Object.freeze({
  before: { file: 'evidence_before', time: 'open_date' },
  after: { file: 'evidence_after', time: 'closed_date' },
});

/**
 * W3 — `PATCH /pipeline-reports/{id}` multipart `evidence_before` | `evidence_after`, with
 * `open_date` | `closed_date` = now (RFC 3339). Postman: the camera's EXIF time wins over it for
 * JPEGs, but the app strips EXIF (location), so the upload time is used.
 * @param {{ reportId: string, type: 'before' | 'after', file: Blob }} input
 */
export function uploadEvidence({ reportId, type, file }) {
  const photo = file instanceof File ? file : new File([file], `${type}.jpg`, { type: file.type });
  const fields = EVIDENCE_FIELDS[type];
  return apiRequest({
    method: 'patch',
    path: `${PATH}/${reportId}`,
    body: toFormData({ [fields.file]: photo, [fields.time]: new Date().toISOString() }),
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

/**
 * `PATCH /pipeline-reports/{id}` `{ notes, note_category }` — `null` category = "Tidak ada".
 * @param {{ reportId: string, notes: string, category: string }} input
 */
export function saveReportNotes({ reportId, notes, category }) {
  return apiRequest({
    method: 'patch',
    path: `${PATH}/${reportId}`,
    json: { notes: notes.trim(), note_category: category || null },
  });
}

/**
 * W4 — "Kirim laporan" (Postman "Update Pipeline Report"): `PATCH /pipeline-reports/{id}`
 * `{ status: "COMPLETED", closed_date }`. COMPLETED needs `evidence_after` and `closed_date`; the
 * close time is the one stored with the "after" photo, else now. The server sets
 * `status_revisi` (e.g. SUBMITTED when sent after the shift).
 * @param {{ reportId: string, closedAt?: string | null }} input
 */
export function submitReport({ reportId, closedAt }) {
  return apiRequest({
    method: 'patch',
    path: `${PATH}/${reportId}`,
    json: { status: REPORT_STATUS.COMPLETED, closed_date: closedAt || new Date().toISOString() },
  });
}

/**
 * "Ajukan revisi": `POST /pipeline-reports/{id}/revisions` multipart with new `evidence_before`
 * and `evidence_after` photos and their capture times, plus an optional `reason`. The server
 * keeps the previous version.
 * @param {{ reportId: string, before: { file: Blob, takenAt: string }, after: { file: Blob, takenAt: string }, reason?: string }} input
 */
export function reviseReport({ reportId, before, after, reason }) {
  /** @param {Blob} file @param {string} name */
  const asFile = (file, name) =>
    file instanceof File ? file : new File([file], `${name}.jpg`, { type: file.type });
  return apiRequest({
    method: 'post',
    path: `${PATH}/${reportId}/revisions`,
    body: toFormData({
      evidence_before: asFile(before.file, 'before'),
      open_date: before.takenAt,
      evidence_after: asFile(after.file, 'after'),
      closed_date: after.takenAt,
      reason: reason?.trim() || undefined,
    }),
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

/**
 * ⚠ W5 — `GET /pipeline-reports/{id}/history`. `null` when the server does not have the
 * endpoint (404/405): the history is then hidden.
 * @param {string} reportId
 */
export async function fetchReportHistory(reportId) {
  try {
    const { data } = await apiRequest({
      method: 'get',
      path: `${PATH}/${reportId}/history`,
      schema: taskReportHistorySchema,
    });
    return data;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) return null;
    throw error;
  }
}
