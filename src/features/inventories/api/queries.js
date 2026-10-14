'use client';

import { useDetailQuery, useListQuery } from '@/hooks/use-resource';
import { inventoryKeys } from '@/features/inventories/api/keys';
import { inventoryDetailSchema, inventoryListSchema } from '@/features/inventories/api/schemas';

const PATH = 'v1/inventories';

/**
 * `GET /inventories?page=&limit=&q=&vendor_id=&site_id=&status_condition=`
 * @param {Record<string, string | number>} params
 */
export const useInventories = (params) =>
  useListQuery({ keys: inventoryKeys, path: PATH, params, schema: inventoryListSchema });

/** `GET /inventories/{id}` — includes the signed `image_url`. @param {string} id */
export const useInventory = (id) =>
  useDetailQuery({ keys: inventoryKeys, path: PATH, id, schema: inventoryDetailSchema });
