'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { itemKeys } from '@/features/items/api/keys';
import { itemListSchema } from '@/features/items/api/schemas';

/** `GET /items?page=&limit=&q=` @param {{ page: number, limit: number, q: string }} params */
export function useItems(params) {
  return useQuery({
    queryKey: itemKeys.list(params),
    queryFn: () =>
      apiRequest({ method: 'get', path: 'v1/items', searchParams: params, schema: itemListSchema }),
    placeholderData: keepPreviousData,
  });
}
