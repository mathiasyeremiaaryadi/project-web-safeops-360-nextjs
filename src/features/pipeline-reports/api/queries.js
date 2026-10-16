'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useDetailQuery, useListQuery } from '@/hooks/use-resource';
import { taskReportKeys } from '@/features/pipeline-reports/api/keys';
import {
  reportRevisionListSchema,
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

/**
 * `GET /pipeline-reports/{id}/revisions` — earlier versions of a report, oldest first.
 * @param {string} id
 * @param {{ enabled?: boolean }} [options]
 */
export const useReportRevisions = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: [...taskReportKeys.detail(id), 'revisions'],
    queryFn: async () =>
      (
        await apiRequest({
          method: 'get',
          path: `${PATH}/${id}/revisions`,
          schema: reportRevisionListSchema,
        })
      ).data,
    enabled: enabled && Boolean(id),
  });
