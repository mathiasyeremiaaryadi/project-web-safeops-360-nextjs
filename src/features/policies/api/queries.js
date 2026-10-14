'use client';

import { useListQuery } from '@/hooks/use-resource';
import { policyKeys } from '@/features/policies/api/keys';
import { policyListSchema } from '@/features/policies/api/schemas';

/** `GET /policies?page=&limit=&q=&vendor_id=` @param {Record<string, string | number>} params */
export const usePolicies = (params) =>
  useListQuery({ keys: policyKeys, path: 'v1/policies', params, schema: policyListSchema });
