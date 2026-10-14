'use client';

import { useDetailQuery, useListQuery } from '@/hooks/use-resource';
import { userKeys } from '@/features/users/api/keys';
import { userDetailSchema, userListSchema } from '@/features/users/api/schemas';

/**
 * `GET /users?page=&limit=&q=&role=&status=`
 * @param {{ page: number, limit: number, q: string, role: string, status: string }} params
 */
export const useUsers = (params) =>
  useListQuery({ keys: userKeys, path: 'v1/users', params, schema: userListSchema });

/** `GET /users/{id}` @param {string} id */
export const useUser = (id) =>
  useDetailQuery({ keys: userKeys, path: 'v1/users', id, schema: userDetailSchema });
