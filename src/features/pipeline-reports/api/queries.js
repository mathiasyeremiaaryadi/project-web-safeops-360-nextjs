'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { taskReportKeys } from '@/features/pipeline-reports/api/keys';
import {
  taskReportDetailSchema,
  taskReportListSchema,
} from '@/features/pipeline-reports/api/schemas';

/**
 * `GET /pipeline-reports?page=&limit=&status=&revision_status=&site_id=&vendor_id=&from=&to=`
 * @param {Record<string, string | number | undefined>} params
 */
export function useTaskReports(params) {
  return useQuery({
    queryKey: taskReportKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/pipeline-reports',
        searchParams: params,
        schema: taskReportListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}

/** `GET /pipeline-reports/{id}` @param {string} id */
export function useTaskReport(id) {
  return useQuery({
    queryKey: taskReportKeys.detail(id),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: `v1/pipeline-reports/${id}`,
        schema: taskReportDetailSchema,
      }),
    enabled: Boolean(id),
  });
}
