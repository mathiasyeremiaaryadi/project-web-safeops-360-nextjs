import { clearPendingUploads, countPendingUploads } from '@/features/offline/upload-queue';
import { clearSavedQueries } from '@/features/offline/task-cache';

/*
 * Clean-up of the offline data, loaded on demand (`await import('@/features/offline/clear')`)
 * by logout and login, so pages of other roles do not ship the IndexedDB code.
 */

/** Logout: the queued photos and saved tasks of this user. @param {string} userId */
export async function clearOfflineData(userId) {
  await Promise.all([clearPendingUploads({ userId }), clearSavedQueries({ userId })]);
}

/** Login: the data of any other user who used this device. @param {string} userId */
export async function clearOtherUsersOfflineData(userId) {
  await Promise.all([
    clearPendingUploads({ keepUserId: userId }),
    clearSavedQueries({ keepUserId: userId }),
  ]);
}

export { countPendingUploads };
