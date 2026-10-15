'use client';

import { useOptionLabels } from '@/hooks/use-option-labels';
import { SCOPES } from '@/features/sla-shared';

/**
 * Names of a result's entity: from the row, else from the cached vendor / site lookups (never a
 * request per row). Worker names come from the row only (Admin cannot list users).
 * @param {string} scope
 */
export function useEntityNames(scope) {
  const vendors = useOptionLabels('vendors');
  const sites = useOptionLabels('sites');
  /** @param {import('@/features/sla-results/lib/results').MergedResult} row */
  return (row) => {
    const vendor = row.vendor_name ?? vendors.labelOf(row.vendor_id);
    const site = row.site_id ? (row.site_name ?? sites.labelOf(row.site_id)) : null;
    if (scope === SCOPES.WORKER) {
      const worker = row.worker_name ?? '—';
      return { title: worker, subtitle: [vendor, site].filter(Boolean).join(' · '), vendor, site };
    }
    return { title: vendor, subtitle: scope === SCOPES.SITE ? site : null, vendor, site };
  };
}
