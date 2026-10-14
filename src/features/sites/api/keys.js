/** Query keys of the sites feature. */
export const siteKeys = Object.freeze({
  all: /** @type {const} */ (['sites']),
  lists: () => /** @type {const} */ ([...siteKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...siteKeys.lists(), params],
});
