'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { dayBoundaryIso } from '@/lib/date';
import { auditLogKeys } from '@/features/audit-logs/api/keys';
import { auditLogListSchema } from '@/features/audit-logs/api/schemas';

/**
 * `GET /audit-logs?q=&user=&action=&entity=&from=&to=&page=&limit=` (from/to: RFC3339, Postman).
 * @param {{ page: number, limit: number, q: string, user: string, action: string, entity: string, from: string, to: string }} params
 *   `from`/`to` are `YYYY-MM-DD` in APP_TIMEZONE.
 */
export function useAuditLogs(params) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/audit-logs',
        searchParams: {
          ...params,
          from: dayBoundaryIso(params.from, 'start'),
          to: dayBoundaryIso(params.to, 'end'),
        },
        schema: auditLogListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}
