'use client';

import { useListQuery } from '@/hooks/use-resource';
import { siteKeys } from '@/features/sites/api/keys';
import { siteListSchema } from '@/features/sites/api/schemas';

/** `GET /sites?page=&limit=&q=` @param {{ page: number, limit: number, q: string }} params */
export const useSites = (params) =>
  useListQuery({ keys: siteKeys, path: 'v1/sites', params, schema: siteListSchema });
