'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { toDashboardKpis, toVendorProgress } from '@/features/dashboard/lib/summary';

/* The response shapes are not specified: they are mapped by the pure functions in lib/summary.js. */
const kpiSchema = z.unknown().transform(toDashboardKpis);
const progressSchema = z.unknown().transform(toVendorProgress);

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

/** `GET /reports/daily?date=&site_id=&vendor_id=` → progress per vendor. @param {DashboardParams} params */
export function useVendorProgress(params) {
  return useQuery({
    queryKey: ['dashboard', 'daily', params],
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/reports/daily',
        searchParams: params,
        schema: progressSchema,
      }),
  });
}
