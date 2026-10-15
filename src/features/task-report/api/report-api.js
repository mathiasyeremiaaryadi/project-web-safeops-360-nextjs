import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { toFormData, UPLOAD_TIMEOUT_MS } from '@/lib/api/form-data';
import { taskReportHistorySchema } from '@/features/pipeline-reports';

/*
 * Worker calls on one task report. Endpoints marked ⚠ follow the PRD 1.2 contract and are not
 * in the BRD or the Postman collection yet — each lives in ONE function here so it is easy to
 * change when the backend adds it (docs/ASSUMPTIONS.md W3–W5).
 */

const PATH = 'v1/pipeline-reports';

/**
 * ⚠ W3 — `POST /pipeline-reports/{id}/evidence`, multipart `file` + `type=before|after`.
 * @param {{ reportId: string, type: 'before' | 'after', file: Blob }} input
 */
export function uploadEvidence({ reportId, type, file }) {
  const photo = file instanceof File ? file : new File([file], `${type}.jpg`, { type: file.type });
  return apiRequest({
    method: 'post',
    path: `${PATH}/${reportId}/evidence`,
    body: toFormData({ type, file: photo }),
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
 * ⚠ W4 — `POST /pipeline-reports/{id}/submit` → `SUBMITTED` (the server checks both photos).
 * @param {string} reportId
 */
export function submitReport(reportId) {
  return apiRequest({ method: 'post', path: `${PATH}/${reportId}/submit` });
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
