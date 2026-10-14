/** Query keys of the inventories feature. */
export const inventoryKeys = Object.freeze({
  all: /** @type {const} */ (['inventories']),
  lists: () => /** @type {const} */ ([...inventoryKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...inventoryKeys.lists(), params],
  detail: (/** @type {string} */ id) => [...inventoryKeys.all, 'detail', id],
});
