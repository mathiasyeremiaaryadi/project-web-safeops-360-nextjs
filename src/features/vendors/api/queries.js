'use client';

import { useListQuery } from '@/hooks/use-resource';
import { vendorKeys } from '@/features/vendors/api/keys';
import { vendorListSchema } from '@/features/vendors/api/schemas';

/** `GET /vendors?page=&limit=&q=` @param {{ page: number, limit: number, q: string }} params */
export const useVendors = (params) =>
  useListQuery({ keys: vendorKeys, path: 'v1/vendors', params, schema: vendorListSchema });
