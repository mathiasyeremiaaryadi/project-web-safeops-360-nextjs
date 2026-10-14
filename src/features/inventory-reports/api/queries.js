'use client';

import { useDetailQuery, useListQuery } from '@/hooks/use-resource';
import { inventoryReportKeys } from '@/features/inventory-reports/api/keys';
import {
  inventoryReportDetailSchema,
  inventoryReportListSchema,
} from '@/features/inventory-reports/api/schemas';

const PATH = 'v1/inventory-reports';

/**
 * `GET /inventory-reports?page=&limit=&status=&report_type=&site_id=&vendor_id=`
 * @param {Record<string, string | number | undefined>} params
 */
export const useInventoryReports = (params) =>
  useListQuery({
    keys: inventoryReportKeys,
    path: PATH,
    params,
    schema: inventoryReportListSchema,
  });

/** `GET /inventory-reports/{id}` @param {string} id */
export const useInventoryReport = (id) =>
  useDetailQuery({
    keys: inventoryReportKeys,
    path: PATH,
    id,
    schema: inventoryReportDetailSchema,
  });
