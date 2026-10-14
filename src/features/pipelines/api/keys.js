/** Query keys of the pipelines feature. */
export const pipelineKeys = Object.freeze({
  all: /** @type {const} */ (['pipelines']),
  lists: () => /** @type {const} */ ([...pipelineKeys.all, 'list']),
  list: (/** @type {Record<string, unknown>} */ params) => [...pipelineKeys.lists(), params],
  detail: (/** @type {string} */ id) => [...pipelineKeys.all, 'detail', id],
  items: (/** @type {string} */ id) => [...pipelineKeys.all, 'items', id],
});
