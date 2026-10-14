/** Query keys of the policies (SOP) feature. */
export const policyKeys = Object.freeze({
  all: /** @type {const} */ (['policies']),
  lists: () => /** @type {const} */ ([...policyKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...policyKeys.lists(), params],
});
