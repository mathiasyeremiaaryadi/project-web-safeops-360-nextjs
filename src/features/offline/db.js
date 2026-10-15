import Dexie from 'dexie';

/**
 * The Worker's offline data on the device (prompt section 7), always keyed by `userId`.
 *
 * `pendingUploads`: compressed evidence photos that could not be uploaded (no signal), sent
 * later in order. `{ id, userId, reportId, type: 'before'|'after', blob, createdAt, attempts,
 * lastError }`.
 */
export const offlineDb = new Dexie('safeops-offline');

offlineDb.version(1).stores({
  pendingUploads: '++id, userId, [userId+reportId+type]',
});

/**
 * @typedef {object} PendingUpload
 * @property {number} id
 * @property {string} userId
 * @property {string} reportId
 * @property {'before' | 'after'} type
 * @property {Blob} blob
 * @property {number} createdAt
 * @property {number} attempts
 * @property {string | null} lastError
 */
