'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { resultListSchema } from '@/features/sla-results/api/schemas';
import { mergeLiveResults, mergeResults } from '@/features/sla-results/lib/results';

/**
 * @typedef {object} ResultParams
 * @property {string} scope `VENDOR` | `SITE` | `WORKER`
 * @property {string} [vendor_id]
 * @property {string} [site_id] Only for scope SITE / WORKER (Postman).
 * @property {string} [worker_id] Only for scope WORKER.
 * @property {string} [from] History: period start from (`YYYY-MM-DD`).
 * @property {string} [to] History: period start up to.
 */

/** Paths per result kind: SLA scores and maturity levels, live or frozen. */
const PATHS = Object.freeze({
  sla: { live: 'v1/sla-scores/live', history: 'v1/sla-scores' },
  maturity: { live: 'v1/maturity-levels/live', history: 'v1/maturity-levels' },
});

/** Largest page of the history (Postman `limit` 1–100). */
const HISTORY_LIMIT = 100;

/**
 * @param {'sla' | 'maturity'} kind
 * @param {'live' | 'history'} when
 * @param {ResultParams} params
 */
async function fetchResults(kind, when, params) {
  const { data } = await apiRequest({
    method: 'get',
    path: PATHS[kind][when],
    searchParams: { ...params, ...(when === 'history' ? { page: 1, limit: HISTORY_LIMIT } : {}) },
    schema: resultListSchema,
  });
  return data;
}

/**
 * SLA and maturity results, merged per entity (live: SLA and maturity may run on different
 * period types) or per entity and period (history). Maturity is optional: when it fails
 * (e.g. no access) the SLA results are still shown.
 * @param {'live' | 'history'} when
 * @param {ResultParams} params
 */
async function fetchMerged(when, params) {
  const [sla, maturity] = await Promise.all([
    fetchResults('sla', when, params),
    fetchResults('maturity', when, params).catch(() => []),
  ]);
  return when === 'live' ? mergeLiveResults(sla, maturity) : mergeResults(sla, maturity);
}

/**
 * Current (live) period: `GET /sla-scores/live` + `GET /maturity-levels/live`.
 * @param {ResultParams} params
 * @param {{ enabled?: boolean }} [options]
 */
export const useLiveResults = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['sla-results', 'live', params],
    queryFn: () => fetchMerged('live', params),
    enabled,
  });

/**
 * Frozen periods (`from`/`to` = period start dates): `GET /sla-scores` + `GET /maturity-levels`.
 * @param {ResultParams} params
 * @param {{ enabled?: boolean }} [options]
 */
export const useHistoryResults = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['sla-results', 'history', params],
    queryFn: () => fetchMerged('history', params),
    enabled,
  });

/**
 * The Worker's own live SLA score (one row per site). SLA only, no maturity.
 * @param {{ enabled?: boolean }} [options]
 */
export const useMySlaScores = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['sla-results', 'live', 'mine'],
    queryFn: () => fetchResults('sla', 'live', { scope: 'WORKER' }),
    enabled,
    // 403/404 just hide the card: no retry.
    retry: false,
  });
