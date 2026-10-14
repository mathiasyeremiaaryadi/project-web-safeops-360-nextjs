'use client';

import { useCallback } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

const BASE_PARSERS = {
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(''),
};

/**
 * List state kept in the URL (page, search, filters). Changing any filter resets `page` to 1.
 * @template {Record<string, any>} T
 * @param {T} [filterParsers] nuqs parsers for the list's filters — define them at module scope.
 */
export function useListParams(filterParsers) {
  const [params, setParams] = useQueryStates(
    { ...BASE_PARSERS, ...(filterParsers ?? {}) },
    { history: 'replace', clearOnDefault: true },
  );

  /** @type {(updates: Record<string, any>) => void} */
  const setFilters = useCallback((updates) => setParams({ ...updates, page: 1 }), [setParams]);
  /** @type {(page: number) => void} */
  const setPage = useCallback((page) => setParams({ page }), [setParams]);

  return { params, limit: DEFAULT_PAGE_SIZE, setFilters, setPage };
}
