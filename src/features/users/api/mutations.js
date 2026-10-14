'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { userKeys } from '@/features/users/api/keys';
import {
  createUserResponseSchema,
  resetPasswordResponseSchema,
  userSchema,
} from '@/features/users/api/schemas';

/**
 * After a change: refresh lists and (when known) the user's detail.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string} [id]
 */
function invalidateUsers(queryClient, id) {
  queryClient.invalidateQueries({ queryKey: userKeys.lists() });
  if (id) queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
}

/** `POST /users` → `{ user, temporary_password? }` */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {Record<string, unknown>} body */
    mutationFn: (body) =>
      apiRequest({
        method: 'post',
        path: 'v1/users',
        json: body,
        schema: createUserResponseSchema,
      }),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** `PATCH /users/{id}` — profile and `is_active`. @param {string} id */
export function useUpdateUser(id) {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {Record<string, unknown>} body */
    mutationFn: (body) =>
      apiRequest({ method: 'patch', path: `v1/users/${id}`, json: body, schema: userSchema }),
    onSuccess: () => invalidateUsers(queryClient, id),
  });
}

/** `PUT /users/{id}/roles` with roles and scopes in one call. @param {string} id */
export function useUpdateUserAccess(id) {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ roles: string[], site_ids: string[], vendor_ids: string[] }} body */
    mutationFn: (body) =>
      apiRequest({ method: 'put', path: `v1/users/${id}/roles`, json: body, schema: userSchema }),
    onSuccess: () => invalidateUsers(queryClient, id),
  });
}

/** `POST /users/{id}/reset-password` with `{}` → temporary password. @param {string} id */
export function useResetUserPassword(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest({
        method: 'post',
        path: `v1/users/${id}/reset-password`,
        json: {},
        schema: resetPasswordResponseSchema,
      }),
    onSuccess: () => invalidateUsers(queryClient, id),
  });
}

/** `DELETE /users/{id}/sessions` @param {string} id */
export function useRevokeUserSessions(id) {
  return useMutation({
    mutationFn: () => apiRequest({ method: 'delete', path: `v1/users/${id}/sessions` }),
  });
}
