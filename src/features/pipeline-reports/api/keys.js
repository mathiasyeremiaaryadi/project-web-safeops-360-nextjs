/** Query keys of the task (pipeline) reports feature. */
export const taskReportKeys = Object.freeze({
  all: /** @type {const} */ (['pipeline-reports']),
  lists: () => /** @type {const} */ ([...taskReportKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...taskReportKeys.lists(), params],
  detail: (/** @type {string} */ id) => [...taskReportKeys.all, 'detail', id],
});
