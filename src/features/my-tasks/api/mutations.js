'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/client';
import { toastApiError } from '@/lib/notify';
import { useSession } from '@/features/auth';
import { createdReportSchema } from '@/features/my-tasks/api/schemas';
import { myTaskKeys } from '@/features/my-tasks/api/queries';

/** @typedef {import('@/features/my-tasks/api/schemas').MyTask} MyTask */

/** @param {string} reportId */
export const reportHref = (reportId) => `/tasks/report/${reportId}`;

/**
 * "Mulai": `POST /pipeline-reports { pipeline_item_id, shift, report_date }` (→ IN_PROGRESS),
 * then opens the report. A duplicate (409: a report already exists for this task, shift and
 * date) reloads the tasks and opens the existing report instead.
 * @param {string} date `YYYY-MM-DD` of the task list.
 */
export function useStartTask(date) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const tasksKey = myTaskKeys.day(user?.id ?? '', date);

  return useMutation({
    /** @param {MyTask} task */
    mutationFn: (task) =>
      apiRequest({
        method: 'post',
        path: 'v1/pipeline-reports',
        json: { pipeline_item_id: task.pipeline_item_id, shift: task.shift, report_date: date },
        schema: createdReportSchema,
      }),
    onSuccess: (reportId) => {
      queryClient.invalidateQueries({ queryKey: tasksKey });
      router.push(reportHref(reportId));
    },
    onError: async (error, task) => {
      if (/** @type {any} */ (error).status !== 409) return toastApiError(error);
      await queryClient.refetchQueries({ queryKey: tasksKey });
      const tasks = /** @type {{ data: MyTask[] } | undefined} */ (
        queryClient.getQueryData(tasksKey)
      );
      const existing = tasks?.data.find(
        (t) => t.pipeline_item_id === task.pipeline_item_id && t.shift === task.shift,
      );
      if (existing?.report_id) router.push(reportHref(existing.report_id));
    },
  });
}
