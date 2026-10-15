'use client';

import { useQuery } from '@tanstack/react-query';
import { useDetailQuery, useInfiniteListQuery } from '@/hooks/use-resource';
import {
  taskReportDetailSchema,
  taskReportKeys,
  taskReportListSchema,
} from '@/features/pipeline-reports';
import { fetchReportHistory } from '@/features/task-report/api/report-api';

const PATH = 'v1/pipeline-reports';

/**
 * "Riwayat laporan": `GET /pipeline-reports?from=&to=&status=&revision_status=` — the API only
 * returns the worker's own reports.
 * @param {Record<string, string>} params
 * @param {{ enabled?: boolean }} [options]
 */
export const useMyReports = (params, { enabled = true } = {}) =>
  useInfiniteListQuery({
    keys: taskReportKeys,
    path: PATH,
    params,
    schema: taskReportListSchema,
    enabled,
  });

/** `GET /pipeline-reports/{id}` — the API answers 404 for a report of another worker. */
export const useWorkerReport = (/** @type {string} */ id) =>
  useDetailQuery({
    keys: taskReportKeys,
    path: PATH,
    id,
    schema: taskReportDetailSchema,
  });

/** Status history (⚠ W5); `data` is `null` when the server has no history endpoint. */
export const useReportHistory = (/** @type {string} */ id) =>
  useQuery({
    queryKey: [...taskReportKeys.detail(id), 'history'],
    queryFn: () => fetchReportHistory(id),
    enabled: Boolean(id),
  });
