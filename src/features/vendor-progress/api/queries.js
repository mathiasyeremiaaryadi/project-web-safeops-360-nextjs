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
 * One request per day of the period, added up per vendor. The endpoints take one `date`, so a
 * period of n days is n requests (max. 31) — docs/ASSUMPTIONS.md VP2. Shaped like a list
 * response for `QueryList`.
 * @param {string} path
 * @param {Record<string, string | undefined>} extra Other query parameters.
 * @param {string[]} dates
 */
async function fetchPeriod(path, extra, dates) {
  const days = await Promise.all(
    dates.map((date) =>
      apiRequest({ method: 'get', path, searchParams: { ...extra, date }, schema: daySchema }),
    ),
  );
  const data = mergeVendorProgress(days);
  return { data, page: 1, limit: Math.max(data.length, 1), total: data.length };
}

/**
 * List: `GET /dashboard/summary?date=&site_id=&vendor_id=` per day.
 * @param {{ dates: string[], site_id?: string, vendor_id?: string }} params
 */
export function useVendorProgress({ dates, site_id, vendor_id }) {
  return useQuery({
    queryKey: ['vendor-progress', { dates, site_id, vendor_id }],
    queryFn: () => fetchPeriod('v1/dashboard/summary', { site_id, vendor_id }, dates),
    enabled: dates.length > 0,
    placeholderData: keepPreviousData,
  });
}

/**
 * Detail of a vendor (areas → points → reports per shift):
 * `GET /dashboard/summary/detail?type=vendor_progress&date=&site_id=&vendor_id=` per day.
 * @param {{ dates: string[], site_id?: string, vendor_id: string }} params
 */
export function useVendorProgressDetail({ dates, site_id, vendor_id }) {
  return useQuery({
    queryKey: ['vendor-progress', 'detail', { dates, site_id, vendor_id }],
    queryFn: () =>
      fetchPeriod(
        'v1/dashboard/summary/detail',
        { type: 'vendor_progress', site_id, vendor_id },
        dates,
      ),
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
