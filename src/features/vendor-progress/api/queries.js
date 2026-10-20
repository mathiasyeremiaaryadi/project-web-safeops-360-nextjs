'use client';

import { toVendorProgress } from '@/features/vendor-progress/lib/progress';
import { apiRequest } from '@/lib/api/client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const vendorProgressSchema = z.unknown().transform(toVendorProgress);

/**
 * GET /api/v1/dashboard/summary
 *
 * Filter:
 * - site_id (optional)
 * - vendor_id (optional)
 * - date (required, YYYY-MM-DD)
 *
 * @param {{ date?: string, site_id?: string, vendor_id?: string }} params
 */
export function useVendorProgress({ date, site_id, vendor_id } = {}) {
  return useQuery({
    queryKey: [
      'vendor-progress',
      {
        date: date || '',
        site_id: site_id || '',
        vendor_id: vendor_id || '',
      },
    ],
    queryFn: async () => {
      const data = await apiRequest({
        method: 'get',
        path: 'v1/dashboard/summary',
        searchParams: {
          date,
          site_id: site_id || undefined,
          vendor_id: vendor_id || undefined,
        },
        schema: vendorProgressSchema,
      });

      return {
        data,
        page: 1,
        limit: Math.max(data.length, 1),
        total: data.length,
      };
    },
    enabled: Boolean(date),
    placeholderData: keepPreviousData,
  });
}

/**
 * GET /api/v1/dashboard/summary/detail
 *
 * Filter:
 * - site_id (optional)
 * - vendor_id (required for vendor detail)
 * - date (required, YYYY-MM-DD)
 *
 * Detail type is fixed to vendor_progress.
 *
 * @param {{ date?: string, site_id?: string, vendor_id?: string }} params
 */
export function useVendorProgressDetail({ date, site_id, vendor_id } = {}) {
  return useQuery({
    queryKey: [
      'vendor-progress',
      'detail',
      {
        date: date || '',
        site_id: site_id || '',
        vendor_id: vendor_id || '',
      },
    ],
    queryFn: async () => {
      const data = await apiRequest({
        method: 'get',
        path: 'v1/dashboard/summary/detail',
        searchParams: {
          type: 'vendor_progress',
          date,
          site_id: site_id || undefined,
          vendor_id: vendor_id || undefined,
        },
        schema: vendorProgressSchema,
      });

      return {
        data,
        page: 1,
        limit: Math.max(data.length, 1),
        total: data.length,
      };
    },
    enabled: Boolean(date && vendor_id),
    placeholderData: keepPreviousData,
  });
}
