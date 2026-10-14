'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { pipelineKeys } from '@/features/pipelines/api/keys';
import {
  pipelineItemListSchema,
  pipelineListSchema,
  pipelineSchema,
} from '@/features/pipelines/api/schemas';

/**
 * `GET /pipelines?page=&limit=&q=&vendor_id=&status=`
 * @param {{ page: number, limit: number, q: string, vendor_id: string, status: string }} params
 */
export function usePipelines(params) {
  return useQuery({
    queryKey: pipelineKeys.list(params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: 'v1/pipelines',
        searchParams: params,
        schema: pipelineListSchema,
      }),
    placeholderData: keepPreviousData,
  });
}

/** `GET /pipelines/{id}` @param {string} id */
export function usePipeline(id) {
  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: () =>
      apiRequest({ method: 'get', path: `v1/pipelines/${id}`, schema: pipelineSchema }),
  });
}

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
