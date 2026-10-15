'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { createQueryKeys } from '@/lib/api/query-keys';
import { useListQuery } from '@/hooks/use-resource';
import { assignmentListSchema } from '@/features/assignments/api/schemas';

export const assignmentKeys = createQueryKeys('assignments');

const PATH = 'v1/assignments';

/**
 * `GET /assignments?page=&limit=&is_active=&pipeline_id=&user_id=` (Postman filters).
 * @param {Record<string, string | number>} params
 */
export const useAssignments = (params) =>
  useListQuery({ keys: assignmentKeys, path: PATH, params, schema: assignmentListSchema });

/**
 * `POST /assignments { pipeline_item_id, user_id }`. 409: this worker already has this task
 * (an inactive one with the same pair is re-activated by the server).
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ pipeline_item_id: string, user_id?: string }} body */
    mutationFn: (body) => apiRequest({ method: 'post', path: PATH, json: body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() }),
  });
}

/** `PATCH /assignments/{id} { is_active }` — the only field that can change. */
export function useSetAssignmentActive() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ id: string, is_active: boolean }} input */
    mutationFn: ({ id, is_active }) =>
      apiRequest({ method: 'patch', path: `${PATH}/${id}`, json: { is_active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() }),
  });
}
