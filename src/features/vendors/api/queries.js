'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { vendorKeys } from '@/features/vendors/api/keys';
import { vendorListSchema } from '@/features/vendors/api/schemas';

/** `GET /vendors?page=&limit=&q=` @param {{ page: number, limit: number, q: string }} params */
export function useVendors(params) {
  return useQuery({
    queryKey: vendorKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/vendors',
        searchParams: params,
        schema: vendorListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}
