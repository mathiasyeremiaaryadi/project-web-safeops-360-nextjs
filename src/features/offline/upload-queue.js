import { offlineDb } from '@/features/offline/db';

/** @typedef {import('@/features/offline/db').PendingUpload} PendingUpload */

/** After this many failed tries an item stops ("Gagal dikirim") until "Coba lagi". */
export const MAX_UPLOAD_ATTEMPTS = 5;

/** @type {Set<() => void>} */
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

/**
 * Calls `listener` whenever the queue changes. Returns the unsubscribe function.
 * @param {() => void} listener
 */
export function subscribeUploadQueue(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Queues a compressed photo. A newer photo of the same report and type REPLACES the queued one.
 * @param {{ userId: string, reportId: string, type: 'before' | 'after', blob: Blob }} upload
 */
export async function enqueueUpload({ userId, reportId, type, blob }) {
  const table = offlineDb.pendingUploads;
  await offlineDb.transaction('rw', table, async () => {
    await table.where('[userId+reportId+type]').equals([userId, reportId, type]).delete();
    await table.add({
      userId,
      reportId,
      type,
      blob,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
    });
  });
  notify();
}

/**
 * The user's queued photos, oldest first (FIFO).
 * @param {string} userId
 * @returns {Promise<PendingUpload[]>}
 */
export const listPendingUploads = (userId) =>
  offlineDb.pendingUploads.where('userId').equals(userId).sortBy('id');

/** @param {string} userId */
export const countPendingUploads = (userId) =>
  offlineDb.pendingUploads.where('userId').equals(userId).count();

/** @param {unknown} error */
const isNetworkError = (error) => /** @type {any} */ (error)?.status === 0;

/** @type {Promise<string[]> | null} */
let running = null;

/**
 * Sends the user's queued photos one at a time, oldest first. A sent photo is removed; a failed
 * one counts an attempt (at most 5). Stops at a network error: still no signal.
 * Calls made while it runs share the same run.
 * @param {string} userId
 * @param {(upload: PendingUpload) => Promise<unknown>} send
 * @returns {Promise<string[]>} Ids of the reports that got a photo.
 */
export function processUploadQueue(userId, send) {
  running ??= (async () => {
    /** @type {string[]} */
    const sent = [];
    try {
      for (const upload of await listPendingUploads(userId)) {
        if (upload.attempts >= MAX_UPLOAD_ATTEMPTS) continue;
        try {
          await send(upload);
          await offlineDb.pendingUploads.delete(upload.id);
          sent.push(upload.reportId);
        } catch (error) {
          await offlineDb.pendingUploads.update(upload.id, {
            attempts: upload.attempts + 1,
            lastError: /** @type {any} */ (error)?.code ?? 'UPLOAD_FAILED',
          });
          if (isNetworkError(error)) break;
        }
      }
    } finally {
      running = null;
      notify();
    }
    return sent;
  })();
  return running;
}

/**
 * "Coba lagi" on a photo that failed 5 times: it gets 5 new attempts.
 * @param {number} id
 */
export async function resetUploadAttempts(id) {
  await offlineDb.pendingUploads.update(id, { attempts: 0, lastError: null });
  notify();
}

/**
 * Removes the queued photos of one user (logout), or of everyone except `keepUserId`
 * (another user signed in on this device).
 * @param {{ userId?: string, keepUserId?: string }} which
 */
export async function clearPendingUploads({ userId, keepUserId }) {
  const table = offlineDb.pendingUploads;
  if (userId) await table.where('userId').equals(userId).delete();
  if (keepUserId) await table.where('userId').notEqual(keepUserId).delete();
  notify();
}
