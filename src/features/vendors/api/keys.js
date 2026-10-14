/** Query keys of the vendors feature. */
export const vendorKeys = Object.freeze({
  all: /** @type {const} */ (['vendors']),
  lists: () => /** @type {const} */ ([...vendorKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...vendorKeys.lists(), params],
});
