import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { entityResponseSchema, listResponseSchema } from '@/lib/api/lists';

/*
 * Option lookups shared by several features (dropdowns and name labels). Only `id` and the
 * label fields are read, so each feature keeps its own full schemas.
 */

// `null` labels are allowed: one row without a name must not fail the whole list.
const lookupRowSchema = z.object({
  id: z.coerce.string(),
  name: z.string().nullish(),
  code: z.string().nullish(),
  username: z.string().nullish(),
  full_name: z.string().nullish(),
});

const lookupListSchema = listResponseSchema(lookupRowSchema);

const siteDetailSchema = entityResponseSchema(lookupRowSchema, 'site');

/** @typedef {{ value: string, label: string, hint?: string }} Option */

export const LOOKUPS = Object.freeze({
  sites: {
    path: 'v1/sites',
    label: (/** @type {any} */ r) => r.name ?? r.id,
    hint: (/** @type {any} */ r) => r.code ?? undefined,
  },
  vendors: {
    path: 'v1/vendors',
    label: (/** @type {any} */ r) => r.name ?? r.id,
    hint: (/** @type {any} */ r) => r.code ?? undefined,
  },
  items: {
    path: 'v1/items',
    label: (/** @type {any} */ r) => r.name ?? r.id,
    hint: () => undefined,
  },
  pipelines: {
    path: 'v1/pipelines',
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
    // `page` is always sent, like the list pages: without it the backend fails (5xx) on
    // `GET /sites?limit=20` (docs/ASSUMPTIONS.md L3).
    searchParams: { page: 1, q, limit, ...params },
    schema: lookupListSchema,
  });
  return result.data.map((row) => ({
    value: row.id,
    label: lookup.label(row),
    hint: lookup.hint(row),
  }));
}

/**
 * Name of one site (`GET /sites/{id}`), used when the site list cannot provide it.
 * @param {string} id
 * @returns {Promise<string | null>}
 */
export async function fetchSiteName(id) {
  const site = await apiRequest({
    method: 'get',
    path: `v1/sites/${id}`,
    schema: siteDetailSchema,
  });
  return site.name ?? null;
}
