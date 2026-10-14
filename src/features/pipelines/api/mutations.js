'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { MASTER_STATUS } from '@/lib/constants';
import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { pipelineKeys } from '@/features/pipelines/api/keys';

/** Create (`POST /pipelines`) or update (`PATCH /pipelines/{id}`). */
export function useSavePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id?: string, body: Record<string, unknown> }} input */
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: id ? 'patch' : 'post',
        path: id ? `v1/pipelines/${id}` : 'v1/pipelines',
        json: body,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      if (id) queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
    },
  });
}

/** Deactivate / reactivate a pipeline. @param {string} [id] */
export function useChangePipelineStatus(id) {
  return useMasterStatusChange({
    path: 'pipelines',
    invalidate: [pipelineKeys.lists(), ...(id ? [pipelineKeys.detail(id)] : [])],
  });
}

/** Refreshes the task list of a pipeline (and the task counts in the list). */
function useRefreshItems(/** @type {string} */ pipelineId) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: pipelineKeys.items(pipelineId) });
    queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
  };
}

/** `POST /pipelines/{id}/items` `{ item_id, sort_order }` @param {string} pipelineId */
export function useAddPipelineItem(pipelineId) {
  const refresh = useRefreshItems(pipelineId);
  return useMutation({
    /** @param {{ item_id: string, sort_order: number }} body */
    mutationFn: (body) =>
      apiRequest({ method: 'post', path: `v1/pipelines/${pipelineId}/items`, json: body }),
    onSuccess: refresh,
  });
}

/** Swaps `sort_order` of two tasks (two `PATCH /pipeline-items/{id}`). @param {string} pipelineId */
export function useReorderPipelineItems(pipelineId) {
  const refresh = useRefreshItems(pipelineId);
  return useMutation({
    /** @param {{ id: string, sort_order: number }[]} patches */
    mutationFn: (patches) =>
      Promise.all(
        patches.map(({ id, sort_order }) =>
          apiRequest({ method: 'patch', path: `v1/pipeline-items/${id}`, json: { sort_order } }),
        ),
      ),
    onSettled: refresh,
  });
}

/**
 * Active/inactive toggle of a task — the only optimistic update in the app (prompt section 7).
 * @param {string} pipelineId
 */
export function useTogglePipelineItem(pipelineId) {
  const queryClient = useQueryClient();
  const refresh = useRefreshItems(pipelineId);
  const key = pipelineKeys.items(pipelineId);
  return useMutation({
    /** @param {{ id: string, status: string }} item Item with its CURRENT status. */
    mutationFn: ({ id, status }) =>
      apiRequest({
        method: 'patch',
        path: `v1/pipeline-items/${id}`,
        json: {
          status: status === MASTER_STATUS.ACTIVE ? MASTER_STATUS.INACTIVE : MASTER_STATUS.ACTIVE,
        },
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      const next = status === MASTER_STATUS.ACTIVE ? MASTER_STATUS.INACTIVE : MASTER_STATUS.ACTIVE;
      queryClient.setQueryData(key, (/** @type {any} */ old) =>
        old
          ? {
              ...old,
              data: old.data.map((item) => (item.id === id ? { ...item, status: next } : item)),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _item, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: refresh,
  });
}

/** `DELETE /pipeline-items/{id}` — "Lepas dari pipeline". @param {string} pipelineId */
export function useRemovePipelineItem(pipelineId) {
  const refresh = useRefreshItems(pipelineId);
  return useMutation({
    /** @param {string} id */
    mutationFn: (id) => apiRequest({ method: 'delete', path: `v1/pipeline-items/${id}` }),
    onSuccess: refresh,
  });
}
