'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { RULE_TYPES } from '@/features/sla-shared/constants';
import {
  levelSchema,
  maturityCatalogSchema,
  slaCatalogSchema,
} from '@/features/sla-shared/catalog-schemas';

/** The catalogs change only with a backend release. */
const CATALOG_STALE_MS = 60 * 60 * 1000;

/** `GET /sla-catalog` → indicators (code, unit, direction, usable in SLA / maturity). */
export const useSlaCatalog = () =>
  useQuery({
    queryKey: ['sla-rules', RULE_TYPES.SLA, 'catalog'],
    queryFn: () => apiRequest({ method: 'get', path: 'v1/sla-catalog', schema: slaCatalogSchema }),
    staleTime: CATALOG_STALE_MS,
  });

/** `GET /maturity-catalog` → dimensions and the default level requirements. */
export const useMaturityCatalog = () =>
  useQuery({
    queryKey: ['sla-rules', RULE_TYPES.MATURITY, 'catalog'],
    queryFn: () =>
      apiRequest({ method: 'get', path: 'v1/maturity-catalog', schema: maturityCatalogSchema }),
    staleTime: CATALOG_STALE_MS,
  });

/**
 * Catalog of one rule type: the items usable in it, a lookup by code (unit, direction) and the
 * default level requirements.
 * @param {'sla' | 'maturity'} type
 */
export function useCatalog(type) {
  const sla = useSlaCatalog();
  const maturity = useMaturityCatalog();
  const isSla = type === RULE_TYPES.SLA;
  const items = isSla
    ? (sla.data ?? []).filter((item) => item.sla)
    : (maturity.data?.dimensions ?? []).filter((item) => item.maturity);
  // Units / directions: the SLA catalog knows them for every indicator.
  const byCode = Object.fromEntries(
    [...(maturity.data?.dimensions ?? []), ...(sla.data ?? [])].map((item) => [item.code, item]),
  );
  return {
    items,
    byCode,
    defaultLevels: maturity.data?.levels ?? [],
    isPending: sla.isPending || maturity.isPending,
    isError: isSla ? sla.isError : maturity.isError,
    refetch: () => Promise.all([sla.refetch(), maturity.refetch()]),
  };
}

/** Level requirements of a maturity rule version (bare, `data`, or `rule`-wrapped). */
const ruleLevelsSchema = z.unknown().transform((raw) => {
  const body = /** @type {any} */ (raw) ?? {};
  const rule = body.data ?? body.maturity_rule ?? body.rule ?? body;
  return z
    .array(levelSchema)
    .catch([])
    .parse(rule?.levels ?? []);
});

/**
 * Level requirements of the maturity rule version used by a result (`GET /maturity-rules/{id}`),
 * for the "Menuju Level" markers. Empty when unavailable — never the defaults.
 * @param {string | null | undefined} ruleId
 */
export const useMaturityRuleLevels = (ruleId) =>
  useQuery({
    queryKey: ['sla-rules', RULE_TYPES.MATURITY, 'detail', ruleId ?? '', 'levels'],
    queryFn: () =>
      apiRequest({
        method: 'get',
        path: `v1/maturity-rules/${ruleId}`,
        schema: ruleLevelsSchema,
      }),
    enabled: Boolean(ruleId),
    retry: false,
  });
