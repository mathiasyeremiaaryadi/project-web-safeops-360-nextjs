import { createStore, del, delMany, get, keys, set } from 'idb-keyval';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

/*
 * Offline reading of the Worker's tasks: ONLY the queries chosen by `shouldPersist` (the
 * `my-tasks` keys) are saved to IndexedDB, under a key that contains the user id.
 */

const store = createStore('safeops-query-cache', 'queries');
const KEY_PREFIX = 'tasks:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** @param {string} userId */
const cacheKeyOf = (userId) => `${KEY_PREFIX}${userId}`;

/** idb-keyval as the persister's async storage. */
const storage = {
  getItem: (/** @type {string} */ key) => get(key, store),
  setItem: (/** @type {string} */ key, /** @type {unknown} */ value) => set(key, value, store),
  removeItem: (/** @type {string} */ key) => del(key, store),
};

/**
 * Restores the user's saved queries, then keeps saving them while the app runs.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string} userId
 * @param {(queryKey: readonly unknown[]) => boolean} shouldPersist
 * @returns {() => void} Stops saving.
 */
export function persistUserQueries(queryClient, userId, shouldPersist) {
  const [unsubscribe] = persistQueryClient({
    queryClient,
    persister: createAsyncStoragePersister({ storage, key: cacheKeyOf(userId) }),
    maxAge: MAX_AGE_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && shouldPersist(query.queryKey),
    },
  });
  return unsubscribe;
}

/**
 * Removes the saved queries of one user (logout), or of everyone except `keepUserId`.
 * @param {{ userId?: string, keepUserId?: string }} which
 */
export async function clearSavedQueries({ userId, keepUserId }) {
  if (userId) await del(cacheKeyOf(userId), store);
  if (keepUserId) {
    const others = (await keys(store)).filter((key) => key !== cacheKeyOf(keepUserId));
    await delMany(others, store);
  }
}
