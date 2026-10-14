import { createQueryKeys } from '@/lib/api/query-keys';

/** Query keys of the pipelines feature, plus the ordered tasks of one pipeline. */
export const pipelineKeys = Object.freeze({
  ...createQueryKeys('pipelines'),
  items: (/** @type {string} */ id) => ['pipelines', 'items', id],
});
