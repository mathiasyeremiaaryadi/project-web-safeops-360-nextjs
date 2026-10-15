'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { toFormData, UPLOAD_TIMEOUT_MS } from '@/lib/api/form-data';

/*
 * The three request shapes every master-data/report feature uses. A feature's `api/queries.js`
 * and `api/mutations.js` call these with its path, keys and schema, e.g.:
 *
 *   export const useSites = (params) =>
 *     useListQuery({ keys: siteKeys, path: 'v1/sites', params, schema: siteListSchema });
 */

/** @typedef {ReturnType<typeof import('@/lib/api/query-keys').createQueryKeys>} ResourceKeys */

/**
 * Paged list (`GET <path>?page=&limit=&...`). Keeps the previous page on screen while the next
 * one loads, so paging and filtering do not flash a skeleton.
 * @template {import('zod').ZodType} T
 * @param {{ keys: ResourceKeys, path: string, params: Record<string, unknown>, schema: T }} options
 */
export function useListQuery({ keys, path, params, schema }) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path,
        searchParams: /** @type {Record<string, string | number>} */ (params),
        schema,
      }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Growing list for "Muat lebih banyak" (`GET <path>?page=1,2,…&limit=`): the Worker pages,
 * which show cards instead of a paged table. Lives under `keys.lists()`, so saving refreshes it.
 * @template {import('zod').ZodType<{ data: unknown[], total?: number }>} T
 * @param {{ keys: ResourceKeys, path: string, params: Record<string, unknown>, schema: T, limit?: number, enabled?: boolean }} options
 */
export function useInfiniteListQuery({ keys, path, params, schema, limit = 20, enabled = true }) {
  return useInfiniteQuery({
    queryKey: [...keys.list({ ...params, limit }), 'infinite'],
    queryFn: ({ pageParam }) =>
      apiRequest({
        method: 'get',
        path,
        searchParams: /** @type {Record<string, string | number>} */ ({
          ...params,
          page: pageParam,
          limit,
        }),
        schema,
      }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((count, page) => count + page.data.length, 0);
      if (last.data.length < limit || (last.total !== undefined && loaded >= last.total)) {
        return undefined;
      }
      return pages.length + 1;
    },
    enabled,
  });
}

/**
 * One record (`GET <path>/<id>`).
 * @template {import('zod').ZodType} T
 * @param {{ keys: ResourceKeys, path: string, id: string, schema: T }} options
 */
export function useDetailQuery({ keys, path, id, schema }) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => apiRequest({ method: 'get', path: `${path}/${id}`, schema }),
    enabled: Boolean(id),
  });
}

/**
 * Create (`POST <path>`) or update (`PATCH <path>/<id>`), as JSON or as multipart (uploads).
 * The response body is NOT read: the list/detail are refetched instead, so saving does not depend
 * on the response envelope. Call it with `{ id?, body }`.
 * @param {object} options
 * @param {string} options.path e.g. `'v1/sites'`
 * @param {ResourceKeys} options.keys Its lists (and the saved record's detail) are refreshed.
 * @param {readonly unknown[][]} [options.alsoInvalidate] Other caches to refresh (e.g. lookups).
 * @param {boolean} [options.multipart] Send `body` as multipart/form-data (files).
 */
export function useSaveMutation({ path, keys, alsoInvalidate = [], multipart = false }) {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id?: string, body: Record<string, any> }} input */
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: id ? 'patch' : 'post',
        path: id ? `${path}/${id}` : path,
        ...(multipart ? { body: toFormData(body), timeout: UPLOAD_TIMEOUT_MS } : { json: body }),
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: keys.lists() });
      if (id) queryClient.invalidateQueries({ queryKey: keys.detail(id) });
      for (const queryKey of alsoInvalidate) queryClient.invalidateQueries({ queryKey });
    },
  });
}
