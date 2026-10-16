'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useSession } from '@/features/auth';
import { myTaskListSchema } from '@/features/my-tasks/api/schemas';

/**
 * Query keys of the Worker's tasks. The user id is part of the key: these queries are persisted
 * on the device for offline reading (see features/offline), and must never mix two accounts.
 */
export const myTaskKeys = Object.freeze({
  all: /** @type {const} */ (['my-tasks']),
  /** `date` `''` = today at the Worker's site. */
  day: (/** @type {string} */ userId, /** @type {string} */ date) => [
    'my-tasks',
    userId,
    date || 'today',
  ],
});

/**
 * `GET /me/tasks?date=YYYY-MM-DD` — the Worker's assignments and their report for the date.
 * Without a date the server answers for today on the site's clock (WIB/WITA/WIT), and each
 * task's `report_date` says which day that is.
 * @param {string} date `YYYY-MM-DD`, or `''` for today at the site
 * @param {{ enabled?: boolean }} [options]
 */
export function useMyTasks(date, { enabled = true } = {}) {
  const { user } = useSession();
  return useQuery({
    queryKey: myTaskKeys.day(user?.id ?? '', date),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/me/tasks',
        searchParams: date ? { date } : undefined,
        schema: myTaskListSchema,
      }),
    enabled: enabled && Boolean(user),
    // Kept as long as it is saved for offline reading (features/offline).
    gcTime: 24 * 60 * 60 * 1000,
  });
}
