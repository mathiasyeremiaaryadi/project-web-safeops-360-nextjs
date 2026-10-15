'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import {
  mergePipelineProgress,
  toPipelineProgress,
} from '@/features/vendor-progress/lib/pipeline-progress';
import { mergeVendorProgress, toVendorProgress } from '@/features/vendor-progress/lib/progress';

const daySchema = z.unknown().transform(toVendorProgress);

/**
 * `GET /dashboard/summary?date=&site_id=&vendor_id=` for every day of the period, added up per
 * vendor. The endpoint takes one `date`, so a period of n days is n requests (max. 31) —
 * docs/ASSUMPTIONS.md VP2. Shaped like a list response for `QueryList`.
 * @param {{ dates: string[], site_id?: string, vendor_id?: string }} params
 */
export function useVendorProgress({ dates, site_id, vendor_id }) {
  return useQuery({
    queryKey: ['vendor-progress', { dates, site_id, vendor_id }],
    queryFn: async () => {
      const days = await Promise.all(
        dates.map((date) =>
          apiRequest({
            method: 'get',
            path: 'v1/dashboard/summary',
            searchParams: { date, site_id, vendor_id },
            schema: daySchema,
          }),
        ),
      );
      const data = mergeVendorProgress(days);
      return { data, page: 1, limit: Math.max(data.length, 1), total: data.length };
    },
    enabled: dates.length > 0,
    placeholderData: keepPreviousData,
  });
}

const dailySchema = z.unknown().transform(toPipelineProgress);

/**
 * `GET /reports/daily?date=&site_id=` per day of the period, added up per pipeline (the Admin
 * vendor's own pipelines: the backend limits the rows to their vendor).
 * @param {{ dates: string[], site_id?: string }} params
 */
export function usePipelineProgress({ dates, site_id }) {
  return useQuery({
    queryKey: ['pipeline-progress', { dates, site_id }],
    queryFn: async () => {
      const days = await Promise.all(
        dates.map((date) =>
          apiRequest({
            method: 'get',
            path: 'v1/reports/daily',
            searchParams: { date, site_id },
            schema: dailySchema,
          }),
        ),
      );
      const data = mergePipelineProgress(days);
      return { data, page: 1, limit: Math.max(data.length, 1), total: data.length };
    },
    enabled: dates.length > 0,
    placeholderData: keepPreviousData,
  });
}
