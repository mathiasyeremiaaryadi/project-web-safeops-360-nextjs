'use client';

import { useDetailQuery, useListQuery } from '@/hooks/use-resource';
import { taskReportKeys } from '@/features/pipeline-reports/api/keys';
import {
  taskReportDetailSchema,
  taskReportListSchema,
} from '@/features/pipeline-reports/api/schemas';

const PATH = 'v1/pipeline-reports';

/**
 * `GET /pipeline-reports?page=&limit=&status=&revision_status=&site_id=&vendor_id=&from=&to=`
 * @param {Record<string, string | number | undefined>} params
 */
export const useTaskReports = (params) =>
  useListQuery({ keys: taskReportKeys, path: PATH, params, schema: taskReportListSchema });

/** `GET /pipeline-reports/{id}` @param {string} id */
export const useTaskReport = (id) =>
  useDetailQuery({ keys: taskReportKeys, path: PATH, id, schema: taskReportDetailSchema });
