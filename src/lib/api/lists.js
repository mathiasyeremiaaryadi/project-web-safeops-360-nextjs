import { z } from 'zod';

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * First array found in an object: `data`, `items`, `rows`, then any other key (e.g. `sites`).
 * @param {Record<string, unknown>} object
 */
function findArray(object) {
  for (const key of ['data', 'items', 'rows', 'results', 'records']) {
    if (Array.isArray(object[key])) return object[key];
  }
  return Object.values(object).find(Array.isArray);
}

/**
 * Normalises the list envelopes the Go backend may use into `{ data, page, limit, total }`:
 * a plain array, `{ data: [] }`, `{ data: { data|items|rows|<any>: [] } }`, `{ items: [] }`,
 * with paging at any of those levels or under `meta` / `pagination`.
 * @param {unknown} raw
 */
function normaliseList(raw) {
  if (Array.isArray(raw)) return { data: raw };
  if (!isRecord(raw)) return raw;
  const body = /** @type {Record<string, any>} */ (raw);
  const nested = isRecord(body.data) ? body.data : {};
  const data = findArray(body) ?? findArray(nested) ?? [];
  const paging = {
    ...nested.meta,
    ...nested.pagination,
    ...nested,
    ...body.meta,
    ...body.pagination,
    ...body,
  };
  return {
    data,
    page: paging.page ?? paging.current_page,
    limit: paging.limit ?? paging.per_page ?? paging.page_size,
    total: paging.total ?? paging.total_items ?? paging.total_count ?? paging.count,
  };
}

/**
 * Schema of every paginated list (BRD 8.5: `{ data: [], page, limit, total }`), tolerant to the
 * envelope variants above. `page`/`limit` default and `total` is optional.
 * @template {z.ZodType} T
 * @param {T} item
 */
export function listResponseSchema(item) {
  return z.preprocess(
    normaliseList,
    z.object({
      data: z.array(item),
      page: z.coerce.number().int().positive().catch(1),
      limit: z.coerce.number().int().positive().catch(20),
      total: z.coerce.number().int().nonnegative().optional().catch(undefined),
    }),
  );
}

/** Master-data status (`ACTIVE` / `INACTIVE`), case-insensitive. */
export const masterStatusSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['ACTIVE', 'INACTIVE']),
);

/**
 * Fills `status` from `is_active` when the backend sends a boolean instead of a status.
 * @param {unknown} row
 */
export function withMasterStatus(row) {
  const value = /** @type {any} */ (row);
  if (!value || typeof value !== 'object' || value.status !== undefined) return value;
  if (typeof value.is_active === 'boolean') {
    return { ...value, status: value.is_active ? 'ACTIVE' : 'INACTIVE' };
  }
  return value;
}

/**
 * List of ids from `["id"]` or `[{ id }]` (e.g. `site_ids` or `sites`).
 */
export const idListSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.map((entry) => (entry && typeof entry === 'object' ? entry.id : entry))
      : [],
  z.array(z.coerce.string()),
);

/**
 * Schema of a single-record response (`GET /<resource>/{id}`), tolerant to wrappers:
 * `{...}`, `{ data: {...} }`, `{ <key>: {...} }` or `{ data: { <key>: {...} } }`.
 * @template {z.ZodType} T
 * @param {T} schema Record schema.
 * @param {string} key Wrapper key used by the backend, e.g. `pipeline`, `user`.
 */
export function entityResponseSchema(schema, key) {
  return z.preprocess((raw) => {
    if (!isRecord(raw)) return raw;
    const body = /** @type {Record<string, any>} */ (raw);
    if (body.id !== undefined) return body;
    const data = isRecord(body.data) ? body.data : {};
    return [body[key], data[key], body.data].find(isRecord) ?? body;
  }, schema);
}
