'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { taskReportKeys } from '@/features/pipeline-reports/api/keys';
import { toReviewPayload } from '@/features/pipeline-reports/lib/review';

/** Review decision: `PATCH /pipeline-reports/{id}` (body from `toReviewPayload`). */
export function useReviewTaskReport() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id: string, decision: 'REJECT' | 'REVISION' | 'APPROVE', reason?: string }} input */
    mutationFn: ({ id, decision, reason }) =>
      apiRequest({
        method: 'patch',
        path: `v1/pipeline-reports/${id}`,
        json: toReviewPayload(decision, reason),
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskReportKeys.detail(id) });
      // The dashboard counts change too.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
