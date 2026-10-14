'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { siteKeys } from '@/features/sites/api/keys';
import { siteListSchema } from '@/features/sites/api/schemas';

/** `GET /sites?page=&limit=&q=` @param {{ page: number, limit: number, q: string }} params */
export function useSites(params) {
  return useQuery({
    queryKey: siteKeys.list(params),
    queryFn: () =>
      apiRequest({ method: 'get', path: 'v1/sites', searchParams: params, schema: siteListSchema }),
    placeholderData: keepPreviousData,
  });
}
