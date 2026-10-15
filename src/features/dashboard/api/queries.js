'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { toDashboardKpis, toProgress } from '@/features/dashboard/lib/summary';

/* The response shapes are not specified: they are mapped by the pure functions in lib/summary.js. */
const kpiSchema = z.unknown().transform(toDashboardKpis);

/** @typedef {{ date: string, site_id: string, vendor_id: string }} DashboardParams */

/** `GET /dashboard/report?date=&site_id=&vendor_id=` → KPI counts. @param {DashboardParams} params */
export function useDashboardKpis(params) {
  return useQuery({
    queryKey: ['dashboard', 'report', params],
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/dashboard/report',
        searchParams: params,
        schema: kpiSchema,
      }),
  });
}

/**
 * `GET /reports/daily?date=&site_id=&vendor_id=` → progress per vendor, or per pipeline for a
 * vendor's own user.
 * @param {DashboardParams} params
 * @param {import('@/features/dashboard/lib/summary').ProgressGroup} groupBy
 */
export function useProgress(params, groupBy) {
  return useQuery({
    queryKey: ['dashboard', 'daily', groupBy, params],
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/reports/daily',
        searchParams: params,
        schema: z.unknown().transform((raw) => toProgress(raw, groupBy)),
      }),
  });
}
