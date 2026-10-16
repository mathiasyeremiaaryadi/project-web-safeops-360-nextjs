'use client';

import { useListQuery } from '@/hooks/use-resource';
import { itemKeys } from '@/features/items/api/keys';
import { itemListSchema } from '@/features/items/api/schemas';

/** `GET /items?page=&limit=&q=&site_id=&status=` (`status=ALL`: active and inactive) @param {{ page: number, limit: number, q: string, site_id?: string, status?: string }} params */
export const useItems = (params) =>
  useListQuery({ keys: itemKeys, path: 'v1/items', params, schema: itemListSchema });
