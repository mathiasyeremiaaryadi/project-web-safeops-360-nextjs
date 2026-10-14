'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLookupOptions } from '@/lib/api/lookups';

/**
 * id → label map for showing names of referenced records (e.g. vendor of a pipeline, sites of a
 * user scope). Loads up to 100 records once per 5 minutes; unknown ids fall back to "—".
 * @param {import('@/lib/api/lookups').LookupKind} kind
 */
export function useOptionLabels(kind) {
  const query = useQuery({
    queryKey: ['lookups', kind, 'labels'],
    queryFn: () => fetchLookupOptions(kind, { limit: 100 }),
    staleTime: 5 * 60_000,
  });

  /** @param {string | null | undefined} id */
  const labelOf = (id) => {
    if (!id) return '—';
    return query.data?.find((option) => option.value === id)?.label ?? '—';
  };

  return { labelOf, options: query.data ?? [], isLoading: query.isLoading };
}
