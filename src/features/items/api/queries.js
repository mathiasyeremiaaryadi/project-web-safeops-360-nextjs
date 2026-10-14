'use client';

import { useListQuery } from '@/hooks/use-resource';
import { itemKeys } from '@/features/items/api/keys';
import { itemListSchema } from '@/features/items/api/schemas';

/** `GET /items?page=&limit=&q=` @param {{ page: number, limit: number, q: string }} params */
export const useItems = (params) =>
  useListQuery({ keys: itemKeys, path: 'v1/items', params, schema: itemListSchema });
