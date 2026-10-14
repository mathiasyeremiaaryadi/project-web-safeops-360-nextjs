'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { inventoryKeys } from '@/features/inventories/api/keys';
import { inventoryDetailSchema, inventoryListSchema } from '@/features/inventories/api/schemas';

/**
 * `GET /inventories?page=&limit=&q=&vendor_id=&site_id=&status_condition=`
 * @param {Record<string, string | number>} params
 */
export function useInventories(params) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/inventories',
        searchParams: params,
        schema: inventoryListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}

/** `GET /inventories/{id}` — includes the signed `image_url`. @param {string} id */
export function useInventory(id) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () =>
      apiRequest({ method: 'get', path: `v1/inventories/${id}`, schema: inventoryDetailSchema }),
  });
}
