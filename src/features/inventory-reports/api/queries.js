'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { signedUrlSchema } from '@/lib/api/lists';
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

/**
 * `GET /inventory-reports/{id}/evidence` (Postman) → signed URL of the evidence photo, when the
 * report itself only has an object key. Not retried: no photo is not an error.
 * @param {string} id
 * @param {{ enabled: boolean }} options
 */
export const useInventoryReportEvidence = (id, { enabled }) =>
  useQuery({
    queryKey: [...inventoryReportKeys.detail(id), 'evidence'],
    queryFn: () =>
      apiRequest({ method: 'get', path: `${PATH}/${id}/evidence`, schema: signedUrlSchema }),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
