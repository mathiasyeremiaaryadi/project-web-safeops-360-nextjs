/** Query keys of the items feature. */
export const itemKeys = Object.freeze({
  all: /** @type {const} */ (['items']),
  lists: () => /** @type {const} */ ([...itemKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...itemKeys.lists(), params],
});
