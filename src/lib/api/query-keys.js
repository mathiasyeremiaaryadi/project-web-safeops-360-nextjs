/**
 * Standard TanStack Query keys of a resource:
 * - `all`        → `['sites']` (invalidates everything of the resource)
 * - `lists()`    → `['sites', 'list']` (every page/filter of the list)
 * - `list(p)`    → `['sites', 'list', { page, q, ... }]`
 * - `detail(id)` → `['sites', 'detail', id]`
 * @param {string} resource e.g. `'sites'`
 */
export function createQueryKeys(resource) {
  const all = /** @type {const} */ ([resource]);
  return Object.freeze({
    all,
    lists: () => [...all, 'list'],
    list: (/** @type {Record<string, unknown>} */ params) => [...all, 'list', params],
    detail: (/** @type {string} */ id) => [...all, 'detail', id],
  });
}

/**
 * Prefix of the cached dropdown/label options of a lookup (see `lib/api/lookups.js`), to refresh
 * them after the resource changed.
 * @param {string} kind e.g. `'vendors'`
 */
export const lookupKey = (kind) => ['lookups', kind];
