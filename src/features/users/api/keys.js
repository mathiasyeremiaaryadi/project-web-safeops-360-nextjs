/** Query keys of the users feature. */
export const userKeys = Object.freeze({
  all: /** @type {const} */ (['users']),
  lists: () => /** @type {const} */ ([...userKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...userKeys.lists(), params],
  detail: (/** @type {string} */ id) => [...userKeys.all, 'detail', id],
});
