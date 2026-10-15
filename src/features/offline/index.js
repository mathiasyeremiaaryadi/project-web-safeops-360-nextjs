/* Public API of the offline feature (Worker): online status, photo upload queue, task cache. */
export { useOnlineStatus } from '@/features/offline/use-online-status';
export { OfflineBanner } from '@/features/offline/offline-banner';
export {
  enqueueUpload,
  listPendingUploads,
  MAX_UPLOAD_ATTEMPTS,
  processUploadQueue,
  resetUploadAttempts,
  subscribeUploadQueue,
} from '@/features/offline/upload-queue';
export { persistUserQueries } from '@/features/offline/task-cache';

/*
 * Clean-up for logout/login, loaded on demand: the sign-in and profile pages of every role use
 * these, and must not ship the IndexedDB code.
 */
const loadClear = () => import('@/features/offline/clear');

/** Logout: removes this user's queued photos and saved tasks. @param {string} userId */
export const clearOfflineData = async (userId) => (await loadClear()).clearOfflineData(userId);

/** Login: removes the offline data of any other user of this device. @param {string} userId */
export const clearOtherUsersOfflineData = async (userId) =>
  (await loadClear()).clearOtherUsersOfflineData(userId);

/** Photos still waiting to be sent (asked before logout). @param {string} userId */
export const countPendingUploads = async (userId) =>
  (await loadClear()).countPendingUploads(userId);
