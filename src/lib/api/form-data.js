/**
 * Multipart body for upload endpoints (inventories, SOP). `undefined`/`null` fields are skipped,
 * so a PATCH only sends what is set; numbers are sent as text.
 * @param {Record<string, string | number | Blob | null | undefined>} fields
 */
export function toFormData(fields) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    formData.append(key, value instanceof Blob ? value : String(value));
  }
  return formData;
}

/** Timeout of upload requests (the default 15 s is too short for a 10 MB PDF on a slow link). */
export const UPLOAD_TIMEOUT_MS = 60_000;
