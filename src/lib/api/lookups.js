import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { listResponseSchema } from '@/lib/api/lists';

/*
 * Option lookups shared by several features (dropdowns and name labels). Only `id` and the
 * label fields are read, so each feature keeps its own full schemas.
 */

const lookupRowSchema = z.object({
  id: z.coerce.string(),
  name: z.string().optional(),
  code: z.string().optional(),
  username: z.string().optional(),
  full_name: z.string().nullish(),
});

const lookupListSchema = listResponseSchema(lookupRowSchema);

/** @typedef {{ value: string, label: string, hint?: string }} Option */

export const LOOKUPS = Object.freeze({
  sites: {
    path: 'v1/sites',
    label: (/** @type {any} */ r) => r.name ?? r.id,
    hint: (/** @type {any} */ r) => r.code,
  },
  vendors: {
    path: 'v1/vendors',
    label: (/** @type {any} */ r) => r.name ?? r.id,
    hint: (/** @type {any} */ r) => r.code,
  },
  items: {
    path: 'v1/items',
    label: (/** @type {any} */ r) => r.name ?? r.id,
    hint: () => undefined,
  },
  users: {
    path: 'v1/users',
    label: (/** @type {any} */ r) => r.full_name || r.username || r.id,
    hint: (/** @type {any} */ r) => (r.username ? `@${r.username}` : undefined),
  },
});

/** @typedef {keyof typeof LOOKUPS} LookupKind */

/**
 * Searches options on the server (`?q=&limit=`).
 * @param {LookupKind} kind
 * @param {{ q?: string, limit?: number, params?: Record<string, string | undefined> }} [options]
 * @returns {Promise<Option[]>}
 */
export async function fetchLookupOptions(kind, { q = '', limit = 20, params = {} } = {}) {
  const lookup = LOOKUPS[kind];
  const result = await apiRequest({
    method: 'get',
    path: lookup.path,
    searchParams: { q, limit, ...params },
    schema: lookupListSchema,
  });
  return result.data.map((row) => ({
    value: row.id,
    label: lookup.label(row),
    hint: lookup.hint(row),
  }));
}
