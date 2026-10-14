'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { userKeys } from '@/features/users/api/keys';
import { userListSchema, userSchema } from '@/features/users/api/schemas';

/**
 * `GET /users?page=&limit=&q=&role=&status=`
 * @param {{ page: number, limit: number, q: string, role: string, status: string }} params
 */
export function useUsers(params) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () =>
      apiRequest({ method: 'get', path: 'v1/users', searchParams: params, schema: userListSchema }),
    placeholderData: keepPreviousData,
  });
}

/** `GET /users/{id}` @param {string} id */
export function useUser(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiRequest({ method: 'get', path: `v1/users/${id}`, schema: userSchema }),
  });
}
