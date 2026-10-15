'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { RULE_TYPES } from '@/features/sla-shared';
import { ruleDetailSchema, ruleListSchema } from '@/features/sla-rules/api/schemas';

/** @typedef {'sla' | 'maturity'} RuleType */

/** API path of each rule type. */
const RULE_PATHS = Object.freeze({
  [RULE_TYPES.SLA]: 'v1/sla-rules',
  [RULE_TYPES.MATURITY]: 'v1/maturity-rules',
});

export const slaRuleKeys = Object.freeze({
  all: /** @type {const} */ (['sla-rules']),
  list: (/** @type {RuleType} */ type, /** @type {object} */ params) => [
    'sla-rules',
    type,
    'list',
    params,
  ],
  detail: (/** @type {RuleType} */ type, /** @type {string} */ id) => [
    'sla-rules',
    type,
    'detail',
    id,
  ],
  history: (/** @type {RuleType} */ type, /** @type {object} */ params) => [
    'sla-rules',
    type,
    'history',
    params,
  ],
});

/**
 * Active rules in the caller's scope: `GET /{type}-rules?vendor_id=&site_id=`.
 * @param {RuleType} type
 * @param {{ vendor_id?: string, site_id?: string }} params
 */
export const useRules = (type, params) =>
  useQuery({
    queryKey: slaRuleKeys.list(type, params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: RULE_PATHS[type],
        searchParams: params,
        schema: ruleListSchema,
      }),
  });

/**
 * One version with its indicators / dimensions / levels: `GET /{type}-rules/{id}`.
 * @param {RuleType} type
 * @param {string | null | undefined} id
 */
export const useRule = (type, id) =>
  useQuery({
    queryKey: slaRuleKeys.detail(type, id ?? ''),
    queryFn: () =>
      apiRequest({ method: 'get', path: `${RULE_PATHS[type]}/${id}`, schema: ruleDetailSchema }),
    enabled: Boolean(id),
  });

/**
 * Every version for a vendor (+ site): `GET /{type}-rules/history?vendor_id=&site_id=`.
 * @param {RuleType} type
 * @param {{ vendor_id: string, site_id?: string }} params
 */
export const useRuleHistory = (type, params) =>
  useQuery({
    queryKey: slaRuleKeys.history(type, params),
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: `${RULE_PATHS[type]}/history`,
        searchParams: params,
        schema: ruleListSchema,
      }),
    enabled: Boolean(params.vendor_id),
  });

/** Rules changed: the live scores change too. */
function useRefreshAfterRuleChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: slaRuleKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['sla-results'] }),
    ]);
}

/**
 * New version (replaces the active one): `POST /{type}-rules`. There is no edit: "Edit" posts a
 * new version too.
 * @param {RuleType} type
 */
export function useCreateRule(type) {
  const refresh = useRefreshAfterRuleChange();
  return useMutation({
    /** @param {Record<string, unknown>} body */
    mutationFn: (body) => apiRequest({ method: 'post', path: RULE_PATHS[type], json: body }),
    onSuccess: refresh,
  });
}

/**
 * Deactivate: `DELETE /{type}-rules/{id}` (a site override falls back to the vendor default).
 * @param {RuleType} type
 */
export function useDeactivateRule(type) {
  const refresh = useRefreshAfterRuleChange();
  return useMutation({
    /** @param {string} id */
    mutationFn: (id) => apiRequest({ method: 'delete', path: `${RULE_PATHS[type]}/${id}` }),
    onSuccess: refresh,
  });
}
