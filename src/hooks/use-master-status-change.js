'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { MASTER_STATUS } from '@/lib/constants';

/**
 * Deactivates (`DELETE /<path>/{id}`, soft delete) or reactivates (`PATCH { status: ACTIVE }`)
 * a master-data row, then refreshes the given queries.
 * @param {object} options
 * @param {string} options.path API path without `v1/`, e.g. `sites`.
 * @param {readonly unknown[][]} options.invalidate Query keys to refresh on success.
 */
export function useMasterStatusChange({ path, invalidate }) {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id: string, status: string }} row Row with its CURRENT status. */
    mutationFn: ({ id, status }) =>
      status === MASTER_STATUS.ACTIVE
        ? apiRequest({ method: 'delete', path: `v1/${path}/${id}` })
        : apiRequest({
            method: 'patch',
            path: `v1/${path}/${id}`,
            json: { status: MASTER_STATUS.ACTIVE },
          }),
    onSuccess: () => {
      for (const queryKey of invalidate) queryClient.invalidateQueries({ queryKey });
    },
  });
}
