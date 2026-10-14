'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { policyKeys } from '@/features/policies/api/keys';
import { policyListSchema } from '@/features/policies/api/schemas';

/** `GET /policies?page=&limit=&q=&vendor_id=&status=` @param {Record<string, string | number>} params */
export function usePolicies(params) {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/policies',
        searchParams: params,
        schema: policyListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}
