/** Query keys of the inventory reports feature. */
export const inventoryReportKeys = Object.freeze({
  all: /** @type {const} */ (['inventory-reports']),
  lists: () => /** @type {const} */ ([...inventoryReportKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...inventoryReportKeys.lists(), params],
  detail: (/** @type {string} */ id) => [...inventoryReportKeys.all, 'detail', id],
});
