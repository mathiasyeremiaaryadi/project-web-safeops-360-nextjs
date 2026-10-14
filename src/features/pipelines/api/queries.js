'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useDetailQuery, useListQuery } from '@/hooks/use-resource';
import { pipelineKeys } from '@/features/pipelines/api/keys';
import {
  pipelineItemListSchema,
  pipelineListSchema,
  pipelineDetailSchema,
} from '@/features/pipelines/api/schemas';

/**
 * `GET /pipelines?page=&limit=&q=&vendor_id=&status=`
 * @param {{ page: number, limit: number, q: string, vendor_id: string, status: string }} params
 */
export const usePipelines = (params) =>
  useListQuery({ keys: pipelineKeys, path: 'v1/pipelines', params, schema: pipelineListSchema });

/** `GET /pipelines/{id}` @param {string} id */
export const usePipeline = (id) =>
  useDetailQuery({ keys: pipelineKeys, path: 'v1/pipelines', id, schema: pipelineDetailSchema });

/** `GET /pipelines/{id}/items` @param {string} id */
export function usePipelineItems(id) {
  return useQuery({
    queryKey: pipelineKeys.items(id),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: `v1/pipelines/${id}/items`,
        searchParams: { limit: 100 },
        schema: pipelineItemListSchema,
      }),
  });
}
