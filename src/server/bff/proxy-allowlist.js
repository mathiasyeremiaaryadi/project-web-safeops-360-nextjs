/**
 * First path segments of Go `/api/v1/*` endpoints that the browser may reach through the BFF
 * proxy (`/api/v1/<segment>/...`). Default deny: add a segment when a module needs it, e.g.
 * `'sites'`, `'vendors'`, `'tasks'`. `auth` is always excluded (dedicated handlers).
 * @type {readonly string[]}
 */
export const API_PROXY_ALLOWLIST = Object.freeze([
  'users',
  'roles',
  'audit-logs',
  'sites',
  'vendors',
  'items',
  'pipelines',
  'pipeline-items',
  'inventories',
  'policies',
  'pipeline-reports',
  'inventory-reports',
  'dashboard',
  'reports',
]);
