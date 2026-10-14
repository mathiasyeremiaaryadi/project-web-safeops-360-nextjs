'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { inventoryReportKeys } from '@/features/inventory-reports/api/keys';
import {
  inventoryReportDetailSchema,
  inventoryReportListSchema,
} from '@/features/inventory-reports/api/schemas';

/**
 * `GET /inventory-reports?page=&limit=&status=&report_type=&site_id=&vendor_id=`
 * @param {Record<string, string | number | undefined>} params
 */
export function useInventoryReports(params) {
  return useQuery({
    queryKey: inventoryReportKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/inventory-reports',
        searchParams: params,
        schema: inventoryReportListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}

/** `GET /inventory-reports/{id}` @param {string} id */
export function useInventoryReport(id) {
  return useQuery({
    queryKey: inventoryReportKeys.detail(id),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: `v1/inventory-reports/${id}`,
        schema: inventoryReportDetailSchema,
      }),
    enabled: Boolean(id),
  });
}
