import { SCOPES } from '@/features/sla-shared';

/*
 * The entity of a result (vendor, vendor at a site, or worker at a site) as URL params, so the
 * history and detail pages can ask the same scope again.
 */

/** @typedef {import('@/features/sla-results/lib/results').MergedResult} MergedResult */

/**
 * API params of one entity (Postman: `site_id` only for SITE / WORKER, `worker_id` only for WORKER).
 * @param {string} scope
 * @param {{ vendor_id?: string | null, site_id?: string | null, worker_id?: string | null }} entity
 */
export function entityParams(scope, entity) {
  return {
    scope,
    vendor_id: entity.vendor_id ?? undefined,
    site_id: scope === SCOPES.VENDOR ? undefined : (entity.site_id ?? undefined),
    worker_id: scope === SCOPES.WORKER ? (entity.worker_id ?? undefined) : undefined,
  };
}

/** @param {Record<string, string | null | undefined>} params */
const query = (params) =>
  new URLSearchParams(
    /** @type {[string, string][]} */ (Object.entries(params).filter(([, value]) => value)),
  ).toString();

/** "Riwayat & tren" of an entity. @param {string} scope @param {MergedResult} row */
export const historyHref = (scope, row) => `/sla/history?${query(entityParams(scope, row))}`;

/** "Rincian" of one period. @param {string} scope @param {MergedResult} row */
export const detailHref = (scope, row) =>
  `/sla/detail?${query({ ...entityParams(scope, row), period_start: row.period_start })}`;

/** Same entity, any period. @param {MergedResult} row */
export const entityKey = (row) =>
  [row.scope_type, row.vendor_id, row.site_id, row.worker_id].map((v) => v ?? '').join('|');

/**
 * Whether a row is the entity of the URL.
 * @param {MergedResult} row
 * @param {{ vendor_id?: string, site_id?: string, worker_id?: string }} params
 */
export const isEntity = (row, params) =>
  (!params.vendor_id || row.vendor_id === params.vendor_id) &&
  (!params.site_id || row.site_id === params.site_id) &&
  (!params.worker_id || row.worker_id === params.worker_id);
