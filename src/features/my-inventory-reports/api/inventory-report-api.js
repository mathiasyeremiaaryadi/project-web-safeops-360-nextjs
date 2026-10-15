'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useInfiniteListQuery, useListQuery } from '@/hooks/use-resource';
import { inventoryReportKeys, inventoryReportListSchema } from '@/features/inventory-reports';

const PATH = 'v1/inventory-reports';

/**
 * `POST /inventory-reports` as JSON (BRD): `vendor_id`, `report_type`, `description`, optional
 * `inventory_id`. The backend has no evidence upload yet (docs/ASSUMPTIONS.md W6), so no photo
 * is sent — change this one function when it does.
 * @param {Record<string, string | undefined>} body
 */
export function createInventoryReport(body) {
  return apiRequest({ method: 'post', path: PATH, json: body });
}

/** Sends a report and refreshes "Laporan saya". */
export function useCreateInventoryReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryReportKeys.all }),
  });
}

/** "Laporan saya" panel: the latest reports (the API returns the worker's own only). */
export const useLatestInventoryReports = (/** @type {number} */ limit) =>
  useListQuery({
    keys: inventoryReportKeys,
    path: PATH,
    params: { page: 1, limit },
    schema: inventoryReportListSchema,
  });

/** "Laporan saya" full list, with "Muat lebih banyak". */
export const useMyInventoryReports = () =>
  useInfiniteListQuery({
    keys: inventoryReportKeys,
    path: PATH,
    params: {},
    schema: inventoryReportListSchema,
  });
