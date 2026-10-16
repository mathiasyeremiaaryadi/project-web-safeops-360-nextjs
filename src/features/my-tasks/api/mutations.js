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
 * "Mulai": `POST /pipeline-reports` (→ IN_PROGRESS), then opens the report. Today only the task
 * is sent: the server takes today's date and the shift running now on the site's clock
 * (WIB/WITA/WIT). An earlier day (late upload) sends its date and the Worker's shift of that
 * day. A duplicate (409: a report already exists) reloads the tasks and opens it instead.
 * @param {string} date `YYYY-MM-DD` of the task list, or `''` for today at the site.
 * @param {string | null} [shift] the Worker's shift on `date` (needed for an earlier day).
 */
export function useStartTask(date, shift = null) {
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
        json: date
          ? {
              pipeline_item_id: task.pipeline_item_id,
              report_date: date,
              shift: task.shift ?? shift ?? undefined,
            }
          : { pipeline_item_id: task.pipeline_item_id },
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
        (t) => t.pipeline_item_id === task.pipeline_item_id && t.report_id,
      );
      if (existing?.report_id) router.push(reportHref(existing.report_id));
    },
  });
}
