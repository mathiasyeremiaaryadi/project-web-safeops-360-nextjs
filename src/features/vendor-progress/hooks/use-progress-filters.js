'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { useSiteContext } from '@/hooks/use-site-context';
import { todayInAppTimezone } from '@/lib/date';
import { useVendors } from '@/features/vendors';
import { resolveProgressRange } from '@/features/vendor-progress/lib/progress';

const PARSERS = {
  from: parseAsString.withDefault(''),
  to: parseAsString.withDefault(''),
  site_id: parseAsString.withDefault(''),
  q: parseAsString.withDefault(''),
};

/**
 * Period (today by default, max. 31 days), site and search of the vendor progress pages, kept in
 * the URL so the detail page opens with the same period.
 */
export function useProgressFilters() {
  const today = todayInAppTimezone();
  const [params, setParams] = useQueryStates(PARSERS, { history: 'replace', clearOnDefault: true });
  const site = useSiteContext();
  const range = resolveProgressRange(params.from, params.to, today);
  return {
    params,
    setParams,
    today,
    range,
    site,
    siteId: site.siteIdFor(params.site_id),
    /** `?from=&to=&site_id=` to carry over to the detail page. */
    search: new URLSearchParams(
      Object.entries({ from: params.from, to: params.to, site_id: params.site_id }).filter(
        ([, value]) => value,
      ),
    ).toString(),
  };
}

/**
 * Site name(s) of a progress row: from the row, else the chosen site, else the vendor's sites.
 * @param {string | undefined} filterSiteId
 */
export function useSiteNames(filterSiteId) {
  const sites = useOptionLabels('sites');
  const vendors = useVendors({ page: 1, limit: 100 });
  /** @param {import('@/features/vendor-progress/lib/progress').VendorProgress} row */
  return (row) => {
    if (row.siteName) return row.siteName;
    const siteId = row.siteId ?? filterSiteId;
    if (siteId) return sites.labelOf(siteId);
    const vendor = vendors.data?.data.find((v) => v.id === row.vendorId);
    const names = (vendor?.site_ids ?? []).map(sites.labelOf).filter((name) => name !== '—');
    return names.join(', ') || '—';
  };
}
